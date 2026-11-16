"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isAdminSettableStatus, UUID_RE } from "@/lib/applications/status";
import { removeApplicationObjects } from "@/lib/applications/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jstTodayKey } from "@/lib/time";

export type AppState = { error?: string; ok?: string; nonce?: number };
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

// Xóa CV trước, lỗi thì dừng (không để CV mồ côi); ghi chú xóa theo (FK on delete cascade).
// onlyIf: điều kiện PostgREST lặp lại ở bước xóa dòng (purge), để hồ sơ vừa hoàn tất không bị xóa.
type Sb = Awaited<ReturnType<typeof createServerSupabase>>;
async function deleteOne(sb: Sb, id: string, onlyIf?: string): Promise<"deleted" | "skipped" | "failed"> {
  if (onlyIf) {
    const { data, error } = await sb.from("applications").select("id").eq("id", id).or(onlyIf);
    if (error) { console.error("[admin/deleteApplication]", error.code); return "failed"; }
    if (!data?.length) return "skipped"; // không còn đủ điều kiện: giữ nguyên cả CV
  }
  const r = await removeApplicationObjects(id);
  if ("error" in r) return r.error === "not_found" ? "skipped" : "failed";
  let q = sb.from("applications").delete().eq("id", id);
  if (onlyIf) q = q.or(onlyIf);
  const { data, error } = await q.select("id");
  if (error) { console.error("[admin/deleteApplication]", error.code); return "failed"; }
  return data?.length ? "deleted" : "skipped";
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
  if ((await deleteOne(sb, id)) === "failed") return err("Không xóa được hồ sơ hoặc CV. Hồ sơ vẫn được giữ, hãy thử lại.");
  revalidatePath("/admin/ho-so", "layout");
  redirect("/admin/ho-so?da-xoa=1");
}

const BATCH = 50;
export async function purgeExpired(): Promise<AppState> {
  await requireAdmin("/admin/ho-so");
  const sb = await createServerSupabase();
  const today = jstTodayKey();
  const stale = new Date(Date.now() - 24 * 3600_000).toISOString();
  const cond = `delete_after.lt.${today},and(status.eq.pending_upload,created_at.lt.${stale})`;
  let deleted = 0, failed = 0, last = "";
  for (;;) {
    // Phân trang theo id (keyset) để hồ sơ lỗi không bị lấy lại vô hạn.
    let q = sb.from("applications").select("id")
      .or(cond).order("id").limit(BATCH);
    if (last) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) { console.error("[admin/purge]", error.code); return err(`Dọn dở dang do lỗi truy vấn (đã xóa ${deleted}, lỗi ${failed}).`); }
    if (!data?.length) break;
    for (const { id } of data) { const r = await deleteOne(sb, id, cond); if (r === "deleted") deleted++; else if (r === "failed") failed++; }
    last = data[data.length - 1].id;
    if (data.length < BATCH) break;
  }
  revalidatePath("/admin/ho-so", "layout");
  return failed ? err(`Đã xóa ${deleted} hồ sơ, ${failed} hồ sơ lỗi (còn nguyên, thử lại sau).`) : ok(`Đã xóa ${deleted} hồ sơ quá hạn.`);
}
