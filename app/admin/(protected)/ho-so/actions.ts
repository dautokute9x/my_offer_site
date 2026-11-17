"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isAdminSettableStatus, UUID_RE } from "@/lib/applications/status";
import { removeApplicationObjects, removeObjectsAt } from "@/lib/applications/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jstTodayKey } from "@/lib/time";

export type AppState = { error?: string; ok?: string; nonce?: number; deleted?: number; failed?: number; orphan?: number; more?: boolean };
const err = (error: string): AppState => ({ error, nonce: Date.now() });
const ok = (msg: string): AppState => ({ ok: msg, nonce: Date.now() });
// id hồ sơ là uuid (schema 0001); chỉ nhận đúng dạng, không tin dữ liệu form.
const idOf = (v: unknown) => (UUID_RE.test(String(v ?? "")) ? String(v).toLowerCase() : null);
const BAD = "Dữ liệu gửi lên không hợp lệ.";

export async function changeStatus(_p: AppState, fd: FormData): Promise<AppState> {
  const rawId = String(fd.get("id") ?? "");
  await requireAdmin(`/admin/ho-so/${rawId}`);
  const id = idOf(rawId), status = fd.get("status");
  if (!id || !isAdminSettableStatus(status)) return err(BAD);
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("applications").update({ status }).eq("id", id).neq("status", "pending_upload").select("id");
  if (error) { console.error("[admin/changeStatus]", error.code); return err("Không đổi được trạng thái."); }
  if (!data?.length) return err("Không tìm thấy hồ sơ hoặc hồ sơ chưa tải xong CV.");
  revalidatePath("/admin/ho-so", "layout");
  return ok("Đã cập nhật trạng thái.");
}

export async function addNote(_p: AppState, fd: FormData): Promise<AppState> {
  const rawId = String(fd.get("id") ?? "");
  const { userId } = await requireAdmin(`/admin/ho-so/${rawId}`);
  const id = idOf(rawId), body = String(fd.get("body") ?? "").trim();
  if (!id) return err(BAD);
  if (body.length < 1 || body.length > 2000) return err("Ghi chú phải từ 1 đến 2000 ký tự.");
  const sb = await createServerSupabase();
  const { error } = await sb.from("application_notes").insert({ application_id: id, author_id: userId, body });
  if (error) { console.error("[admin/addNote]", error.code); return err("Không lưu được ghi chú."); }
  revalidatePath(`/admin/ho-so/${id}`);
  return ok("Đã thêm ghi chú.");
}

type Sb = Awaited<ReturnType<typeof createServerSupabase>>;

// Xóa tay: xóa CV trước, lỗi thì dừng (không để CV mồ côi); ghi chú xóa theo (FK on delete cascade).
async function deleteOne(sb: Sb, id: string): Promise<"deleted" | "skipped" | "failed" | "cvGone"> {
  const r = await removeApplicationObjects(id);
  if ("error" in r) return r.error === "not_found" ? "skipped" : "failed";
  const { data, error } = await sb.from("applications").delete().eq("id", id).select("id");
  // CV đã xóa nhưng dòng còn: báo đúng để admin bấm xóa lại.
  if (error) { console.error("[admin/deleteApplication]", error.code); return "cvGone"; }
  return data?.length ? "deleted" : "skipped";
}

// Purge: xóa dòng TRƯỚC với điều kiện purge (completeApplication song song có thể vừa chuyển sang new → không khớp → không đụng storage),
// rồi xóa CV theo id + created_at của dòng vừa xóa. Storage lỗi sau đó để lại object mồ côi ("orphan", ghi log id, không PII).
async function purgeOne(sb: Sb, id: string, cond: string): Promise<"deleted" | "skipped" | "failed" | "orphan"> {
  const { data, error } = await sb.from("applications").delete().eq("id", id).or(cond).select("id, created_at");
  if (error) { console.error("[admin/purge]", error.code); return "failed"; }
  if (!data?.length) return "skipped";
  const r = await removeObjectsAt(data[0].id, data[0].created_at);
  if ("error" in r) { console.error("[admin/purge] orphan objects for application", data[0].id, r.error); return "orphan"; }
  return "deleted";
}

export async function deleteApplication(_p: AppState, fd: FormData): Promise<AppState> {
  const rawId = String(fd.get("id") ?? "");
  await requireAdmin(`/admin/ho-so/${rawId}`);
  const id = idOf(rawId);
  if (!id) return err(BAD);
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("applications").select("ref_code").eq("id", id).maybeSingle();
  if (error) { console.error("[admin/deleteApplication]", error.code); return err("Không tải được hồ sơ."); }
  if (!data) return err("Không tìm thấy hồ sơ.");
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== data.ref_code) return err("Nhập đúng mã hồ sơ để xác nhận xóa.");
  const r = await deleteOne(sb, id);
  if (r === "failed") return err("Không xóa được CV. Hồ sơ và CV vẫn được giữ, hãy thử lại.");
  if (r === "cvGone") return err("Đã xóa CV nhưng chưa xóa được hồ sơ. Hãy bấm xóa lại.");
  revalidatePath("/admin/ho-so", "layout");
  redirect("/admin/ho-so?da-xoa=1");
}

const BATCH = 50;
// Mỗi lần bấm xử lý tối đa 200 dòng hoặc ~20 giây để không vượt thời gian chạy của server action; còn thì bấm lại.
const MAX_ROWS = 200, MAX_MS = 20_000;
export async function purgeExpired(): Promise<AppState> {
  await requireAdmin("/admin/ho-so");
  const sb = await createServerSupabase();
  const today = jstTodayKey();
  const stale = new Date(Date.now() - 24 * 3600_000).toISOString();
  // Điều 25 Luật 91/2025/QH15: không tuyển (rejected) hoặc ứng viên rút hồ sơ (withdrawn) thì xóa dữ liệu đã cung cấp.
  const cond = `delete_after.lt.${today},status.in.(rejected,withdrawn),and(status.eq.pending_upload,created_at.lt.${stale})`;
  const start = Date.now();
  let deleted = 0, failed = 0, orphan = 0, seen = 0, last = "", more = false;
  outer: for (;;) {
    // Phân trang theo id (keyset) để hồ sơ lỗi không bị lấy lại vô hạn.
    let q = sb.from("applications").select("id")
      .or(cond).order("id").limit(BATCH);
    if (last) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) { console.error("[admin/purge]", error.code); return err(`Dọn dở dang do lỗi truy vấn (đã xóa ${deleted}, lỗi ${failed}).`); }
    if (!data?.length) break;
    for (const { id } of data) {
      if (seen >= MAX_ROWS || Date.now() - start > MAX_MS) { more = true; break outer; }
      seen++;
      const r = await purgeOne(sb, id, cond);
      if (r === "deleted") deleted++; else if (r === "failed") failed++; else if (r === "orphan") orphan++;
    }
    last = data[data.length - 1].id;
    if (data.length < BATCH) break;
  }
  revalidatePath("/admin/ho-so", "layout");
  const tail = more ? " Còn hồ sơ cần dọn — bấm lại để tiếp tục." : "";
  const parts = [`Đã xóa ${deleted + orphan} hồ sơ quá hạn.`];
  if (failed) parts.push(`${failed} hồ sơ lỗi (còn nguyên, thử lại sau).`);
  if (orphan) parts.push(`${orphan} hồ sơ đã xóa nhưng CV chưa xóa được khỏi Storage: xem log "[admin/purge] orphan" để xóa tay.`);
  const msg = parts.join(" ") + tail;
  const res = failed || orphan ? err(msg) : ok(msg);
  return { ...res, deleted, failed, ...(orphan && { orphan }), ...(more && { more }) };
}
