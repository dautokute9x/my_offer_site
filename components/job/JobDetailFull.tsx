import { salaryLines } from "@/lib/salary";
import type { Catalog, ContentField, InterviewEvent, Job } from "@/lib/types";
import { catalogName } from "@/lib/i18n/catalog";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";
import BilingualBlock from "./BilingualBlock";
import Interviews from "./Interviews";
import TriValue from "./TriValue";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="grid gap-4 border-t border-rule-2 pt-6 lg:grid-cols-12 lg:gap-8">
    <h2 id={id} className="text-[length:var(--text-title)] lg:col-span-4">{title}</h2>
    <div className="prose-body max-w-none space-y-4 lg:col-span-8">{children}</div>
  </section>
);

export default async function JobDetailFull({ job, catalog, interviews }: { job: Job; catalog: Catalog; interviews: InterviewEvent[] }) {
  const { lang, t } = await getT();
  const d = t.detail, UNCONFIRMED = t.common.unconfirmed;
  const { monthly, annual } = salaryLines(job, t.salary);
  const block = (f: ContentField) => <BilingualBlock text={job.content[f]} status={job.translationStatus} />;
  const skills = catalog.skills.filter((s) => job.skillIds.includes(s.id)).map((s) => s.name);
  const level = job.jpLevel == null ? UNCONFIRMED : job.jpLevel === "none" ? d.jpNone : job.jpLevel;
  const exp = job.experienceYearsMin == null ? UNCONFIRMED : fmt(d.expFrom, { n: job.experienceYearsMin });
  const has = (f: ContentField) => !!(job.content[f].ja || job.content[f].vi);
  const sub = (label: string, f: ContentField) =>
    has(f) && (<div><h3 className="text-lg">{label}</h3><div className="mt-1">{block(f)}</div></div>);
  return (
    <div className="space-y-10">
      <Section id="luong" title={d.salaryTitle}>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <div><dt className="text-sm text-muted">{d.month}<span className="sr-only">:</span></dt>{" "}<dd className="display-face mt-1 text-[length:var(--text-title)]">{monthly ?? UNCONFIRMED}</dd></div>
          <div><dt className="text-sm text-muted">{d.year}<span className="sr-only">:</span></dt>{" "}<dd className="display-face mt-1 text-[length:var(--text-title)]">{annual ?? UNCONFIRMED}</dd></div>
          <div><dt className="text-sm text-muted">{d.negotiable}<span className="sr-only">:</span></dt>{" "}<dd className="mt-1"><TriValue value={job.salaryNegotiable} /></dd></div>
        </dl>
      </Section>
      <Section id="yeu-cau" title={d.requirements}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
          <dt className="text-muted">{d.japanese}</dt><dd>{level}{job.jpNote && <>, <span lang="ja">{job.jpNote}</span></>}</dd>
          <dt className="text-muted">{d.experience}</dt><dd>{exp}{job.experienceNote && <>, <span lang="ja">{job.experienceNote}</span></>}</dd>
          <dt className="text-muted">{d.skills}</dt><dd>{skills.join(", ") || UNCONFIRMED}</dd>
          <dt className="text-muted">{d.license}</dt><dd><TriValue value={job.driverLicenseRequired} yes={d.required} no={d.notRequired} /></dd>
        </dl>
        {block("requirements")}
      </Section>
      <Section id="mo-ta" title={d.description}>{has("description") ? block("description") : <p>{UNCONFIRMED}</p>}</Section>
      <Section id="dieu-kien" title={d.conditions}>
        {sub(d.workingHours, "workingHours")}{sub(d.holidays, "holidays")}{sub(d.overtime, "overtime")}
        {!has("workingHours") && !has("holidays") && !has("overtime") && <p>{UNCONFIRMED}</p>}
      </Section>
      <Section id="quyen-loi" title={d.benefits}>
        <ul className="grid gap-x-8 text-base sm:grid-cols-2">
          {catalog.benefits.map((b) => (
            <li key={b.slug} className="flex min-h-11 items-center justify-between gap-2 border-b-2 border-accent-2/30 py-2">
              <span>{catalogName(lang, t, "benefits", b)}</span><TriValue value={job.benefits[b.slug] ?? null} />
            </li>
          ))}
          <li className="flex min-h-11 items-center justify-between gap-2 border-b-2 border-accent-2/30 py-2">
            <span>{d.companyCar}</span><TriValue value={job.companyCarProvided} />
          </li>
        </ul>
        {block("benefitsNote")}
      </Section>
      <Section id="phong-van" title={d.interviews}><Interviews events={interviews} /></Section>
    </div>
  );
}
