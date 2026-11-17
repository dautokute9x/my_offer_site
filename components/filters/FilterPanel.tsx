"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { filtersToQuery, type JobFilters } from "@/lib/filters";
import type { Catalog, JpLevel } from "@/lib/types";
import CheckList from "./CheckList";
import { useJobsNav } from "./JobsNav";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/format";
import { catalogName, prefectureName } from "@/lib/i18n/catalog";

// Desktop (lg+): panel là sidebar thường; chỉ mobile mới dùng <dialog> (ngăn kéo).
const mq = () => window.matchMedia("(min-width:1024px)");
const subscribe = (cb: () => void) => {
  const m = mq();
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

const field = "field mt-1 min-h-11 text-sm";

export default function FilterPanel({ catalog, filters: server, total }: { catalog: Catalog; filters: JobFilters; total: number }) {
  const { go: nav } = useJobsNav();
  const { lang, t, href } = useI18n();
  const F = t.jobs.filters;
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
    nav(href(qs ? `/viec-lam?${qs}` : "/viec-lam"));
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
      <div className="flex items-center justify-between border-t-2 border-accent-2 p-4 pb-2 lg:px-0">
        <h2 id="filter-title" ref={title} tabIndex={-1} className="text-[length:var(--text-title)]">{F.title}</h2>
        <button type="button" onClick={() => dialog.current?.close()} className="btn min-h-11 lg:hidden">{F.close}</button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 accent-ink lg:flex-none lg:overflow-visible lg:px-0">
        <CheckList legend={F.prefectures} selected={f.prefectures} onChange={(v) => go({ prefectures: v })}
          groups={regions.map((r) => ({ key: r, label: r }))}
          items={catalog.prefectures.map((p) => ({
            value: p.code, label: prefectureName(lang, p) === p.nameJa ? p.nameJa : <>{p.nameVi} (<span lang="ja">{p.nameJa}</span>)</>, group: p.region,
            search: [p.nameVi, p.nameJa, p.romaji, ...p.aliases].join(" "),
          }))} />
        <CheckList legend={F.occupations} selected={f.occupations} onChange={(v) => go({ occupations: v })}
          groups={catalog.groups.map((g) => ({
            key: g.slug, label: catalogName(lang, t, "groups", g),
            toggle: {
              checked: f.groups.includes(g.slug),
              onChange: (on) => go({ groups: on ? [...f.groups, g.slug] : f.groups.filter((x) => x !== g.slug) }),
            },
          }))}
          items={catalog.occupations.map((o) => ({
            value: o.slug, label: catalogName(lang, t, "occupations", o), group: groupOf(o.groupId).slug,
            search: [o.nameVi, o.nameJa, catalogName(lang, t, "occupations", o), ...o.aliases].join(" "),
          }))} />
        <fieldset className="border-t border-rule pt-3">
          <legend className="font-semibold text-ink">{F.salary}</legend>
          <div className="mt-2 flex gap-4 text-sm">
            {(["month", "year"] as const).map((p) => (
              <label key={p} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="ky" checked={f.period === p} onChange={() => go({ period: p })} />
                {p === "month" ? F.perMonth : F.perYear}
              </label>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <label className="flex-1 text-sm">{F.from}
              <input name="min" type="number" min={0} inputMode="numeric" key={`a${f.salaryMinMan}`}
                defaultValue={f.salaryMinMan ?? ""} onBlur={(e) => salary(e.currentTarget.form!)} className={field} />
            </label>
            <label className="flex-1 text-sm">{F.to}
              <input name="max" type="number" min={0} inputMode="numeric" key={`b${f.salaryMaxMan}`}
                defaultValue={f.salaryMaxMan ?? ""} onBlur={(e) => salary(e.currentTarget.form!)} className={field} />
            </label>
          </div>
        </fieldset>
        <label className="block border-t border-rule pt-3 text-sm font-semibold text-ink">{F.jp}
          <select className={`${field} font-normal text-ink`} value={f.jpLevel ?? ""}
            onChange={(e) => go({ jpLevel: (e.target.value || null) as JpLevel | null })}>
            <option value="">{F.all}</option>
            {["N1", "N2", "N3", "N4", "N5"].map((l) => <option key={l} value={l}>{fmt(F.jpUpTo, { v: l })}</option>)}
            <option value="none">{F.jpNone}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-ink">{F.experience}
          <select className={`${field} font-normal text-ink`} value={f.maxExperience ?? ""}
            onChange={(e) => go({ maxExperience: e.target.value === "" ? null : Number(e.target.value) })}>
            <option value="">{F.all}</option>
            <option value="0">{F.noExperience}</option>
            {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{fmt(F.maxYears, { n })}</option>)}
          </select>
        </label>
        <CheckList legend={F.benefits} searchable={false} selected={f.benefits} onChange={(v) => go({ benefits: v })}
          groups={[{ key: "all", label: "" }]}
          items={catalog.benefits.map((b) => ({ value: b.slug, label: catalogName(lang, t, "benefits", b), group: "all", search: b.nameVi }))} />
        <label className="flex min-h-11 items-center gap-2 border-t border-rule pt-3 text-sm font-semibold text-ink">
          <input type="checkbox" checked={f.hasInterview} onChange={(e) => go({ hasInterview: e.target.checked })} />
          {F.hasInterview}
        </label>
      </div>
      <div className="flex gap-2 border-t border-rule p-4 lg:hidden">
        <button type="button" onClick={() => nav(href("/viec-lam"))}
          className="btn">{F.clearAll}</button>
        <button type="button" onClick={() => dialog.current?.close()}
          className="btn btn-primary flex-1">{fmt(F.showResults, { n: total })}</button>
      </div>
    </form>
  );
  if (wide) return <div className="w-full">{body}</div>;
  return (
    <>
      <button type="button" aria-haspopup="dialog"
        onClick={() => { dialog.current?.showModal(); title.current?.focus(); }}
        className="btn w-full lg:hidden">
        {fmt(F.open, { n: count })}
      </button>
      <dialog ref={dialog} aria-labelledby="filter-title"
        className="m-0 h-full max-h-none w-full max-w-none bg-paper p-0 backdrop:bg-ink/40">
        {body}
      </dialog>
    </>
  );
}
