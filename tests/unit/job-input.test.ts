import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { generateSlug, normalizeJobInput, parseJobForm } from "@/lib/admin/job-input";

const base = { code: "00412", titleVi: "Kỹ sư điện", titleJa: "電気技術者", prefectureIds: ["13"] };
const ok = (raw: Record<string, string | string[]>) => {
  const r = normalizeJobInput({ ...base, ...raw }, demoCatalog);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
};
const errs = (raw: Record<string, string | string[]>) => {
  const r = normalizeJobInput({ ...base, ...raw }, demoCatalog);
  return "errors" in r ? r.errors : {};
};

describe("normalizeJobInput", () => {
  it("giữ nguyên mã có số 0 đầu", () => expect(ok({}).job.code).toBe("00412"));
  it("mã có dấu - → lỗi", () => expect(errs({ code: "00-412" }).code).toBeTruthy());
  it("lương năm 350万 → 3500000 yên", () => expect(ok({ annualMinMan: "350" }).job.annual_min_yen).toBe(3_500_000));
  it("min > max → lỗi", () => expect(errs({ annualMinMan: "400", annualMaxMan: "300" }).annualMaxMan).toBeTruthy());
  it("tháng 30万 × 12 > năm tối đa 300万 → cần kiểm tra lương", () => {
    expect(ok({ monthlyMaxMan: "30", annualMaxMan: "300" }).job.salary_needs_review).toBe(true);
    expect(ok({ monthlyMaxMan: "25", annualMaxMan: "300" }).job.salary_needs_review).toBe(false);
  });
  it("CSV: nguồn lương không đọc được → cần kiểm tra", () => {
    const r = normalizeJobInput({ ...base }, demoCatalog, { salaryUnparseable: true });
    expect("errors" in r ? null : r.job.salary_needs_review).toBe(true);
  });
  it("slug tự sinh", () => {
    expect(generateSlug("Kỹ sư điện (Tokyo)")).toBe("ky-su-dien-tokyo");
    expect(ok({ titleVi: "Kỹ sư điện (Tokyo)" }).job.slug).toBe("ky-su-dien-tokyo");
    expect(ok({ slug: "tu-dat" }).job.slug).toBe("tu-dat");
  });
  it("quyền lợi 'unknown' không vào map; có/không vào", () => {
    const s = demoCatalog.benefits.map((b) => b.slug);
    const r = ok({ [`benefit.${s[0]}`]: "yes", [`benefit.${s[1]}`]: "no", [`benefit.${s[2]}`]: "unknown" });
    expect(r.benefits).toEqual({ [s[0]]: true, [s[1]]: false });
  });
  it("id danh mục không có trong catalog → lỗi; tỉnh bắt buộc", () => {
    expect(errs({ prefectureIds: ["999"] }).prefectureIds).toBeTruthy();
    expect(errs({ prefectureIds: [] }).prefectureIds).toBeTruthy();
  });
});

describe("parseJobForm", () => {
  it("gộp trường lặp thành mảng", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ code: "1", titleVi: "A", titleJa: "B" })) fd.append(k, v);
    fd.append("prefectureIds", "13"); fd.append("prefectureIds", "14");
    const r = parseJobForm(fd, demoCatalog);
    expect("errors" in r ? null : r.prefectureIds).toEqual([13, 14]);
  });
});
