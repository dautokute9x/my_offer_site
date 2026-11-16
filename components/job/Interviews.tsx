"use client";
import { useState } from "react";
import { formatJst, formatVn } from "@/lib/time";
import type { InterviewEvent } from "@/lib/types";

const FORMAT = { online: "Online", onsite: "Trực tiếp", unknown: "Hình thức: Chưa xác nhận" };

export default function Interviews({ events }: { events: InterviewEvent[] }) {
  const [vn, setVn] = useState(false);
  if (!events.length) return <p>Chưa có lịch phỏng vấn sắp tới.</p>;
  return (
    <div className="space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={vn} onChange={(e) => setVn(e.target.checked)} className="size-5" />
        Hiện giờ Việt Nam
      </label>
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="rounded border border-warn/40 bg-orange-50 p-3">
            <p className="font-semibold text-warn">🗓 {formatJst(e.startsAt)}</p>
            {vn && <p className="text-sm">= {formatVn(e.startsAt)}</p>}
            <p className="text-sm">{FORMAT[e.format]}{e.publicNote && ` · ${e.publicNote}`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
