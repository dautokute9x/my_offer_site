import { afterEach, describe, expect, it, vi } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { parseFilters } from "@/lib/filters";
import { siteDefaults } from "@/lib/site-defaults";

vi.mock("@/lib/data/supabase", () => ({
  searchJobs: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 12, pageCount: 0 })),
  getSiteSettings: vi.fn(),
}));
import * as sb from "@/lib/data/supabase";
import { getSiteSettings, isDemoMode, searchJobs } from "@/lib/data";

const empty = parseFilters({}, demoCatalog);
afterEach(() => vi.unstubAllEnvs());

describe("lib/data chọn nguồn", () => {
  it("không có env: demo", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(isDemoMode()).toBe(true);
    expect((await searchJobs(empty)).total).toBeGreaterThan(0);
    expect(sb.searchJobs).not.toHaveBeenCalled();
  });
  it("có env: gọi sb.searchJobs", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://x");
    expect((await searchJobs(empty)).total).toBe(0);
    expect(sb.searchJobs).toHaveBeenCalledOnce();
  });
  it("getSiteSettings gộp với mặc định; thiếu dòng thì trả mặc định", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://x");
    vi.mocked(sb.getSiteSettings).mockResolvedValueOnce({ brandName: "ABC" });
    expect(await getSiteSettings()).toEqual({ ...siteDefaults, brandName: "ABC" });
    vi.mocked(sb.getSiteSettings).mockResolvedValueOnce(null);
    expect(await getSiteSettings()).toEqual(siteDefaults);
  });
});
