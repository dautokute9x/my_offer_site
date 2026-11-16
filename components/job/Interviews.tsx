"use client";
import TimezoneToggle from "@/components/TimezoneToggle";
import { formatJst, formatVn } from "@/lib/time";
import type { InterviewEvent } from "@/lib/types";

const FORMAT = { online: "Online", onsite: "Trực tiếp", unknown: "Hình thức: Chưa xác nhận" };

export default function Interviews({ events }: { events: InterviewEvent[] }) {
  if (!events.length) return <p>Chưa có lịch phỏng vấn sắp tới.</p>;
  return (
    <TimezoneToggle>
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="rounded border border-warn/40 bg-orange-50 p-3">
            <p className="font-semibold text-warn">🗓 {formatJst(e.startsAt)}</p>
            <p className="hidden text-sm group-data-[vn=true]:block">= {formatVn(e.startsAt)}</p>
            <p className="text-sm">{FORMAT[e.format]}{e.publicNote && ` · ${e.publicNote}`}</p>
          </li>
        ))}
      </ul>
    </TimezoneToggle>
  );
}
