import { UNCONFIRMED, salaryLines } from "@/lib/salary";
import { formatJst, formatVn } from "@/lib/time";
import TimezoneToggle from "@/components/TimezoneToggle";
import type { Catalog, InterviewEvent, Job } from "@/lib/types";
import BilingualBlock from "./BilingualBlock";

export default function JobDetailPoster({ job, catalog, interviews }: { job: Job; catalog: Catalog; interviews: InterviewEvent[] }) {
  const { monthly, annual } = salaryLines(job);
  const places = catalog.prefectures.filter((p) => job.prefectureIds.includes(p.id)).map((p) => p.nameVi);
  const perks = catalog.benefits.filter((b) => job.benefits[b.slug] === true);
  const level = job.jpLevel == null ? UNCONFIRMED : job.jpLevel === "none" ? "Không yêu cầu tiếng Nhật" : job.jpLevel;
  return (
    <div className="space-y-3 rounded-lg border-2 border-navy bg-white p-6 text-lg">
      <p className="font-bold text-navy"><span aria-hidden="true">📍</span> {places.join(", ") || UNCONFIRMED}</p>
      <p><span aria-hidden="true">💴</span> {[monthly, annual].filter(Boolean).join(" · ") || `Lương: ${UNCONFIRMED}`}</p>
      <p><span aria-hidden="true">🈂</span> {level} · {job.experienceYearsMin == null ? `Kinh nghiệm: ${UNCONFIRMED}` : `≥${job.experienceYearsMin} năm`}</p>
      {job.content.summary.ja || job.content.summary.vi ? <BilingualBlock text={job.content.summary} status={job.translationStatus} /> : null}
      {perks.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {perks.map((b) => <li key={b.slug} className="rounded bg-ok/10 px-2 py-0.5 text-ok">{b.nameVi}</li>)}
        </ul>
      )}
      {interviews[0] && (
        <TimezoneToggle>
          <p className="font-semibold text-warn"><span aria-hidden="true">🗓</span> Phỏng vấn {formatJst(interviews[0].startsAt)}</p>
          <p className="hidden text-base group-data-[vn=true]:block">= {formatVn(interviews[0].startsAt)}</p>
        </TimezoneToggle>
      )}
    </div>
  );
}
