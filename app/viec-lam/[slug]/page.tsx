import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalog, getJobByCode, getRelatedJobs, getSiteSettings, isDemoMode } from "@/lib/data";
import { codeFromSlugParam, jobHref } from "@/lib/filters";
import type { Job } from "@/lib/types";
import ApplicationForm from "@/components/ApplicationForm";
import ApplyBar, { ApplyButton } from "@/components/ApplyBar";
import BackToResults from "@/components/BackToResults";
import JobCard from "@/components/JobCard";
import JobDetailFull from "@/components/job/JobDetailFull";
import JobDetailPoster from "@/components/job/JobDetailPoster";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const isClosed = (j: Job) => j.status === "closed" || (!!j.validThrough && new Date(j.validThrough).getTime() < Date.now());
const description = (j: Job) => j.content.description.vi ?? j.content.description.ja;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getJobByCode(codeFromSlugParam((await params).slug));
  if (!job) return {};
  const { brandName } = await getSiteSettings();
  const title = `${job.titleVi} (${job.code}) | ${brandName}`;
  const desc = job.content.summary.vi ?? job.content.summary.ja ?? undefined;
  return {
    title: { absolute: title },
    description: desc,
    alternates: { canonical: jobHref(job) },
    openGraph: { title, description: desc, url: jobHref(job), type: "article" },
    ...(job.isDemo && { robots: { index: false, follow: false } }),
  };
}

export default async function JobPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const job = await getJobByCode(codeFromSlugParam(slug));
  if (!job) notFound();
  const sp = await searchParams;
  const poster = sp.xem === "tomtat";
  if (slug !== `${job.slug}-${job.code}`) permanentRedirect(jobHref(job) + (poster ? "?xem=tomtat" : ""));
  const [catalog, related, settings] = await Promise.all([getCatalog(), getRelatedJobs(job, 4), getSiteSettings()]);
  const closed = isClosed(job);
  const base = jobHref(job);
  const tab = (on: boolean) => `-mb-px inline-flex min-h-11 items-center border-b-4 px-1 font-semibold ${on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`;
  const places = catalog.prefectures.filter((p) => job.prefectureIds.includes(p.id));
  const jsonLd = !isDemoMode() && !job.isDemo && job.employerName && places.length && description(job) && job.publishedAt && (!closed || job.validThrough) && {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.titleVi,
    description: description(job),
    datePosted: job.publishedAt,
    validThrough: job.validThrough ?? undefined,
    hiringOrganization: { "@type": "Organization", name: job.employerName },
    jobLocation: places.map((p) => ({ "@type": "Place", address: { "@type": "PostalAddress", addressRegion: p.nameJa, addressCountry: "JP" } })),
    ...((job.monthlyMinYen ?? job.monthlyMaxYen) != null && {
      baseSalary: { "@type": "MonetaryAmount", currency: "JPY", value: { "@type": "QuantitativeValue", minValue: job.monthlyMinYen ?? undefined, maxValue: job.monthlyMaxYen ?? undefined, unitText: "MONTH" } },
    }),
  };
  return (
    <div className="space-y-10 pb-24 lg:pb-0">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <BackToResults />
      {closed && <p role="status" className="border-l-4 border-ink bg-paper-3 px-4 py-3 font-bold text-ink">Đã ngừng tuyển</p>}
      <header className="grid gap-6 border-t-4 border-ink pt-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-9">
          <p className="flex flex-wrap items-center gap-3">
            <span className="display-face text-2xl leading-none">#{job.code}</span>
            {job.isDemo && <span className="tag">Dữ liệu minh họa</span>}
          </p>
          <h1 className="mt-4 max-w-[24ch] text-[length:var(--text-display-s)]">{job.titleVi}</h1>
          <p lang="ja" className="mt-3 text-muted">{job.titleJa}</p>
          <p className="mt-2 text-ink">{places.map((p) => p.nameVi).join(", ") || "Chưa xác nhận"}{job.locationDetailJa && <>, <span lang="ja">{job.locationDetailJa}</span></>}</p>
        </div>
        {!closed && <div className="hidden lg:col-span-3 lg:flex lg:items-end lg:justify-end"><ApplyButton job={job} /></div>}
      </header>
      <nav aria-label="Chế độ xem" className="flex gap-6 border-b border-rule">
        <a href={base} aria-current={poster ? undefined : "page"} className={tab(!poster)}>Đầy đủ</a>
        <a href={`${base}?xem=tomtat`} aria-current={poster ? "page" : undefined} className={tab(poster)}>Tóm tắt</a>
      </nav>
      {poster ? <JobDetailPoster job={job} catalog={catalog} interviews={job.interviews} /> : <JobDetailFull job={job} catalog={catalog} interviews={job.interviews} />}
      {!closed && (
        <section id="ung-tuyen" aria-labelledby="ung-tuyen-h" className="well grid scroll-mt-4 gap-8 p-6 sm:p-10 lg:grid-cols-12">
          <h2 id="ung-tuyen-h" className="lg:col-span-4">Ứng tuyển</h2>
          <div className="lg:col-span-8"><ApplicationForm kind="apply" jobCode={job.code} jobTitle={job.titleVi} consentVersion={settings.consentVersion} retentionMonths={settings.retentionMonths} /></div>
        </section>
      )}
      {related.length > 0 && (
        <section aria-labelledby="lien-quan" className="space-y-6">
          <h2 id="lien-quan" className="opens">Việc làm liên quan</h2>
          <div className="border-b border-rule">{related.map((r) => <JobCard key={r.id} job={r} catalog={catalog} />)}</div>
        </section>
      )}
      {!closed && <ApplyBar job={job} />}
    </div>
  );
}
