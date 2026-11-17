"use client";
import { useId, useState, type ReactNode } from "react";
import { normText } from "@/lib/normalize";

export type CheckItem = { value: string; label: ReactNode; search: string; group: string };
export type CheckGroup = { key: string; label: string; toggle?: { checked: boolean; onChange: (on: boolean) => void } };

// Một nhóm checkbox có ô tìm kiếm (theo normText, gồm alias) và tiêu đề nhóm tùy chọn.
export default function CheckList(p: {
  legend: string;
  items: CheckItem[];
  groups: CheckGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const id = useId();
  const nq = normText(q);
  const toggle = (v: string) => p.onChange(p.selected.includes(v) ? p.selected.filter((x) => x !== v) : [...p.selected, v]);
  return (
    <fieldset className="border-t border-rule pt-3">
      <legend className="font-semibold text-ink">{p.legend}</legend>
      {p.searchable !== false && (
        <>
          <label htmlFor={`${id}-q`} className="sr-only">Tìm trong {p.legend}</label>
          <input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm…"
            className="field mt-2 min-h-11 text-sm" />
        </>
      )}
      <div className="mt-2 max-h-56 overflow-y-auto pr-1">
        {p.groups.map((g) => {
          const items = p.items.filter((i) => i.group === g.key && normText(i.search).includes(nq));
          if (!items.length) return null;
          return (
            <div key={g.key} className="mb-2">
              {g.toggle ? (
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
                  <input type="checkbox" checked={g.toggle.checked} onChange={(e) => g.toggle!.onChange(e.target.checked)} />
                  {g.label} (cả nhóm)
                </label>
              ) : (
                g.label && <div className="pt-2 text-xs text-muted">{g.label}</div>
              )}
              {items.map((i) => (
                <label key={i.value} className={`flex min-h-11 items-center gap-2 text-sm ${g.toggle ? "pl-5" : ""}`}>
                  <input type="checkbox" checked={p.selected.includes(i.value)} onChange={() => toggle(i.value)} />
                  {i.label}
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
