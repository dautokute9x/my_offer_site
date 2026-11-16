"use client";
import { useEffect, useSyncExternalStore } from "react";

const KEY = "jobView";

const subscribe = (cb: () => void) => {
  window.addEventListener("jobview", cb);
  return () => window.removeEventListener("jobview", cb);
};
const read = () => {
  try {
    return localStorage.getItem(KEY) === "poster" ? "poster" : "list";
  } catch {
    return "list";
  }
};

export default function ViewToggle({ targetId }: { targetId: string }) {
  const view = useSyncExternalStore(subscribe, read, () => "list");
  useEffect(() => {
    document.getElementById(targetId)?.setAttribute("data-view", view);
  }, [view, targetId]);
  const pick = (v: "list" | "poster") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event("jobview"));
  };
  return (
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
  );
}
