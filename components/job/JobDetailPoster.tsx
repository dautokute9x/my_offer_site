import { salaryLines } from "@/lib/salary";
import { formatJst, formatVn } from "@/lib/time";
import TimezoneToggle from "@/components/TimezoneToggle";
import type { Catalog, InterviewEvent, Job } from "@/lib/types";
import { catalogName, prefectureName } from "@/lib/i18n/catalog";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";
import BilingualBlock from "./BilingualBlock";

export default async function JobDetailPoster({ job, catalog, interviews }: { job: Job; catalog: Catalog; interviews: InterviewEvent[] }) {
  const { lang, t } = await getT();
  const d = t.detail, UNCONFIRMED = t.common.unconfirmed;
  const { monthly, annual } = salaryLines(job, t.salary);
  const places = catalog.prefectures.filter((p) => job.prefectureIds.includes(p.id)).map((p) => prefectureName(lang, p));
  const perks = catalog.benefits.filter((b) => job.benefits[b.slug] === true);
  const level = job.jpLevel == null ? UNCONFIRMED : job.jpLevel === "none" ? d.jpNoneLong : job.jpLevel;
  const exp = job.experienceYearsMin == null ? UNCONFIRMED : fmt(d.expFrom, { n: job.experienceYearsMin });
  const fact = "border-t border-rule-2 pt-3";
  return (
    <div className="space-y-8">
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className={fact}><dt className="text-sm text-muted">{d.place}</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{places.join(", ") || UNCONFIRMED}</dd></div>
        <div className={fact}><dt className="text-sm text-muted">{d.salary}</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{monthly || annual ? <>{monthly && <span className="block">{monthly}</span>}{annual && <span className="block">{annual}</span>}</> : UNCONFIRMED}</dd></div>
        <div className={fact}><dt className="text-sm text-muted">{d.japanese}</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{level}</dd></div>
        <div className={fact}><dt className="text-sm text-muted">{d.experience}</dt><dd className="display-face mt-1 text-[length:var(--text-title)]">{exp}</dd></div>
      </dl>
      {job.content.summary.ja || job.content.summary.vi ? <div className="prose-body standfirst max-w-[52ch]"><BilingualBlock text={job.content.summary} status={job.translationStatus} /></div> : null}
      {perks.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {perks.map((b) => <li key={b.slug} className="tag">{catalogName(lang, t, "benefits", b)}</li>)}
        </ul>
      )}
      {interviews[0] && (
        <TimezoneToggle>
          <p className="font-semibold text-accent-2">{fmt(d.interviewAt, { time: formatJst(interviews[0].startsAt, t.dates) })}</p>
          <p className="hidden text-base group-data-[vn=true]:block">= {formatVn(interviews[0].startsAt, t.dates)}</p>
        </TimezoneToggle>
      )}
    </div>
  );
}
