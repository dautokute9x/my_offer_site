"use client";
import { useEffect, useState, type ReactNode } from "react";

const KEY = "tz-vn";

// Bọc nội dung; phần tử con dùng `hidden group-data-[vn=true]:block` cho giờ Việt Nam.
// State trong bộ nhớ là nguồn đúng; localStorage chỉ là tiện ích (có thể ném lỗi).
export default function TimezoneToggle({ children }: { children: ReactNode }) {
  const [vn, setVn] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc lựa chọn đã lưu sau hydrate
      if (localStorage.getItem(KEY) === "1") setVn(true);
    } catch {}
  }, []);
  const change = (on: boolean) => {
    setVn(on);
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
  };
  return (
    <div data-vn={vn} className="group space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={vn} onChange={(e) => change(e.target.checked)} className="size-5 accent-ink" />
        Hiện giờ Việt Nam
      </label>
      {children}
    </div>
  );
}
