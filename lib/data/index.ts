import { demoCatalog } from "@/lib/demo/catalog";
import type { JobFilters } from "@/lib/filters";
import { siteDefaults, type SiteSettings } from "@/lib/site-defaults";
import * as demo from "./demo";
import * as sb from "./supabase";

export type { JobSummary } from "@/lib/filters";

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const getCatalog = async () => (isDemoMode() ? demoCatalog : sb.getCatalog());

export async function searchJobs(f: JobFilters, opts: { simulateError?: boolean; now?: Date } = {}) {
  if (opts.simulateError && isDemoMode()) throw new Error("Lỗi tải dữ liệu (demo_error)");
  return isDemoMode() ? demo.searchJobs(f, { now: opts.now }) : sb.searchJobs(f, { now: opts.now });
}

export const getJobByCode = (...a: Parameters<typeof demo.getJobByCode>) => (isDemoMode() ? demo.getJobByCode(...a) : sb.getJobByCode(...a));
export const getRelatedJobs = (...a: Parameters<typeof demo.getRelatedJobs>) => (isDemoMode() ? demo.getRelatedJobs(...a) : sb.getRelatedJobs(...a));
export const listUpcomingInterviews = (...a: Parameters<typeof demo.listUpcomingInterviews>) =>
  isDemoMode() ? demo.listUpcomingInterviews(...a) : sb.listUpcomingInterviews(...a);
export const countOpenJobsByGroup = () => (isDemoMode() ? demo.countOpenJobsByGroup() : sb.countOpenJobsByGroup());

export async function getSiteSettings(): Promise<SiteSettings> {
  return isDemoMode() ? siteDefaults : { ...siteDefaults, ...(await sb.getSiteSettings()) };
}
