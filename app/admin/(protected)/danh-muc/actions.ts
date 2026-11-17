"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { SITE_DATA_TAG } from "@/lib/data";
import { CATALOG_TABLE, isKind, parseCatalog, positiveId, type CatalogErrors, type CatalogKind } from "@/lib/admin/catalog-input";
import { createServerSupabase } from "@/lib/supabase/server";

export type CatalogState = { errors?: CatalogErrors; values?: Record<string, string>; ok?: boolean; nonce?: number };

const toValues = (fd: FormData) => Object.fromEntries([...fd.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
const NOT_FOUND = "Không tìm thấy bản ghi (có thể đã bị xóa).";
const fail = (fd: FormData, errors: CatalogErrors): CatalogState => ({ errors, values: toValues(fd), nonce: Date.now() });

export async function saveCatalog(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  await requireAdmin("/admin/danh-muc");
  const kind = fd.get("kind");
  const rawId = String(fd.get("id") ?? "");
  const id = rawId ? positiveId(rawId) : null;
  if (!isKind(kind) || (rawId && id == null) || (kind === "prefecture" && id == null)) return fail(fd, { form: "Dữ liệu gửi lên không hợp lệ." });
  const sb = await createServerSupabase();
  let groupIds = new Set<number>();
  if (kind === "occupation") {
    const { data } = await sb.from("occupation_groups").select("id");
    groupIds = new Set((data ?? []).map((g) => g.id));
  }
  const r = parseCatalog(kind, fd, groupIds);
  if ("errors" in r) return fail(fd, r.errors);
  const q = sb.from(CATALOG_TABLE[kind]);
  const { data, error } = id == null ? await q.insert(r.row) : await q.update(r.row).eq("id", id).select("id");
  if (!error && id != null && !data?.length) return fail(fd, { form: NOT_FOUND });
  if (error) {
    console.error("[admin/saveCatalog]", kind, error.code);
    const dup: CatalogErrors = kind === "skill" ? { name: "Tên đã tồn tại." } : { slug: "Slug đã tồn tại." };
    return fail(fd, error.code === "23505" ? dup : { form: "Không lưu được. Thử lại hoặc báo quản trị viên." });
  }
  updateTag(SITE_DATA_TAG);
  revalidatePath("/", "layout");
  // Thêm mới: đổi nonce để form được dựng lại (xóa giá trị); sửa: giữ nguyên giá trị đã nhập.
  return { ok: true, nonce: Date.now(), ...(id != null && { values: toValues(fd) }) };
}

const USAGE: Partial<Record<CatalogKind, [string, string, string]>> = {
  occupation: ["job_occupations", "occupation_id", "Đang được N tin sử dụng"],
  skill: ["job_skills", "skill_id", "Đang được N tin sử dụng"],
  benefit: ["job_benefits", "benefit_id", "Đang được N tin sử dụng"],
  group: ["occupations", "group_id", "Đang có N nghề trong nhóm"],
};

export async function deleteCatalog(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  await requireAdmin("/admin/danh-muc");
  const kind = fd.get("kind"), id = positiveId(fd.get("id"));
  const usage = isKind(kind) ? USAGE[kind] : undefined; // tỉnh không có trong USAGE: không được xóa
  if (!isKind(kind) || !usage || id == null) return { errors: { form: "Dữ liệu gửi lên không hợp lệ." } };
  const sb = await createServerSupabase();
  const [table, col, msg] = usage;
  const { count, error: e1 } = await sb.from(table).select("*", { count: "exact", head: true }).eq(col, id);
  if (e1) { console.error("[admin/deleteCatalog]", kind, e1.code); return { errors: { form: "Không kiểm tra được mức sử dụng." } }; }
  if (count) return { errors: { form: msg.replace("N", String(count)) } };
  const { data, error } = await sb.from(CATALOG_TABLE[kind]).delete().eq("id", id).select("id");
  if (error) {
    console.error("[admin/deleteCatalog]", kind, error.code);
    return { errors: { form: error.code === "23503" ? "Mục đang được sử dụng." : "Không xóa được." } };
  }
  if (!data?.length) return { errors: { form: NOT_FOUND } };
  updateTag(SITE_DATA_TAG);
  revalidatePath("/", "layout");
  return { ok: true };
}
