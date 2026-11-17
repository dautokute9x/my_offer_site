"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { filtersToQuery, type JobFilters } from "@/lib/filters";
import type { Catalog, JpLevel } from "@/lib/types";
import CheckList from "./CheckList";
import { useJobsNav } from "./JobsNav";

// Desktop (lg+): panel là sidebar thường; chỉ mobile mới dùng <dialog> (ngăn kéo).
const mq = () => window.matchMedia("(min-width:1024px)");
const subscribe = (cb: () => void) => {
  const m = mq();
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

const field = "mt-1 min-h-11 w-full rounded border border-slate-300 bg-white px-2 text-sm lg:min-h-9";

export default function FilterPanel({ catalog, filters: server, total }: { catalog: Catalog; filters: JobFilters; total: number }) {
  const { go: nav } = useJobsNav();
  const wide = useSyncExternalStore(subscribe, () => mq().matches, () => false);
  // Bản lạc quan: nhiều cú nhấp liên tiếp cộng dồn và ô tick ngay; đồng bộ lại khi server trả bộ lọc mới.
  const [f, setF] = useState(server);
  const [seen, setSeen] = useState(server);
  if (seen !== server) { setSeen(server); setF(server); }
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const go = (patch: Partial<JobFilters>) => {
    const next = { ...f, ...patch, page: 1 };
    setF(next);
    const qs = filtersToQuery(next);
    nav(qs ? `/viec-lam?${qs}` : "/viec-lam");
  };
  const count = [f.prefectures, f.groups, f.occupations, f.benefits].reduce((n, a) => n + a.length, 0) +
    [f.salaryMinMan != null || f.salaryMaxMan != null, f.jpLevel, f.maxExperience != null, f.hasInterview].filter(Boolean).length;
  const num = (s: string) => (/^\d{1,6}$/.test(s.trim()) ? Number(s) : null);
  const salary = (form: HTMLFormElement) => {
    const v = (n: string) => num((form.elements.namedItem(n) as HTMLInputElement).value);
    const [min, max] = [v("min"), v("max")];
    if (min !== f.salaryMinMan || max !== f.salaryMaxMan) go({ salaryMinMan: min, salaryMaxMan: max });
  };
  const regions = [...new Set(catalog.prefectures.map((p) => p.region))];
  const groupOf = (id: number) => catalog.groups.find((g) => g.id === id)!;

  const body = (
    <form onSubmit={(e) => { e.preventDefault(); salary(e.currentTarget); }} className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 id="filter-title" ref={title} tabIndex={-1} className="text-lg font-bold text-navy">Bộ lọc</h2>
        <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 px-3 text-sm lg:hidden">Đóng</button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 lg:flex-none lg:overflow-visible">
        <CheckList legend="Tỉnh / thành" selected={f.prefectures} onChange={(v) => go({ prefectures: v })}
          groups={regions.map((r) => ({ key: r, label: r }))}
          items={catalog.prefectures.map((p) => ({
            value: p.code, label: <>{p.nameVi} (<span lang="ja">{p.nameJa}</span>)</>, group: p.region,
            search: [p.nameVi, p.nameJa, p.romaji, ...p.aliases].join(" "),
          }))} />
        <CheckList legend="Ngành nghề" selected={f.occupations} onChange={(v) => go({ occupations: v })}
          groups={catalog.groups.map((g) => ({
            key: g.slug, label: g.nameVi,
            toggle: {
              checked: f.groups.includes(g.slug),
              onChange: (on) => go({ groups: on ? [...f.groups, g.slug] : f.groups.filter((x) => x !== g.slug) }),
            },
          }))}
          items={catalog.occupations.map((o) => ({
            value: o.slug, label: o.nameVi, group: groupOf(o.groupId).slug,
            search: [o.nameVi, o.nameJa, ...o.aliases].join(" "),
          }))} />
        <fieldset className="border-t border-slate-200 pt-3">
          <legend className="font-semibold text-navy">Lương (万円)</legend>
          <div className="mt-2 flex gap-4 text-sm">
            {(["month", "year"] as const).map((p) => (
              <label key={p} className="flex min-h-9 items-center gap-2">
                <input type="radio" name="ky" checked={f.period === p} onChange={() => go({ period: p })} />
                {p === "month" ? "Theo tháng" : "Theo năm"}
              </label>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <label className="flex-1 text-sm">Từ
              <input name="min" type="number" min={0} inputMode="numeric" key={`a${f.salaryMinMan}`}
                defaultValue={f.salaryMinMan ?? ""} onBlur={(e) => salary(e.currentTarget.form!)} className={field} />
            </label>
            <label className="flex-1 text-sm">Đến
              <input name="max" type="number" min={0} inputMode="numeric" key={`b${f.salaryMaxMan}`}
                defaultValue={f.salaryMaxMan ?? ""} onBlur={(e) => salary(e.currentTarget.form!)} className={field} />
            </label>
          </div>
        </fieldset>
        <label className="block border-t border-slate-200 pt-3 text-sm font-semibold text-navy">Tiếng Nhật
          <select className={`${field} font-normal text-slate-900`} value={f.jpLevel ?? ""}
            onChange={(e) => go({ jpLevel: (e.target.value || null) as JpLevel | null })}>
            <option value="">Tất cả</option>
            {["N1", "N2", "N3", "N4", "N5"].map((l) => <option key={l} value={l}>Từ {l} trở xuống</option>)}
            <option value="none">Không yêu cầu</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-navy">Kinh nghiệm
          <select className={`${field} font-normal text-slate-900`} value={f.maxExperience ?? ""}
            onChange={(e) => go({ maxExperience: e.target.value === "" ? null : Number(e.target.value) })}>
            <option value="">Tất cả</option>
            <option value="0">Không cần kinh nghiệm</option>
            {[1, 2, 3, 5].map((n) => <option key={n} value={n}>Tối đa {n} năm</option>)}
          </select>
        </label>
        <CheckList legend="Quyền lợi" searchable={false} selected={f.benefits} onChange={(v) => go({ benefits: v })}
          groups={[{ key: "all", label: "" }]}
          items={catalog.benefits.map((b) => ({ value: b.slug, label: b.nameVi, group: "all", search: b.nameVi }))} />
        <label className="flex min-h-9 items-center gap-2 border-t border-slate-200 pt-3 text-sm font-semibold text-navy">
          <input type="checkbox" checked={f.hasInterview} onChange={(e) => go({ hasInterview: e.target.checked })} />
          Có lịch phỏng vấn sắp tới
        </label>
      </div>
      <div className="flex gap-2 border-t border-slate-200 p-4 lg:hidden">
        <button type="button" onClick={() => nav("/viec-lam")}
          className="min-h-11 rounded border border-slate-300 px-4 font-semibold">Xóa tất cả</button>
        <button type="button" onClick={() => dialog.current?.close()}
          className="min-h-11 flex-1 rounded bg-brand px-4 font-semibold text-white">Xem {total} kết quả</button>
      </div>
    </form>
  );
  if (wide) return <div className="w-full rounded-lg border border-slate-200 bg-white">{body}</div>;
  return (
    <>
      <button type="button" aria-haspopup="dialog"
        onClick={() => { dialog.current?.showModal(); title.current?.focus(); }}
        className="min-h-11 w-full rounded border border-navy bg-white px-4 font-semibold text-navy lg:hidden">
        Bộ lọc ({count})
      </button>
      <dialog ref={dialog} aria-labelledby="filter-title"
        className="m-0 h-full max-h-none w-full max-w-none bg-white p-0 backdrop:bg-black/40 lg:static lg:block lg:h-auto lg:rounded-lg lg:border lg:border-slate-200">
        {body}
      </dialog>
    </>
  );
}
