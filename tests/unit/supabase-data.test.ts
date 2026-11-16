import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const orders: string[] = [];
let tables: Record<string, { data: unknown; error: unknown }> = {};
let single: { data: unknown; error: unknown } = { data: null, error: null };
vi.mock("@/lib/supabase/public", () => ({
  createPublicSupabase: () => ({
    rpc,
    from: (name: string) => ({
      select: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = {
          order: (c: string) => { orders.push(`${name}.${c}`); return q; },
          then: (res: (v: unknown) => void) => res(tables[name]),
          eq: () => ({ maybeSingle: async () => single }),
        };
        return q;
      },
    }),
  }),
}));
import * as sb from "@/lib/data/supabase";
import { demoCatalog } from "@/lib/demo/catalog";
import { parseFilters } from "@/lib/filters";

const ok = (data: unknown) => ({ data, error: null });
const now = new Date("2026-01-01T00:00:00Z");
beforeEach(() => { vi.clearAllMocks(); orders.length = 0; vi.spyOn(console, "error").mockImplementation(() => {}); rpc.mockResolvedValue(ok(null)); });

describe("lib/data/supabase rpc", () => {
  it("tên RPC và tham số", async () => {
    const f = parseFilters({}, demoCatalog);
    await sb.searchJobs(f, { now });
    expect(rpc).toHaveBeenLastCalledWith("search_jobs", { p: sb.toSearchParams(f, now) });
    await sb.getJobByCode("00412");
    expect(rpc).toHaveBeenLastCalledWith("get_job", { p_code: "00412" });
    await sb.getRelatedJobs({ id: 7 } as never, 3);
    expect(rpc).toHaveBeenLastCalledWith("related_jobs", { p_job_id: 7, p_limit: 3 });
    await sb.listUpcomingInterviews({ from: "2026-01-01", to: "2026-02-01", prefectures: ["13"], occupations: ["a"] }, { now });
    expect(rpc).toHaveBeenLastCalledWith("upcoming_interviews", {
      p: { from: "2026-01-01", to: "2026-02-01", prefectures: ["13"], occupations: ["a"], now: "2026-01-01T00:00:00.000Z" },
    });
    await sb.countOpenJobsByGroup();
    expect(rpc).toHaveBeenLastCalledWith("open_job_counts_by_group", undefined);
  });
  it("lỗi rpc -> Error chuẩn", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "X", message: "boom" } });
    await expect(sb.getJobByCode("1")).rejects.toThrow("Không tải được dữ liệu");
  });
  it("toSearchParams với mảng khác rỗng", () => {
    const f = parseFilters({ tinh: "13,27", nhom: "dien", nghe: "plc-mach-dien", ql: "ky-tuc-xa" }, demoCatalog);
    const p = sb.toSearchParams(f);
    expect(p).toMatchObject({ prefectures: ["13", "27"], groups: ["dien"], occupations: ["plc-mach-dien"], benefits: ["ky-tuc-xa"] });
  });
});

describe("lib/data/supabase bảng", () => {
  const rows = {
    prefectures: [{ id: 1, code: "01", name_ja: "j", name_vi: "v", romaji: "r", region: "R", aliases: ["a"] }],
    occupation_groups: [{ id: 2, slug: "g", name_vi: "v", name_ja: "j", sort: 3 }],
    occupations: [{ id: 3, group_id: 2, slug: "o", name_vi: "v", name_ja: "j", aliases: ["x"] }],
    skills: [{ id: 4, name: "n", aliases: ["y"] }],
    benefits: [{ id: 5, slug: "b", name_vi: "v", name_ja: "j", featured: true, sort: 6 }],
  };
  it("getCatalog map snake_case -> camelCase, sắp theo sort,id", async () => {
    tables = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, ok(v)]));
    expect(await sb.getCatalog()).toEqual({
      prefectures: [{ id: 1, code: "01", nameJa: "j", nameVi: "v", romaji: "r", region: "R", aliases: ["a"] }],
      groups: [{ id: 2, slug: "g", nameVi: "v", nameJa: "j", sort: 3 }],
      occupations: [{ id: 3, groupId: 2, slug: "o", nameVi: "v", nameJa: "j", aliases: ["x"] }],
      skills: [{ id: 4, name: "n", aliases: ["y"] }],
      benefits: [{ id: 5, slug: "b", nameVi: "v", nameJa: "j", featured: true, sort: 6 }],
    });
    expect(orders).toContain("occupation_groups.sort");
    expect(orders).toContain("benefits.sort");
  });
  it("lỗi bảng -> Error chuẩn", async () => {
    tables = { ...Object.fromEntries(Object.keys(rows).map((k) => [k, ok([])])), skills: { data: null, error: { message: "x" } } };
    await expect(sb.getCatalog()).rejects.toThrow("Không tải được dữ liệu");
  });
  it("site_settings: có dòng, thiếu dòng, lỗi", async () => {
    single = ok({ data: { brandName: "A" } });
    expect(await sb.getSiteSettings()).toEqual({ brandName: "A" });
    single = ok(null);
    expect(await sb.getSiteSettings()).toBeNull();
    single = { data: null, error: { message: "x" } };
    await expect(sb.getSiteSettings()).rejects.toThrow("Không tải được dữ liệu");
  });
});
