import { demoCatalog } from "@/lib/demo/catalog";
import type { JobFilters } from "@/lib/filters";
import { siteDefaults, type SiteSettings } from "@/lib/site-defaults";
import * as demo from "./demo";

export type { JobSummary } from "@/lib/filters";

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// Giai đoạn 2: nhánh Supabase cùng chữ ký, chọn theo isDemoMode().
export const getCatalog = async () => demoCatalog;

export async function searchJobs(f: JobFilters, opts: { simulateError?: boolean; now?: Date } = {}) {
  if (opts.simulateError && isDemoMode()) throw new Error("Lỗi tải dữ liệu (demo_error)");
  return demo.searchJobs(f, { now: opts.now });
}

export const getJobByCode = demo.getJobByCode;
export const getRelatedJobs = demo.getRelatedJobs;
export const listUpcomingInterviews = demo.listUpcomingInterviews;
export const countOpenJobsByGroup = demo.countOpenJobsByGroup;
export const getSiteSettings = async (): Promise<SiteSettings> => siteDefaults;
