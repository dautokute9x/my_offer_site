import { demoCatalog } from "@/lib/demo/catalog";
import { buildDemoJobs } from "@/lib/demo/jobs";
import type { JobFilters, JobSummary } from "@/lib/filters";
import { normCode, normText } from "@/lib/normalize";
import { jstDateKey } from "@/lib/time";
import type { InterviewEvent, InterviewWithJobSummary, Job, JpLevel } from "@/lib/types";

export const PAGE_SIZE = 12;
type Opts = { now?: Date };

const RANK: Record<JpLevel, number> = { none: 0, N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
const MAN = 10_000;

function load(now = new Date()) {
  const { jobs, interviews } = buildDemoJobs(now);
  const t = now.getTime();
  const open = (j: Job) => j.status === "published" && (!j.validThrough || Date.parse(j.validThrough) > t);
  const upcoming = (jobId: number) =>
    interviews.filter((i) => i.jobId === jobId && i.status === "scheduled" && Date.parse(i.startsAt) > t)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { jobs, interviews, open, upcoming, now };
}

function searchText(j: Job): string {
  const c = demoCatalog;
  const parts = [
    j.code, j.titleVi, j.titleJa, j.locationDetailJa,
    ...c.prefectures.filter((p) => j.prefectureIds.includes(p.id)).flatMap((p) => p.aliases),
    ...c.occupations.filter((o) => j.occupationIds.includes(o.id)).flatMap((o) => [o.nameVi, o.nameJa, ...o.aliases]),
    ...c.skills.filter((s) => j.skillIds.includes(s.id)).flatMap((s) => [s.name, ...s.aliases]),
  ];
  return normText(parts.join(" "));
}

// Nhóm nghề đã chọn + slug nghề đã chọn -> tập id nghề.
function occupationIdSet(groups: string[], slugs: string[]): number[] {
  const gids = demoCatalog.groups.filter((g) => groups.includes(g.slug)).map((g) => g.id);
  return demoCatalog.occupations.filter((o) => gids.includes(o.groupId) || slugs.includes(o.slug)).map((o) => o.id);
}

function salaryOf(j: Job, period: "month" | "year") {
  const [a, b] = period === "month" ? [j.monthlyMinYen, j.monthlyMaxYen] : [j.annualMinYen, j.annualMaxYen];
  return a == null && b == null ? null : { lo: a ?? b!, hi: b ?? a! };
}

function matches(j: Job, f: JobFilters): boolean {
  const c = demoCatalog;
  const tokens = normText(f.q).replace(/^#/, "").split(" ").filter(Boolean);
  if (tokens.length) {
    const text = searchText(j);
    if (!tokens.every((t) => text.includes(t))) return false;
  }
  if (f.prefectures.length) {
    const ids = c.prefectures.filter((p) => f.prefectures.includes(p.code)).map((p) => p.id);
    if (!j.prefectureIds.some((id) => ids.includes(id))) return false;
  }
  if (f.groups.length || f.occupations.length) {
    const ids = occupationIdSet(f.groups, f.occupations);
    if (!j.occupationIds.some((id) => ids.includes(id))) return false;
  }
  if (f.salaryMinMan != null || f.salaryMaxMan != null) {
    const s = salaryOf(j, f.period);
    if (!s) return false;
    if (f.salaryMinMan != null && s.hi < f.salaryMinMan * MAN) return false;
    if (f.salaryMaxMan != null && s.lo > f.salaryMaxMan * MAN) return false;
  }
  if (f.jpLevel && j.jpLevel && RANK[j.jpLevel] > RANK[f.jpLevel]) return false;
  if (f.maxExperience != null && j.experienceYearsMin != null && j.experienceYearsMin > f.maxExperience) return false;
  return f.benefits.every((b) => j.benefits[b] === true);
}

const summarize = (j: Job, upcoming: (id: number) => InterviewEvent[]): JobSummary => ({ ...j, nextInterview: upcoming(j.id)[0] ?? null });

export async function searchJobs(f: JobFilters, opts: Opts = {}) {
  const { jobs, open, upcoming } = load(opts.now);
  const code = normCode(f.q);
  let items = jobs.filter((j) => open(j) && matches(j, f)).map((j) => summarize(j, upcoming));
  if (f.hasInterview) items = items.filter((j) => j.nextInterview);
  const pay = (j: Job) => {
    const s = salaryOf(j, f.period);
    return s ? s.hi : null;
  };
  const cmp = (a: JobSummary, b: JobSummary): number => {
    if (code) {
      const d = Number(normCode(b.code) === code) - Number(normCode(a.code) === code);
      if (d) return d;
    }
    if (f.sort === "pv") {
      const x = a.nextInterview?.startsAt, y = b.nextInterview?.startsAt;
      if (x !== y) return x === undefined ? 1 : y === undefined ? -1 : x! < y! ? -1 : 1;
    } else if (f.sort === "luong") {
      const x = pay(a), y = pay(b);
      if (x !== y) return x == null ? 1 : y == null ? -1 : y - x;
    } else if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.code.localeCompare(b.code);
  };
  items.sort(cmp);
  const total = items.length;
  return {
    items: items.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE),
    total, page: f.page, pageSize: PAGE_SIZE as 12, pageCount: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getJobByCode(code: string) {
  const { jobs, upcoming } = load();
  const j = jobs.find((x) => normCode(x.code) === normCode(code));
  return j && j.status !== "draft" ? { ...j, interviews: upcoming(j.id) } : null;
}

export async function getRelatedJobs(job: Job, limit = 4) {
  const { jobs, open, upcoming } = load();
  const score = (j: Job) =>
    2 * j.occupationIds.filter((o) => job.occupationIds.includes(o)).length + j.prefectureIds.filter((p) => job.prefectureIds.includes(p)).length;
  return jobs
    .filter((j) => j.id !== job.id && open(j) && score(j) > 0)
    .sort((a, b) => score(b) - score(a) || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map((j) => summarize(j, upcoming));
}

export async function listUpcomingInterviews(
  o: { from?: string; to?: string; prefectures: string[]; occupations: string[] },
  opts: Opts = {},
) {
  const { jobs, interviews, open, now } = load(opts.now);
  const pids = demoCatalog.prefectures.filter((p) => o.prefectures.includes(p.code)).map((p) => p.id);
  const oids = occupationIdSet([], o.occupations);
  // Như upcoming_interviews: không có `to` thì đến hết hôm nay + 60 ngày (JST); tối đa 500 lịch.
  const to = o.to || jstDateKey(new Date(now.getTime() + 60 * 86_400_000).toISOString());
  const out: InterviewWithJobSummary[] = [];
  for (const i of interviews) {
    const job = jobs.find((j) => j.id === i.jobId)!;
    const day = jstDateKey(i.startsAt);
    if (i.status !== "scheduled" || Date.parse(i.startsAt) <= now.getTime() || !open(job)) continue;
    if ((o.from && day < o.from) || day > to) continue;
    if (pids.length && !job.prefectureIds.some((p) => pids.includes(p))) continue;
    if (o.occupations.length && !job.occupationIds.some((x) => oids.includes(x))) continue;
    const { id, code, slug, status, isDemo, titleVi, titleJa, prefectureIds, occupationIds } = job;
    out.push({ ...i, job: { id, code, slug, status, isDemo, titleVi, titleJa, prefectureIds, occupationIds } });
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 500);
}

export async function countOpenJobsByGroup() {
  const { jobs, open } = load();
  return Object.fromEntries(
    demoCatalog.groups.map((g) => {
      const ids = demoCatalog.occupations.filter((o) => o.groupId === g.id).map((o) => o.id);
      return [g.slug, jobs.filter((j) => open(j) && j.occupationIds.some((x) => ids.includes(x))).length];
    }),
  );
}
