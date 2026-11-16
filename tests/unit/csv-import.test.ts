import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { checkMapping, COLUMNS, mapColumns, validateRows } from "@/lib/admin/csv-import";
import { demoCatalog } from "@/lib/demo/catalog";

const catalog = demoCatalog;
const mapping = mapColumns(COLUMNS as unknown as string[]);
const row = (o: Record<string, string>) => COLUMNS.map((c) => o[c] ?? "");
const base = { code: "A1", title_vi: "Tiêu đề", title_ja: "タイトル", prefectures: "東京" };
const run = (rows: Record<string, string>[], existing: string[] = []) => validateRows(rows.map(row), mapping, catalog, existing);

describe("template", () => {
  it("file mẫu parse và validate không lỗi", () => {
    const t = readFileSync("public/mau-nhap-tin.csv", "utf8");
    expect(t.charCodeAt(0)).toBe(0xfeff);
    const [header, ...rows] = parseCsv(t);
    expect(rows).toHaveLength(1);
    const r = validateRows(rows, mapColumns(header), catalog, []);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });
});

describe("mapColumns", () => {
  it("không phân biệt hoa thường/khoảng trắng; cột lạ → null", () => {
    const m = mapColumns(["﻿Code", " Title VI ", "xyz"]);
    expect(m.code).toBe(0); expect(m.title_vi).toBe(1); expect(m.title_ja).toBeNull();
  });
});

describe("validateRows", () => {
  it("東京 khớp tỉnh 13; 350万 → 3500000; ngày JST", () => {
    const r = run([{ ...base, annual_min_man: "350万", monthly_min_yen: "25万円", monthly_max_yen: "300000", interviews: "2026/11/20 10:00|2026-11-21 09:30" }]);
    expect(r.errors).toEqual([]);
    const d = r.rows[0].data;
    expect(d.prefectureIds).toEqual([13]);
    expect(d.job.annual_min_yen).toBe(3500000);
    expect(d.job.monthly_min_yen).toBe(250000);
    expect(d.job.monthly_max_yen).toBe(300000);
    expect(d.interviews).toEqual(["2026-11-20T01:00:00.000Z", "2026-11-21T00:30:00.000Z"]);
    expect(r.rows[0]).toMatchObject({ line: 2, action: "create" });
  });
  it("tỉnh không tồn tại → lỗi đúng dòng, đúng cột; số dòng từ 2", () => {
    const r = run([base, { ...base, code: "B2", prefectures: "Atlantis" }]);
    expect(r.errors).toEqual([expect.objectContaining({ line: 3, column: "prefectures" })]);
  });
  it("mã trùng trong file → lỗi cả hai dòng (không phân biệt hoa thường)", () => {
    const r = run([base, { ...base, code: "a1" }]);
    expect(r.errors.filter((e) => e.column === "code").map((e) => e.line)).toEqual([2, 3]);
  });
  it("412 khi đã có 00412 → cảnh báo; mã có sẵn → update", () => {
    const r = run([{ ...base, code: "412" }, { ...base, code: "00412" }], ["00412"]);
    expect(r.warnings).toEqual([expect.objectContaining({ line: 2, message: expect.stringContaining("Excel đã bỏ số 0") })]);
    expect(r.rows[1].action).toBe("update");
  });
  it("ngày/lương/tri-state sai → lỗi, không ném", () => {
    const r = run([
      { ...base, interviews: "2026-13-45 10:00" },
      { ...base, code: "C", monthly_min_yen: "500" },
      { ...base, code: "D", driver_license_required: "maybe" },
      { ...base, code: "E", annual_min_man: "abc" },
    ]);
    expect(r.errors.map((e) => [e.line, e.column])).toEqual([[2, "interviews"], [3, "monthly_min_yen"], [4, "driver_license_required"], [5, "annual_min_man"]]);
  });
  it("tri-state có/không", () => {
    const r = run([{ ...base, salary_negotiable: "có", driver_license_required: "khong", company_car_provided: "" }]);
    expect(r.rows[0].data.job).toMatchObject({ salary_negotiable: true, driver_license_required: false, company_car_provided: null });
  });
  it("quá 2000 dòng → lỗi rõ ràng", () => {
    const r = validateRows(Array.from({ length: 2001 }, () => row(base)), mapping, catalog, []);
    expect(r.rows).toEqual([]);
    expect(r.errors[0].message).toContain("2000");
  });
});

describe("checkMapping", () => {
  it("chỉ nhận khóa đã biết và chỉ số trong header", () => {
    expect(checkMapping({ code: 0, title_vi: null }, 2)?.code).toBe(0);
    expect(checkMapping({ code: 2 }, 2)).toBeNull();
    expect(checkMapping({ code: -1 }, 2)).toBeNull();
    expect(checkMapping({ evil: 0 }, 2)).toBeNull();
    expect(checkMapping("x", 2)).toBeNull();
  });
});
