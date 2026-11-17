import { UNCONFIRMED, salaryLines } from "@/lib/salary";
import type { Catalog, ContentField, InterviewEvent, Job } from "@/lib/types";
import BilingualBlock from "./BilingualBlock";
import Interviews from "./Interviews";
import TriValue from "./TriValue";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="grid gap-4 border-t border-rule-2 pt-6 lg:grid-cols-12 lg:gap-8">
    <h2 id={id} className="text-[length:var(--text-title)] lg:col-span-4">{title}</h2>
    <div className="prose-body max-w-none space-y-4 lg:col-span-8">{children}</div>
  </section>
);

export default function JobDetailFull({ job, catalog, interviews }: { job: Job; catalog: Catalog; interviews: InterviewEvent[] }) {
  const { monthly, annual } = salaryLines(job);
  const block = (f: ContentField) => <BilingualBlock text={job.content[f]} status={job.translationStatus} />;
  const skills = catalog.skills.filter((s) => job.skillIds.includes(s.id)).map((s) => s.name);
  const level = job.jpLevel == null ? UNCONFIRMED : job.jpLevel === "none" ? "Không yêu cầu" : job.jpLevel;
  const exp = job.experienceYearsMin == null ? UNCONFIRMED : `Từ ${job.experienceYearsMin} năm`;
  const has = (f: ContentField) => !!(job.content[f].ja || job.content[f].vi);
  const sub = (label: string, f: ContentField) =>
    has(f) && (<div><h3 className="text-lg">{label}</h3><div className="mt-1">{block(f)}</div></div>);
  return (
    <div className="space-y-10">
      <Section id="luong" title="Lương & thu nhập">
        <dl className="grid gap-x-8 gap-y-4 font-[family-name:var(--font-display)] sm:grid-cols-3">
          <div><dt className="text-sm text-muted">Tháng<span className="sr-only">:</span></dt>{" "}<dd className="display-face mt-1 text-[length:var(--text-title)]">{monthly ?? UNCONFIRMED}</dd></div>
          <div><dt className="text-sm text-muted">Năm<span className="sr-only">:</span></dt>{" "}<dd className="display-face mt-1 text-[length:var(--text-title)]">{annual ?? UNCONFIRMED}</dd></div>
          <div><dt className="text-sm text-muted">Thương lượng<span className="sr-only">:</span></dt>{" "}<dd className="mt-1"><TriValue value={job.salaryNegotiable} /></dd></div>
        </dl>
      </Section>
      <Section id="yeu-cau" title="Yêu cầu">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-[family-name:var(--font-display)] text-base">
          <dt className="text-muted">Tiếng Nhật</dt><dd>{level}{job.jpNote && <>, <span lang="ja">{job.jpNote}</span></>}</dd>
          <dt className="text-muted">Kinh nghiệm</dt><dd>{exp}{job.experienceNote && <>, <span lang="ja">{job.experienceNote}</span></>}</dd>
          <dt className="text-muted">Kỹ năng</dt><dd>{skills.join(", ") || UNCONFIRMED}</dd>
          <dt className="text-muted">Bằng lái</dt><dd><TriValue value={job.driverLicenseRequired} yes="Bắt buộc" no="Không bắt buộc" /></dd>
        </dl>
        {block("requirements")}
      </Section>
      <Section id="mo-ta" title="Mô tả công việc">{has("description") ? block("description") : <p>{UNCONFIRMED}</p>}</Section>
      <Section id="dieu-kien" title="Điều kiện làm việc">
        {sub("Giờ làm", "workingHours")}{sub("Ngày nghỉ", "holidays")}{sub("Tăng ca", "overtime")}
        {!has("workingHours") && !has("holidays") && !has("overtime") && <p>{UNCONFIRMED}</p>}
      </Section>
      <Section id="quyen-loi" title="Quyền lợi">
        <ul className="grid gap-x-8 font-[family-name:var(--font-display)] text-base sm:grid-cols-2">
          {catalog.benefits.map((b) => (
            <li key={b.slug} className="flex min-h-11 items-center justify-between gap-2 border-b border-rule py-2">
              <span>{b.nameVi}</span><TriValue value={job.benefits[b.slug] ?? null} />
            </li>
          ))}
          <li className="flex min-h-11 items-center justify-between gap-2 border-b border-rule py-2">
            <span>Xe công ty</span><TriValue value={job.companyCarProvided} />
          </li>
        </ul>
        {block("benefitsNote")}
      </Section>
      <Section id="phong-van" title="Lịch phỏng vấn"><Interviews events={interviews} /></Section>
    </div>
  );
}
