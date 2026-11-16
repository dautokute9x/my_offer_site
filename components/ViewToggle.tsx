"use client";
import { useSyncExternalStore, type ReactNode } from "react";

const KEY = "jobView";
type View = "list" | "poster";

// Bộ nhớ trong là nguồn chính; localStorage chỉ là tiện ích (có thể ném lỗi).
const store = new Map<"mem", View>();
const subscribe = (cb: () => void) => {
  window.addEventListener("jobview", cb);
  return () => window.removeEventListener("jobview", cb);
};
const read = (): View => {
  const m = store.get("mem");
  if (m) return m;
  try {
    return localStorage.getItem(KEY) === "poster" ? "poster" : "list";
  } catch {
    return "list";
  }
};

export default function ViewToggle({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const view = useSyncExternalStore(subscribe, read, () => "list" as View);
  const pick = (v: View) => {
    store.set("mem", v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event("jobview"));
  };
  return (
    <div data-view={view} className="group/grid space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {summary}
        <div role="group" aria-label="Kiểu hiển thị" className="inline-flex overflow-hidden rounded border border-navy">
          {(["list", "poster"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => pick(v)}
              className={`min-h-11 px-4 text-sm font-semibold lg:min-h-9 ${view === v ? "bg-navy text-white" : "bg-white text-navy"}`}
            >
              {v === "list" ? "Danh sách" : "Poster"}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
