import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/filters";

const back = (f: ReturnType<typeof parseFilters>) =>
  parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(f))), demoCatalog);

describe("filters", () => {
  it("bỏ giá trị rác và round-trip", () => {
    const f = parseFilters({ tinh: "13,27,99", trang: "-3", tiengnhat: "N9", luong: "25-", ky: "thang" }, demoCatalog);
    expect(f.prefectures).toEqual(["13", "27"]);
    expect(f.page).toBe(1);
    expect(f.jpLevel).toBeNull();
    expect(f.salaryMinMan).toBe(25);
    expect(f.salaryMaxMan).toBeNull();
    expect(back(f)).toEqual(f);
  });
  it("round-trip đầy đủ, mặc định không ghi, trang không phải số về 1", () => {
    const f = parseFilters(
      { q: "ky su", tinh: "13", nhom: "dien,x", nghe: "plc-mach-dien,khong-co", luong: "20-40", ky: "nam", tiengnhat: "N3", kn: "2", ql: "thuong", pv: "1", sx: "luong", trang: "2" },
      demoCatalog,
    );
    expect(f).toMatchObject({ groups: ["dien"], occupations: ["plc-mach-dien"], period: "year", sort: "luong", page: 2, hasInterview: true });
    expect(back(f)).toEqual(f);
    const none = parseFilters({ tiengnhat: "none" }, demoCatalog);
    expect(none.jpLevel).toBe("none");
    expect(back(none)).toEqual(none);
    const empty = parseFilters({}, demoCatalog);
    expect(filtersToQuery(empty)).toBe("");
    expect(hasActiveFilters(empty)).toBe(false);
    expect(hasActiveFilters(f)).toBe(true);
    expect(parseFilters({ trang: "abc" }, demoCatalog).page).toBe(1);
  });
});
