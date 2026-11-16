import { UNCONFIRMED, salaryLines } from "@/lib/salary";
import type { Catalog, ContentField, InterviewEvent, Job } from "@/lib/types";
import BilingualBlock from "./BilingualBlock";
import Interviews from "./Interviews";
import TriValue from "./TriValue";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
    <h2 id={id} className="text-lg font-bold text-navy">{title}</h2>
    {children}
  </section>
);

export default function JobDetailFull({ job, catalog, interviews }: { job: Job; catalog: Catalog; interviews: InterviewEvent[] }) {
  const { monthly, annual } = salaryLines(job);
  const block = (f: ContentField) => <BilingualBlock text={job.content[f]} status={job.translationStatus} />;
  const skills = catalog.skills.filter((s) => job.skillIds.includes(s.id)).map((s) => s.name);
  const level = job.jpLevel == null ? UNCONFIRMED : job.jpLevel === "none" ? "Không yêu cầu" : job.jpLevel;
  const exp = job.experienceYearsMin == null ? UNCONFIRMED : `≥${job.experienceYearsMin} năm`;
  const has = (f: ContentField) => !!(job.content[f].ja || job.content[f].vi);
  const sub = (label: string, f: ContentField) =>
    has(f) && (<div><h3 className="font-semibold">{label}</h3>{block(f)}</div>);
  return (
    <div className="space-y-4">
      <Section id="luong" title="Lương & thu nhập">
        <p>Tháng: {monthly ?? UNCONFIRMED}</p>
        <p>Năm: {annual ?? UNCONFIRMED}</p>
        <p>Thương lượng: <TriValue value={job.salaryNegotiable} /></p>
      </Section>
      <Section id="yeu-cau" title="Yêu cầu">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="font-semibold">Tiếng Nhật</dt><dd>{level}{job.jpNote && <> · <span lang="ja">{job.jpNote}</span></>}</dd>
          <dt className="font-semibold">Kinh nghiệm</dt><dd>{exp}{job.experienceNote && <> · <span lang="ja">{job.experienceNote}</span></>}</dd>
          <dt className="font-semibold">Kỹ năng</dt><dd>{skills.join(", ") || UNCONFIRMED}</dd>
          <dt className="font-semibold">Bằng lái</dt><dd><TriValue value={job.driverLicenseRequired} yes="Bắt buộc" no="Không bắt buộc" /></dd>
        </dl>
        {block("requirements")}
      </Section>
      <Section id="mo-ta" title="Mô tả công việc">{has("description") ? block("description") : <p>{UNCONFIRMED}</p>}</Section>
      <Section id="dieu-kien" title="Điều kiện làm việc">
        {sub("Giờ làm", "workingHours")}{sub("Ngày nghỉ", "holidays")}{sub("Tăng ca", "overtime")}
        {!has("workingHours") && !has("holidays") && !has("overtime") && <p>{UNCONFIRMED}</p>}
      </Section>
      <Section id="quyen-loi" title="Quyền lợi">
        <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {catalog.benefits.map((b) => (
            <li key={b.slug} className="flex justify-between gap-2 border-b border-slate-100 py-1">
              <span>{b.nameVi}</span><TriValue value={job.benefits[b.slug] ?? null} />
            </li>
          ))}
          <li className="flex justify-between gap-2 border-b border-slate-100 py-1">
            <span>Xe công ty</span><TriValue value={job.companyCarProvided} />
          </li>
        </ul>
        {block("benefitsNote")}
      </Section>
      <Section id="phong-van" title="Lịch phỏng vấn"><Interviews events={interviews} /></Section>
    </div>
  );
}
