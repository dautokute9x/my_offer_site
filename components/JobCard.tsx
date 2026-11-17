import { jobSubtitle, jobTitle } from "@/lib/i18n/catalog";
import Link from "next/link";
import { salaryLines } from "@/lib/salary";
import { formatJst } from "@/lib/time";
import { jobHref, type JobSummary } from "@/lib/filters";
import type { Catalog } from "@/lib/types";
import { catalogName, prefectureName } from "@/lib/i18n/catalog";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

const dmy = (iso: string, pattern: string) => {
  const [y, m, d] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }).split("-");
  return fmt(pattern, { d, m, y });
};

// Một dòng mục lục: mã tin | tiêu đề | các dữ kiện. Ở chế độ poster (group /grid) các cột xếp chồng.
export default async function JobCard({ job, catalog }: { job: JobSummary; catalog: Catalog }) {
  const { lang, t } = await getT();
  const C = t.jobs.card, unconfirmed = t.common.unconfirmed;
  const { monthly, annual } = salaryLines(job, t.salary);
  const places = catalog.prefectures.filter((p) => job.prefectureIds.includes(p.id)).map((p) => prefectureName(lang, p));
  const perks = catalog.benefits.filter((b) => b.featured && job.benefits[b.slug] === true).slice(0, 3);
  const exp = job.experienceYearsMin;
  const req = [job.jpLevel && (job.jpLevel === "none" ? C.jpNone : fmt(C.jp, { v: job.jpLevel })), exp != null && fmt(C.experience, { n: exp })]
    .filter(Boolean)
    .join(", ");
  return (
    <article className="group/row relative grid gap-x-8 gap-y-4 border-t border-rule py-6 transition-colors duration-200 hover:bg-paper-2 md:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,17rem)] group-data-[view=poster]/grid:flex group-data-[view=poster]/grid:flex-col group-data-[view=poster]/grid:border-2 group-data-[view=poster]/grid:border-ink group-data-[view=poster]/grid:bg-paper-2 group-data-[view=poster]/grid:p-6 group-data-[view=poster]/grid:shadow-[var(--shadow-card)] group-data-[view=poster]/grid:hover:bg-transparent">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:block">
        <p className="display-face text-2xl leading-none">#{job.code}</p>
        <p className="text-xs text-muted md:mt-2">{fmt(C.updated, { d: dmy(job.updatedAt, t.dates.date) })}</p>
        {job.isDemo && <p className="tag md:mt-2">{t.common.demoTag}</p>}
      </div>
      <div className="min-w-0">
        <h3 className="text-[length:var(--text-title)] leading-tight group-data-[view=poster]/grid:text-[length:var(--text-display-s)]">
          <Link href={localePath(lang, jobHref(job))} className="link decoration-transparent after:absolute after:inset-0 group-hover/row:decoration-accent-2">
            {jobTitle(lang, job)}
          </Link>
        </h3>
        <p lang={jobSubtitle(lang, job).lang} className="mt-1 text-sm text-muted">{jobSubtitle(lang, job).text}</p>
        {job.content.summary.vi && (
          <p className="prose-body mt-3 line-clamp-3 hidden group-data-[view=poster]/grid:block">{job.content.summary.vi}</p>
        )}
        {(job.salaryNegotiable === true || perks.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {job.salaryNegotiable === true && <li className="tag">{C.negotiable}</li>}
            {perks.map((b) => <li key={b.slug} className="tag">{catalogName(lang, t, "benefits", b)}</li>)}
          </ul>
        )}
      </div>
      <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">{C.place}</dt>
        <dd className="text-ink">{places.join(", ") || unconfirmed}</dd>
        <dt className="text-muted">{C.salary}</dt>
        <dd className="text-ink tabular-nums">
          {monthly || annual ? <>{monthly && <span className="block">{monthly}</span>}{annual && <span className="block">{annual}</span>}</> : unconfirmed}
        </dd>
        {req && <><dt className="text-muted">{C.requirements}</dt><dd className="text-ink">{req}</dd></>}
        {job.nextInterview && (
          <><dt className="text-muted">{C.interview}</dt><dd className="font-semibold text-accent-2">{formatJst(job.nextInterview.startsAt, t.dates)}</dd></>
        )}
      </dl>
    </article>
  );
}
