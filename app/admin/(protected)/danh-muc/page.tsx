import CatalogForm, { type CatalogItem } from "@/components/admin/CatalogForm";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CatalogAdmin() {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  await requireAdmin("/admin/danh-muc");
  const sb = await createServerSupabase();
  const [groups, occ, skills, benefits, prefs] = await Promise.all([
    sb.from("occupation_groups").select("*").order("sort").order("id"),
    sb.from("occupations").select("*").order("id"),
    sb.from("skills").select("*").order("name"),
    sb.from("benefits").select("*").order("sort").order("id"),
    sb.from("prefectures").select("*").order("id"),
  ]);
  const bad = [groups, occ, skills, benefits, prefs].find((r) => r.error);
  if (bad?.error) {
    console.error("[admin/danh-muc]", bad.error.code);
    return <p role="alert" className="text-red-700">Không tải được danh mục.</p>;
  }
  const g = (groups.data ?? []) as CatalogItem[];
  const gOpts = g.map((x) => ({ id: Number(x.id), name_vi: String(x.name_vi) }));
  const sections: { kind: "group" | "occupation" | "skill" | "benefit" | "prefecture"; title: string; rows: CatalogItem[] }[] = [
    { kind: "group", title: "Nhóm nghề", rows: g },
    { kind: "occupation", title: "Ngành nghề", rows: (occ.data ?? []) as CatalogItem[] },
    { kind: "skill", title: "Kỹ năng", rows: (skills.data ?? []) as CatalogItem[] },
    { kind: "benefit", title: "Quyền lợi", rows: (benefits.data ?? []) as CatalogItem[] },
    { kind: "prefecture", title: "Tỉnh (chỉ sửa tên tiếng Việt và alias)", rows: (prefs.data ?? []) as CatalogItem[] },
  ];
  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Danh mục</h1>
      {sections.map((s) => (
        <section key={s.kind} aria-labelledby={`h-${s.kind}`} className="space-y-3">
          <h2 id={`h-${s.kind}`} className="text-xl font-bold">{s.title} ({s.rows.length})</h2>
          {s.kind !== "prefecture" && (
            <details className="rounded border p-3">
              <summary className="min-h-11 cursor-pointer font-semibold leading-[2.75rem]">Thêm mới</summary>
              <CatalogForm kind={s.kind} groups={gOpts} />
            </details>
          )}
          <ul className="space-y-3">
            {s.rows.map((r) => (
              <li key={String(r.id)}><CatalogForm kind={s.kind} item={r} groups={gOpts} canDelete={s.kind !== "prefecture"} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
