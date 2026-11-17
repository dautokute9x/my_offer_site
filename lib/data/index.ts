import { unstable_cache } from "next/cache";
import { cache } from "react";
import { demoCatalog } from "@/lib/demo/catalog";
import type { JobFilters } from "@/lib/filters";
import { siteDefaults, type SiteSettings } from "@/lib/site-defaults";
import * as demo from "./demo";
import * as sb from "./supabase";

export type { JobSummary } from "@/lib/filters";

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// cache(): nhớ theo request (vd. trang chi tiết gọi getJobByCode ở generateMetadata và ở trang chỉ tốn một RPC).
// Danh mục + cài đặt hiếm khi đổi: nhớ giữa các request 5 phút; admin lưu thì updateTag(SITE_DATA_TAG) xóa ngay.
export const SITE_DATA_TAG = "site-data";
const shared = <T,>(key: string, fn: () => Promise<T>) => unstable_cache(fn, [key], { tags: [SITE_DATA_TAG], revalidate: 300 })();

export const getCatalog = cache(async () => (isDemoMode() ? demoCatalog : shared("catalog", sb.getCatalog)));

export const searchJobs = cache(async (f: JobFilters, opts: { simulateError?: boolean; now?: Date } = {}) => {
  if (opts.simulateError && isDemoMode()) throw new Error("Lỗi tải dữ liệu (demo_error)");
  return isDemoMode() ? demo.searchJobs(f, { now: opts.now }) : sb.searchJobs(f, { now: opts.now });
});

export const getJobByCode = cache((...a: Parameters<typeof demo.getJobByCode>) => (isDemoMode() ? demo.getJobByCode(...a) : sb.getJobByCode(...a)));
export const getRelatedJobs = cache((...a: Parameters<typeof demo.getRelatedJobs>) => (isDemoMode() ? demo.getRelatedJobs(...a) : sb.getRelatedJobs(...a)));
export const listUpcomingInterviews = cache((...a: Parameters<typeof demo.listUpcomingInterviews>) =>
  isDemoMode() ? demo.listUpcomingInterviews(...a) : sb.listUpcomingInterviews(...a));
export const countOpenJobsByGroup = cache(() => (isDemoMode() ? demo.countOpenJobsByGroup() : sb.countOpenJobsByGroup()));

export const getSiteSettings = cache(async (): Promise<SiteSettings> =>
  isDemoMode() ? siteDefaults : { ...siteDefaults, ...(await shared("site-settings", sb.getSiteSettings)) });
