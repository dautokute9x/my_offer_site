import type { MetadataRoute } from "next";
import { getCatalog, isDemoMode, searchJobs } from "@/lib/data";
import { listSitemapJobs } from "@/lib/data/supabase";
import { jobHref, parseFilters } from "@/lib/filters";

export const revalidate = 3600;

async function demoJobs() {
  const catalog = await getCatalog();
  const jobs = [];
  // Duyệt từng trang searchJobs (tin đang tuyển); bỏ tin demo.
  for (let page = 1, count = 1; page <= count; page++) {
    const r = await searchJobs({ ...parseFilters({}, catalog), page });
    count = r.pageCount;
    jobs.push(...r.items.filter((j) => !j.isDemo));
  }
  return jobs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = isDemoMode() ? await demoJobs() : await listSitemapJobs();
  const paths = ["/", "/viec-lam", "/lich-phong-van", "/gioi-thieu", "/lien-he", "/chinh-sach-bao-mat", "/dieu-khoan"];
  return [
    ...paths.map((p) => ({ url: p })),
    ...jobs.map((j) => ({ url: jobHref(j), lastModified: j.updatedAt })),
  ].map((e) => ({ ...e, url: new URL(e.url, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").href }));
}
