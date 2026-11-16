"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isValidStatus } from "@/lib/applications/status";
import { removeApplicationObjects } from "@/lib/applications/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jstTodayKey } from "@/lib/time";

export type AppState = { error?: string; ok?: string; nonce?: number };
const err = (error: string): AppState => ({ error, nonce: Date.now() });
const ok = (msg: string): AppState => ({ ok: msg, nonce: Date.now() });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// id hồ sơ là uuid (schema 0001); chỉ nhận đúng dạng, không tin dữ liệu form.
const idOf = (v: unknown) => (UUID.test(String(v ?? "")) ? String(v).toLowerCase() : null);
const BAD = "Dữ liệu gửi lên không hợp lệ.";

export async function changeStatus(_p: AppState, fd: FormData): Promise<AppState> {
  const rawId = String(fd.get("id") ?? "");
  await requireAdmin(`/admin/ho-so/${rawId}`);
  const id = idOf(rawId), status = fd.get("status");
  if (!id || !isValidStatus(status)) return err(BAD);
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("applications").update({ status }).eq("id", id).select("id");
  if (error) { console.error("[admin/changeStatus]", error.code); return err("Không đổi được trạng thái."); }
  if (!data?.length) return err("Không tìm thấy hồ sơ.");
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
async function deleteOne(sb: Awaited<ReturnType<typeof createServerSupabase>>, id: string): Promise<boolean> {
  const r = await removeApplicationObjects(id);
  if ("error" in r) return r.error === "not_found"; // dòng đã biến mất: coi như xong
  const { error } = await sb.from("applications").delete().eq("id", id);
  if (error) console.error("[admin/deleteApplication]", error.code);
  return !error;
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
  if (!(await deleteOne(sb, id))) return err("Không xóa được hồ sơ hoặc CV. Hồ sơ vẫn được giữ, hãy thử lại.");
  revalidatePath("/admin/ho-so", "layout");
  redirect("/admin/ho-so?da-xoa=1");
}

const BATCH = 50;
export async function purgeExpired(): Promise<AppState> {
  await requireAdmin("/admin/ho-so");
  const sb = await createServerSupabase();
  const today = jstTodayKey();
  const stale = new Date(Date.now() - 24 * 3600_000).toISOString();
  let deleted = 0, failed = 0, last = "";
  for (;;) {
    // Phân trang theo id (keyset) để hồ sơ lỗi không bị lấy lại vô hạn.
    let q = sb.from("applications").select("id")
      .or(`delete_after.lt.${today},and(status.eq.pending_upload,created_at.lt.${stale})`).order("id").limit(BATCH);
    if (last) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) { console.error("[admin/purge]", error.code); return err(`Dọn dở dang do lỗi truy vấn (đã xóa ${deleted}, lỗi ${failed}).`); }
    if (!data?.length) break;
    for (const { id } of data) { if (await deleteOne(sb, id)) deleted++; else failed++; }
    last = data[data.length - 1].id;
    if (data.length < BATCH) break;
  }
  revalidatePath("/admin/ho-so", "layout");
  return failed ? err(`Đã xóa ${deleted} hồ sơ, ${failed} hồ sơ lỗi (còn nguyên, thử lại sau).`) : ok(`Đã xóa ${deleted} hồ sơ quá hạn.`);
}
