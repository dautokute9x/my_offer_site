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
  const exp = job.experienceYearsMin == null ? UNCONFIRMED : `Từ ${job.experienceYearsMin} năm`;
  const fact = "border-t border-rule-2 pt-3";
  return (
    <div className="space-y-8">
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className={fact}><dt className="text-sm text-muted">Nơi làm</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{places.join(", ") || UNCONFIRMED}</dd></div>
        <div className={fact}><dt className="text-sm text-muted">Lương</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{monthly || annual ? <>{monthly && <span className="block">{monthly}</span>}{annual && <span className="block">{annual}</span>}</> : UNCONFIRMED}</dd></div>
        <div className={fact}><dt className="text-sm text-muted">Tiếng Nhật</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{level}</dd></div>
        <div className={fact}><dt className="text-sm text-muted">Kinh nghiệm</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{exp}</dd></div>
      </dl>
      {job.content.summary.ja || job.content.summary.vi ? <div className="prose-body standfirst max-w-[52ch]"><BilingualBlock text={job.content.summary} status={job.translationStatus} /></div> : null}
      {perks.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {perks.map((b) => <li key={b.slug} className="tag">{b.nameVi}</li>)}
        </ul>
      )}
      {interviews[0] && (
        <TimezoneToggle>
          <p className="font-semibold text-accent-2">Phỏng vấn {formatJst(interviews[0].startsAt)}</p>
          <p className="hidden text-base group-data-[vn=true]:block">= {formatVn(interviews[0].startsAt)}</p>
        </TimezoneToggle>
      )}
    </div>
  );
}
