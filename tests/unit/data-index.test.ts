import { afterEach, describe, expect, it, vi } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { parseFilters } from "@/lib/filters";
import { siteDefaults } from "@/lib/site-defaults";

vi.mock("@/lib/data/supabase", () => ({
  searchJobs: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 12, pageCount: 0 })),
  getCatalog: vi.fn(async () => "SB"),
  getJobByCode: vi.fn(async () => "SB"),
  getRelatedJobs: vi.fn(async () => "SB"),
  listUpcomingInterviews: vi.fn(async () => "SB"),
  countOpenJobsByGroup: vi.fn(async () => "SB"),
  getSiteSettings: vi.fn(),
}));
import * as sb from "@/lib/data/supabase";
import * as d from "@/lib/data";

const empty = parseFilters({}, demoCatalog);
const demoMode = () => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
const sbMode = () => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://x");
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("lib/data chọn nguồn", () => {
  it("searchJobs", async () => {
    demoMode();
    expect(d.isDemoMode()).toBe(true);
    expect((await d.searchJobs(empty)).total).toBeGreaterThan(0);
    expect(sb.searchJobs).not.toHaveBeenCalled();
    sbMode();
    expect((await d.searchJobs(empty)).total).toBe(0);
    expect(sb.searchJobs).toHaveBeenCalledOnce();
  });
  it("getCatalog", async () => {
    demoMode();
    expect(await d.getCatalog()).toBe(demoCatalog);
    expect(sb.getCatalog).not.toHaveBeenCalled();
    sbMode();
    expect(await d.getCatalog()).toBe("SB");
  });
  it("getJobByCode", async () => {
    demoMode();
    expect((await d.getJobByCode("00412"))?.code).toBe("00412");
    expect(sb.getJobByCode).not.toHaveBeenCalled();
    sbMode();
    expect(await d.getJobByCode("00412")).toBe("SB");
    expect(sb.getJobByCode).toHaveBeenCalledWith("00412");
  });
  it("getRelatedJobs", async () => {
    demoMode();
    const job = (await d.getJobByCode("00412"))!;
    expect(Array.isArray(await d.getRelatedJobs(job))).toBe(true);
    expect(sb.getRelatedJobs).not.toHaveBeenCalled();
    sbMode();
    expect(await d.getRelatedJobs(job, 2)).toBe("SB");
    expect(sb.getRelatedJobs).toHaveBeenCalledWith(job, 2);
  });
  it("listUpcomingInterviews", async () => {
    const o = { prefectures: [], occupations: [] };
    demoMode();
    expect(Array.isArray(await d.listUpcomingInterviews(o))).toBe(true);
    expect(sb.listUpcomingInterviews).not.toHaveBeenCalled();
    sbMode();
    expect(await d.listUpcomingInterviews(o)).toBe("SB");
  });
  it("countOpenJobsByGroup", async () => {
    demoMode();
    expect(Object.keys(await d.countOpenJobsByGroup())).toEqual(demoCatalog.groups.map((g) => g.slug));
    expect(sb.countOpenJobsByGroup).not.toHaveBeenCalled();
    sbMode();
    expect(await d.countOpenJobsByGroup()).toBe("SB");
  });
  it("getSiteSettings: demo, gộp mặc định, thiếu dòng", async () => {
    demoMode();
    expect(await d.getSiteSettings()).toEqual(siteDefaults);
    expect(sb.getSiteSettings).not.toHaveBeenCalled();
    sbMode();
    vi.mocked(sb.getSiteSettings).mockResolvedValueOnce({ brandName: "ABC" });
    expect(await d.getSiteSettings()).toEqual({ ...siteDefaults, brandName: "ABC" });
    vi.mocked(sb.getSiteSettings).mockResolvedValueOnce(null);
    expect(await d.getSiteSettings()).toEqual(siteDefaults);
  });
});
