import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { parseFilters } from "@/lib/filters";
import { toSearchParams } from "@/lib/data/supabase";

describe("toSearchParams", () => {
  it("khóa đúng như search_jobs đọc", () => {
    const f = parseFilters({ q: "abc", luong: "30-", ky: "nam", tiengnhat: "N3", kn: "2", pv: "1", sx: "luong", trang: "2" }, demoCatalog);
    const now = new Date("2026-01-01T00:00:00Z");
    expect(toSearchParams(f, now)).toEqual({
      q: "abc", prefectures: [], groups: [], occupations: [], benefits: [], salaryMinMan: 30, salaryMaxMan: null,
      period: "year", jpLevel: "N3", maxExperience: 2, hasInterview: true, sort: "luong", page: 2, now: "2026-01-01T00:00:00.000Z",
    });
    expect("now" in toSearchParams(f)).toBe(false);
  });
});
