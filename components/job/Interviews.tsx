import TimezoneToggle from "@/components/TimezoneToggle";
import { formatJst, formatVn } from "@/lib/time";
import type { InterviewEvent } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export default async function Interviews({ events }: { events: InterviewEvent[] }) {
  const { t } = await getT();
  if (!events.length) return <p>{t.detail.noInterviews}</p>;
  return (
    <TimezoneToggle>
      <ul className="border-t border-rule text-base">
        {events.map((e) => (
          <li key={e.id} className="border-b-2 border-accent-2/30 py-3">
            <p className="font-semibold text-accent-2">{formatJst(e.startsAt, t.dates)}</p>
            <p className="hidden text-sm group-data-[vn=true]:block">= {formatVn(e.startsAt, t.dates)}</p>
            <p className="text-sm text-muted">{t.detail.interviewFormat[e.format]}{e.publicNote && `, ${e.publicNote}`}</p>
          </li>
        ))}
      </ul>
    </TimezoneToggle>
  );
}
