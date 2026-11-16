import { jaSourceHash, snake, CONTENT_FIELDS, type Raw } from "@/lib/admin/job-input";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ContentField, InterviewEvent, Job } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const triRaw = (v: boolean | null) => (v === true ? "yes" : v === false ? "no" : "");
const manStr = (y: number | null) => (y == null ? "" : String(y / 10_000));

export type AdminJob = { row: Row; job: Job; interviews: InterviewEvent[]; raw: Raw; sourceChanged: boolean };

export async function loadAdminJob(id: number): Promise<AdminJob | null> {
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("jobs")
    .select("*, job_prefectures(prefecture_id), job_occupations(occupation_id), job_skills(skill_id), job_benefits(value, benefits(slug)), interview_events(*)")
    .eq("id", id).maybeSingle();
  if (error) { console.error("[admin/job-load]", error.code, error.message); throw new Error("Không tải được tin"); }
  if (!data) return null;
  const r = data as Row;
  const benefits: Record<string, boolean> = {};
  for (const b of r.job_benefits) benefits[b.benefits.slug] = b.value;
  const content = Object.fromEntries(CONTENT_FIELDS.map((f) => [f, { ja: r[snake(f + "Ja")], vi: r[snake(f + "Vi")] }])) as Record<ContentField, { ja: string | null; vi: string | null }>;
  const job: Job = {
    id: r.id, code: r.code, slug: r.slug, status: r.status, isDemo: r.is_demo, publishedAt: r.published_at, updatedAt: r.updated_at,
    validThrough: r.valid_through, titleVi: r.title_vi, titleJa: r.title_ja, employerName: r.employer_name,
    locationDetailJa: r.location_detail_ja,
    prefectureIds: r.job_prefectures.map((x: Row) => x.prefecture_id), occupationIds: r.job_occupations.map((x: Row) => x.occupation_id),
    skillIds: r.job_skills.map((x: Row) => x.skill_id), benefits,
    monthlyMinYen: r.monthly_min_yen, monthlyMaxYen: r.monthly_max_yen, annualMinYen: r.annual_min_yen, annualMaxYen: r.annual_max_yen,
    salaryNegotiable: r.salary_negotiable, salarySourceText: r.salary_source_text, jpLevel: r.jp_level, jpNote: r.jp_note,
    experienceYearsMin: r.experience_years_min, experienceNote: r.experience_note,
    driverLicenseRequired: r.driver_license_required, companyCarProvided: r.company_car_provided,
    content, translationStatus: r.translation_status,
  };
  const interviews: InterviewEvent[] = r.interview_events
    .map((e: Row): InterviewEvent => ({ id: e.id, jobId: e.job_id, startsAt: e.starts_at, endsAt: e.ends_at, format: e.format, publicNote: e.public_note, status: e.status }))
    .sort((a: InterviewEvent, b: InterviewEvent) => a.startsAt.localeCompare(b.startsAt));
  const raw: Raw = {
    code: job.code, slug: job.slug, status: job.status, titleVi: job.titleVi, titleJa: job.titleJa,
    employerName: job.employerName ?? "", locationDetailJa: job.locationDetailJa,
    prefectureIds: job.prefectureIds.map(String), occupationIds: job.occupationIds.map(String), skillIds: job.skillIds.map(String),
    monthlyMinMan: manStr(job.monthlyMinYen), monthlyMaxMan: manStr(job.monthlyMaxYen),
    annualMinMan: manStr(job.annualMinYen), annualMaxMan: manStr(job.annualMaxYen),
    salaryNegotiable: triRaw(job.salaryNegotiable), salarySourceText: job.salarySourceText ?? "",
    jpLevel: job.jpLevel ?? "", jpNote: job.jpNote ?? "", experienceYearsMin: job.experienceYearsMin == null ? "" : String(job.experienceYearsMin),
    experienceNote: job.experienceNote ?? "", driverLicenseRequired: triRaw(job.driverLicenseRequired), companyCarProvided: triRaw(job.companyCarProvided),
    validThrough: job.validThrough ? new Date(Date.parse(job.validThrough) + 9 * 3600e3).toISOString().slice(0, 10) : "",
    translationStatus: job.translationStatus,
  };
  for (const [slug, v] of Object.entries(benefits)) raw[`benefit.${slug}`] = v ? "yes" : "no";
  for (const f of CONTENT_FIELDS) { raw[f + "Ja"] = content[f].ja ?? ""; raw[f + "Vi"] = content[f].vi ?? ""; }
  const sourceChanged = !!r.translation_source_hash && r.translation_source_hash !== jaSourceHash((f) => content[f].ja);
  return { row: r, job, interviews, raw, sourceChanged };
}
