"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
// Demo: requireAdmin ném lỗi, nên không action nào chạy được khi chưa có Supabase.
import { parseSettings, type SettingsErrors } from "@/lib/admin/settings-input";
import { createServerSupabase } from "@/lib/supabase/server";

export type SettingsState = { errors?: SettingsErrors; values?: Record<string, string>; ok?: boolean; nonce?: number };
export type WipeState = { error?: string; deleted?: number };

export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin("/admin/noi-dung");
  const values = Object.fromEntries([...fd.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
  const r = parseSettings(fd);
  if ("errors" in r) return { errors: r.errors, values, nonce: Date.now() };
  const sb = await createServerSupabase();
  const { error } = await sb.from("site_settings").upsert({ id: 1, data: r });
  if (error) {
    console.error("[admin/saveSettings]", error.code);
    return { errors: { form: "Không lưu được. Thử lại hoặc báo quản trị viên." }, values, nonce: Date.now() };
  }
  revalidatePath("/", "layout");
  return { ok: true, values, nonce: Date.now() };
}

// Các bảng nối và lịch phỏng vấn tự xóa theo (on delete cascade); hồ sơ giữ lại (job_id set null).
export async function wipeDemoJobs(_prev: WipeState, fd: FormData): Promise<WipeState> {
  await requireAdmin("/admin/noi-dung");
  if (String(fd.get("confirm") ?? "") !== "XOA") return { error: "Nhập đúng chữ XOA để xác nhận." };
  const sb = await createServerSupabase();
  const { count, error } = await sb.from("jobs").delete({ count: "exact" }).eq("is_demo", true);
  if (error) {
    console.error("[admin/wipeDemoJobs]", error.code);
    return { error: "Không xóa được tin demo." };
  }
  revalidatePath("/", "layout");
  return { deleted: count ?? 0 };
}
