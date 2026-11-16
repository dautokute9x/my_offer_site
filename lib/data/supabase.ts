import { createPublicSupabase } from "@/lib/supabase/public";
import type { JobFilters, JobSummary } from "@/lib/filters";
import type { SiteSettings } from "@/lib/site-defaults";
import type { Catalog, InterviewEvent, Job } from "@/lib/types";

type Opts = { now?: Date };
type Page = { items: JobSummary[]; total: number; page: number; pageSize: 12; pageCount: number };

function fail(error: unknown): never {
  // Chỉ log code/message của lỗi Supabase, không log tham số truy vấn (có thể chứa từ khóa người dùng).
  const e = error as { code?: string; message?: string };
  console.error("[data/supabase]", e?.code, e?.message);
  throw new Error("Không tải được dữ liệu");
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await createPublicSupabase().rpc(fn, args);
  if (error) fail(error);
  return data as T;
}

// Tên khóa đúng như search_jobs(p jsonb) đọc trong 0002_public_api.sql.
export function toSearchParams(f: JobFilters, now?: Date): Record<string, unknown> {
  return {
    q: f.q, prefectures: f.prefectures, groups: f.groups, occupations: f.occupations, benefits: f.benefits,
    salaryMinMan: f.salaryMinMan, salaryMaxMan: f.salaryMaxMan, period: f.period, jpLevel: f.jpLevel,
    maxExperience: f.maxExperience, hasInterview: f.hasInterview, sort: f.sort, page: f.page,
    ...(now && { now: now.toISOString() }),
  };
}

export const searchJobs = (f: JobFilters, opts: Opts = {}) =>
  rpc<Page>("search_jobs", { p: toSearchParams(f, opts.now) });

export const getJobByCode = (code: string) =>
  rpc<(Job & { interviews: InterviewEvent[] }) | null>("get_job", { p_code: code });

export const getRelatedJobs = (job: Job, limit = 4) =>
  rpc<JobSummary[]>("related_jobs", { p_job_id: job.id, p_limit: limit });

export function listUpcomingInterviews(
  o: { from?: string; to?: string; prefectures: string[]; occupations: string[] },
  opts: Opts = {},
) {
  return rpc<Array<InterviewEvent & { job: Job }>>("upcoming_interviews", {
    p: { from: o.from, to: o.to, prefectures: o.prefectures, occupations: o.occupations, ...(opts.now && { now: opts.now.toISOString() }) },
  });
}

export const countOpenJobsByGroup = () => rpc<Record<string, number>>("open_job_counts_by_group");

async function table<T>(name: string, ...order: string[]): Promise<T[]> {
  const { data, error } = await order.reduce((q, c) => q.order(c), createPublicSupabase().from(name).select("*"));
  if (error) fail(error);
  return data as T[];
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function getCatalog(): Promise<Catalog> {
  const [p, g, o, s, b] = await Promise.all([
    table<Row>("prefectures", "id"), table<Row>("occupation_groups", "sort", "id"), table<Row>("occupations", "id"),
    table<Row>("skills", "id"), table<Row>("benefits", "sort", "id"),
  ]);
  return {
    prefectures: p.map((r) => ({ id: r.id, code: r.code, nameJa: r.name_ja, nameVi: r.name_vi, romaji: r.romaji, region: r.region, aliases: r.aliases })),
    groups: g.map((r) => ({ id: r.id, slug: r.slug, nameVi: r.name_vi, nameJa: r.name_ja, sort: r.sort })),
    occupations: o.map((r) => ({ id: r.id, groupId: r.group_id, slug: r.slug, nameVi: r.name_vi, nameJa: r.name_ja, aliases: r.aliases })),
    skills: s.map((r) => ({ id: r.id, name: r.name, aliases: r.aliases })),
    benefits: b.map((r) => ({ id: r.id, slug: r.slug, nameVi: r.name_vi, nameJa: r.name_ja, featured: r.featured, sort: r.sort })),
  };
}

// Thiếu dòng id=1 thì trả null; index.ts gộp với siteDefaults.
export async function getSiteSettings(): Promise<Partial<SiteSettings> | null> {
  const { data, error } = await createPublicSupabase().from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (error) fail(error);
  return (data?.data as Partial<SiteSettings> | undefined) ?? null;
}
