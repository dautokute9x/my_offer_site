import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { MAX_CV_BYTES, MIME, sniffFileKind, type ApplicationInput } from "@/lib/validate";

export type ApplicationError = "rate_limited" | "job_closed" | "invalid_file" | "not_found" | "server_error";
type Upload = { path: string; token: string; signedUrl: string };

const ERRORS: Record<ApplicationError, [number, string]> = {
  rate_limited: [429, "Bạn đã gửi quá nhiều hồ sơ, vui lòng thử lại sau 10 phút."],
  job_closed: [409, "Tin này đã ngừng tuyển."],
  invalid_file: [422, "Tệp CV không hợp lệ hoặc bị lỗi, vui lòng chọn lại tệp PDF/DOC/DOCX/XLS/XLSX."],
  not_found: [404, "Không tìm thấy hồ sơ, vui lòng gửi lại."],
  server_error: [500, "Lỗi máy chủ, vui lòng thử lại."],
};
export const errorResponse = (code: ApplicationError) =>
  NextResponse.json({ ok: false, error: code, message: ERRORS[code][1] }, { status: ERRORS[code][0] });

// Không ghi PII vào log: chỉ mã và thông điệp lỗi.
const fail = (step: string, e: { code?: string; message?: string } | null) => {
  console.error(`[applications] ${step}`, e?.code ?? "", e?.message ?? "");
  return { error: "server_error" as const };
};

export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip")?.trim() || "unknown";
}

function ipHash(ip: string) {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("Thiếu IP_HASH_SALT (cần để băm IP khi lưu hồ sơ)");
  return createHash("sha256").update(salt + ip).digest("hex");
}

const extOf = (name: string) => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

export async function startApplication(input: ApplicationInput, ip: string): Promise<{ id: string; refCode: string; upload?: Upload } | { error: ApplicationError }> {
  const hash = ipHash(ip);
  const ext = input.kind === "apply" && input.file ? extOf(input.file.name) : null;
  const sb = createAdminSupabase();
  const { data, error } = await sb.rpc("start_application", {
    p: {
      idempotencyKey: input.idempotencyKey.trim(), ipHash: hash, kind: input.kind, jobCode: input.jobCode,
      fullName: input.fullName.trim(), email: input.email.trim(), phone: input.phone.trim(), facebook: input.facebook.trim(),
      jpLevel: input.jpLevel, note: input.note.trim(), consentVersion: input.consentVersion.trim(),
      cvExt: ext, cvMime: ext && MIME[ext],
    },
  });
  if (error || !data) return fail("start_application", error);
  if (data.error) return data.error === "rate_limited" || data.error === "job_closed" ? { error: data.error } : fail("start_application", { message: String(data.error) });
  if (data.status !== "pending_upload") return { id: data.id, refCode: data.refCode };

  // Không upsert: mỗi lần gửi lại SQL cấp path mới, nên URL cũ không thể ghi đè object đã xác nhận.
  const { data: up, error: ue } = await sb.storage.from("cvs").createSignedUploadUrl(data.cvPath);
  if (ue || !up) return fail("createSignedUploadUrl", ue);
  return { id: data.id, refCode: data.refCode, upload: { path: up.path, token: up.token, signedUrl: up.signedUrl } };
}

const EXPECTED: Record<string, "pdf" | "ole" | "zip"> = { pdf: "pdf", doc: "ole", xls: "ole", docx: "zip", xlsx: "zip" };

export async function completeApplication(id: string, idempotencyKey: string): Promise<{ refCode: string } | { error: ApplicationError }> {
  const sb = createAdminSupabase();
  const { data: row, error } = await sb.from("applications")
    .select("ref_code, status, cv_path, idempotency_key").eq("id", id).maybeSingle();
  if (error) return fail("select", error);
  if (!row || row.idempotency_key !== idempotencyKey.trim()) return { error: "not_found" };
  if (row.status !== "pending_upload") return { refCode: row.ref_code };

  const path: string = row.cv_path;
  const slash = path.lastIndexOf("/");
  const bucket = sb.storage.from("cvs");
  const { data: list, error: le } = await bucket.list(path.slice(0, slash), { search: path.slice(slash + 1) });
  if (le) return fail("list", le);
  const size = list?.find((o) => o.name === path.slice(slash + 1))?.metadata?.size;
  let ok = typeof size === "number" && size >= 1 && size <= MAX_CV_BYTES;
  if (ok) {
    const { data: blob, error: de } = await bucket.download(path);
    if (de || !blob) return fail("download", de);
    const head = new Uint8Array(await blob.slice(0, 8192).arrayBuffer());
    const kind = sniffFileKind(head);
    ok = kind === EXPECTED[extOf(path)] && (kind !== "zip" || Buffer.from(head).includes("[Content_Types].xml"));
  }
  if (!ok) {
    // Chỉ xóa khi hồ sơ vẫn pending_upload: complete song song có thể vừa xác nhận object này (đã new) — không được xóa.
    const { data: now, error: se } = await sb.from("applications").select("ref_code, status, cv_path, idempotency_key").eq("id", id).maybeSingle();
    if (se) return fail("select", se);
    if (!now) return { error: "not_found" };
    if (now.status !== "pending_upload") return { refCode: now.ref_code };
    // Hồ sơ vẫn pending_upload: gửi lại cùng key sẽ nhận signed URL mới.
    const { error: re } = await bucket.remove([path]);
    if (re) return fail("remove", re);
    return { error: "invalid_file" };
  }
  const { error: ue } = await sb.from("applications").update({ status: "new", cv_size: size }).eq("id", id).eq("status", "pending_upload");
  if (ue) return fail("update", ue);
  return { refCode: row.ref_code };
}

// Xóa mọi object của hồ sơ (CV hiện tại + path mồ côi của các lần gửi lại). Gọi TRƯỚC khi xóa dòng (cần created_at).
export async function removeApplicationObjects(id: string): Promise<{ ok: true } | { error: ApplicationError }> {
  const sb = createAdminSupabase();
  const { data: row, error } = await sb.from("applications").select("created_at").eq("id", id).maybeSingle();
  if (error) return fail("select", error);
  if (!row) return { error: "not_found" };
  const d = new Date(row.created_at);
  // Cùng công thức với start_application: cvs/<yyyy>/<mm theo UTC của created_at>/<id>
  const dir = `cvs/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${id}`;
  const bucket = sb.storage.from("cvs");
  // shortcut: list mặc định tối đa 100 object; mỗi hồ sơ chỉ có vài lần gửi lại nên đủ.
  const { data: list, error: le } = await bucket.list(dir);
  if (le) return fail("list", le);
  if (list?.length) {
    const { error: re } = await bucket.remove(list.map((o) => `${dir}/${o.name}`));
    if (re) return fail("remove", re);
  }
  return { ok: true };
}
