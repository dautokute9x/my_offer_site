import Link from "next/link";
import { UNCONFIRMED, salaryLines } from "@/lib/salary";
import { formatJst } from "@/lib/time";
import { jobHref, type JobSummary } from "@/lib/filters";
import type { Catalog } from "@/lib/types";

const dmy = (iso: string) => {
  const [y, m, d] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }).split("-");
  return `${d}/${m}/${y}`;
};

export default function JobCard({ job, catalog }: { job: JobSummary; catalog: Catalog }) {
  const { monthly, annual } = salaryLines(job);
  const salary = [monthly, annual].filter(Boolean).join(" · ");
  const places = catalog.prefectures.filter((p) => job.prefectureIds.includes(p.id)).map((p) => p.nameVi);
  const perks = catalog.benefits.filter((b) => b.featured && job.benefits[b.slug] === true).slice(0, 3);
  const exp = job.experienceYearsMin;
  const req = [job.jpLevel && (job.jpLevel === "none" ? "Không yêu cầu tiếng Nhật" : job.jpLevel), exp != null && `≥${exp} năm`]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="relative flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-brand group-data-[view=poster]/grid:border-2 group-data-[view=poster]/grid:border-navy group-data-[view=poster]/grid:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span className="font-semibold text-navy">#{job.code}</span>
        <span>
          {job.isDemo && <span className="mr-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Dữ liệu minh họa</span>}
          Cập nhật {dmy(job.updatedAt)}
        </span>
      </div>
      <h3 className="text-lg font-bold leading-snug text-navy group-data-[view=poster]/grid:text-xl">
        <Link href={jobHref(job)} className="after:absolute after:inset-0">
          {job.titleVi}
        </Link>
      </h3>
      <p lang="ja" className="text-sm text-slate-600">{job.titleJa}</p>
      {job.content.summary.vi && (
        <p className="line-clamp-3 hidden text-sm text-slate-700 group-data-[view=poster]/grid:block">{job.content.summary.vi}</p>
      )}
      <p className="text-sm">📍 {places.join(", ") || UNCONFIRMED}</p>
      <p className="text-sm">
        💴 {salary || `Lương: ${UNCONFIRMED}`}
        {job.salaryNegotiable === true && (
          <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-xs text-brand">Có thể thương lượng</span>
        )}
      </p>
      {(req || perks.length > 0) && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {req && <span>{req}</span>}
          {perks.map((b) => (
            <span key={b.slug} className="rounded bg-ok/10 px-2 py-0.5 text-xs text-ok">{b.nameVi}</span>
          ))}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
        {job.nextInterview ? (
          <span className="font-semibold text-warn">🗓 PV {formatJst(job.nextInterview.startsAt)}</span>
        ) : (
          <span />
        )}
        <span className="font-semibold text-brand">Xem chi tiết →</span>
      </div>
    </article>
  );
}
