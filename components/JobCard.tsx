import Link from "next/link";
import { UNCONFIRMED, salaryLines } from "@/lib/salary";
import { formatJst } from "@/lib/time";
import { jobHref, type JobSummary } from "@/lib/filters";
import type { Catalog } from "@/lib/types";

const dmy = (iso: string) => {
  const [y, m, d] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }).split("-");
  return `${d}/${m}/${y}`;
};

// Một dòng mục lục: mã tin | tiêu đề | các dữ kiện. Ở chế độ poster (group /grid) các cột xếp chồng.
export default function JobCard({ job, catalog }: { job: JobSummary; catalog: Catalog }) {
  const { monthly, annual } = salaryLines(job);
  const places = catalog.prefectures.filter((p) => job.prefectureIds.includes(p.id)).map((p) => p.nameVi);
  const perks = catalog.benefits.filter((b) => b.featured && job.benefits[b.slug] === true).slice(0, 3);
  const exp = job.experienceYearsMin;
  const req = [job.jpLevel && (job.jpLevel === "none" ? "Không yêu cầu tiếng Nhật" : `Tiếng Nhật ${job.jpLevel}`), exp != null && `từ ${exp} năm kinh nghiệm`]
    .filter(Boolean)
    .join(", ");
  return (
    <article className="group/row relative grid gap-x-8 gap-y-4 border-t border-rule py-6 transition-colors duration-200 hover:bg-paper-2 md:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,17rem)] group-data-[view=poster]/grid:flex group-data-[view=poster]/grid:flex-col group-data-[view=poster]/grid:border-2 group-data-[view=poster]/grid:border-ink group-data-[view=poster]/grid:bg-paper-2 group-data-[view=poster]/grid:p-6 group-data-[view=poster]/grid:shadow-[var(--shadow-card)] group-data-[view=poster]/grid:hover:bg-transparent">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:block">
        <p className="display-face text-2xl leading-none">#{job.code}</p>
        <p className="text-xs text-muted md:mt-2">Cập nhật {dmy(job.updatedAt)}</p>
        {job.isDemo && <p className="tag md:mt-2">Dữ liệu minh họa</p>}
      </div>
      <div className="min-w-0">
        <h3 className="text-[length:var(--text-title)] leading-tight group-data-[view=poster]/grid:text-[length:var(--text-display-s)]">
          <Link href={jobHref(job)} className="link decoration-transparent after:absolute after:inset-0 group-hover/row:decoration-accent-2">
            {job.titleVi}
          </Link>
        </h3>
        <p lang="ja" className="mt-1 text-sm text-muted">{job.titleJa}</p>
        {job.content.summary.vi && (
          <p className="prose-body mt-3 line-clamp-3 hidden group-data-[view=poster]/grid:block">{job.content.summary.vi}</p>
        )}
        {(job.salaryNegotiable === true || perks.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {job.salaryNegotiable === true && <li className="tag">Có thể thương lượng</li>}
            {perks.map((b) => <li key={b.slug} className="tag">{b.nameVi}</li>)}
          </ul>
        )}
      </div>
      <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">Nơi làm</dt>
        <dd className="text-ink">{places.join(", ") || UNCONFIRMED}</dd>
        <dt className="text-muted">Lương</dt>
        <dd className="text-ink tabular-nums">
          {monthly || annual ? <>{monthly && <span className="block">{monthly}</span>}{annual && <span className="block">{annual}</span>}</> : UNCONFIRMED}
        </dd>
        {req && <><dt className="text-muted">Yêu cầu</dt><dd className="text-ink">{req}</dd></>}
        {job.nextInterview && (
          <><dt className="text-muted">Phỏng vấn</dt><dd className="font-semibold text-accent-2">{formatJst(job.nextInterview.startsAt)}</dd></>
        )}
      </dl>
    </article>
  );
}
