import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { buildDemoJobs } from "@/lib/demo/jobs";
import { getJobByCode, getRelatedJobs, listUpcomingInterviews, searchJobs } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

const empty = parseFilters({}, demoCatalog);
const all = buildDemoJobs(new Date()).jobs;
const pid = (code: string) => demoCatalog.prefectures.find((p) => p.code === code)!.id;
const codes = (r: { items: { code: string }[] }) => r.items.map((i) => i.code).sort();

describe("searchJobs (demo)", () => {
  it("tìm theo mã, kể cả #, toàn-rộng; 412 không là mã khớp 00412", async () => {
    expect((await searchJobs({ ...empty, q: "#00412" })).items[0].code).toBe("00412");
    expect((await searchJobs({ ...empty, q: "＃００４１２" })).items[0].code).toBe("00412");
    expect((await searchJobs({ ...empty, q: "412" })).items.map((j) => j.code)).toEqual(["00412"]); // khớp chuỗi con, không phải khớp mã
  });
  it("từ khóa: alias tỉnh, không dấu, không có kết quả", async () => {
    const a = await searchJobs({ ...empty, q: "Tokyo" });
    const b = await searchJobs({ ...empty, q: "東京都" });
    expect(a.total).toBeGreaterThan(0);
    expect(codes(a)).toEqual(codes(b));
    expect(a.items.every((j) => j.prefectureIds.includes(pid("13")))).toBe(true);
    expect((await searchJobs({ ...empty, q: "ky su dien" })).total).toBeGreaterThan(0);
    expect((await searchJobs({ ...empty, q: "zzzkhongco" })).total).toBe(0);
  });
  it("tỉnh OR, nhóm AND", async () => {
    const r = await searchJobs({ ...empty, prefectures: ["13", "27"], groups: ["dien"] });
    const dien = demoCatalog.occupations.filter((o) => o.groupId === 1).map((o) => o.id);
    expect(r.total).toBeGreaterThan(0);
    for (const j of r.items) {
      expect(j.prefectureIds.some((p) => p === pid("13") || p === pid("27"))).toBe(true);
      expect(j.occupationIds.some((o) => dien.includes(o))).toBe(true);
    }
  });
  it("lọc rồi xóa trả về như ban đầu; tin closed bị loại nhưng mở được bằng mã", async () => {
    const base = await searchJobs(empty);
    const some = await searchJobs({ ...empty, prefectures: ["13"], benefits: ["thuong"], jpLevel: "N3" });
    expect(some.total).toBeLessThan(base.total);
    expect((await searchJobs({ ...empty })).total).toBe(base.total);
    const closed = all.find((j) => j.status === "closed")!;
    expect(codes({ items: (await searchJobs({ ...empty, q: closed.code })).items })).toEqual([]);
    expect((await getJobByCode(closed.code))?.code).toBe(closed.code);
    expect(await getJobByCode("00000")).toBeNull();
  });
  it("lương theo kỳ, giao khoảng", async () => {
    const r = await searchJobs({ ...empty, period: "month", salaryMinMan: 30 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((j) => (j.monthlyMaxYen ?? j.monthlyMinYen) != null && (j.monthlyMaxYen ?? j.monthlyMinYen)! >= 300000)).toBe(true);
    const onlyAnnual = all.find((j) => j.monthlyMinYen == null && j.annualMinYen != null)!;
    expect(r.items.some((j) => j.code === onlyAnnual.code)).toBe(false);
    const y = await searchJobs({ ...empty, period: "year", salaryMaxMan: 380 });
    expect(y.items.length).toBeGreaterThan(0);
    expect(y.items.every((j) => (j.annualMinYen ?? j.annualMaxYen)! <= 3_800_000)).toBe(true);
  });
  it("tiếng Nhật: null vẫn đạt, N2 bị loại khi N3", async () => {
    const r = await searchJobs({ ...empty, jpLevel: "N3" });
    const ok = new Set(r.items.map((j) => j.code));
    expect(all.find((j) => j.jpLevel === null && j.status === "published" && j.id !== 13)).toBeTruthy();
    for (const j of all.filter((x) => x.status === "published")) {
      expect(ok.has(j.code)).toBe(j.jpLevel !== "N2" && j.jpLevel !== "N1");
    }
  });
  it("tiếng Nhật 'none': loại tin yêu cầu N, giữ null/none", async () => {
    const r = await searchJobs({ ...empty, jpLevel: "none" });
    const ok = new Set(r.items.map((j) => j.code));
    expect(r.total).toBeGreaterThan(0);
    for (const j of all.filter((x) => x.status === "published")) {
      expect(ok.has(j.code)).toBe(j.jpLevel === null || j.jpLevel === "none");
    }
  });
  it("trang, sắp xếp", async () => {
    const p1 = await searchJobs(empty);
    expect(p1.pageSize).toBe(12);
    expect(p1.items).toHaveLength(12);
    const p2 = await searchJobs({ ...empty, page: 2 });
    expect(p2.items.length).toBeGreaterThan(0);
    expect(p2.items.some((j) => p1.items.some((k) => k.code === j.code))).toBe(false);
    const far = await searchJobs({ ...empty, page: 99 });
    expect(far.items).toEqual([]);
    expect(far.total).toBe(p1.total);
    const pv = (await searchJobs({ ...empty, sort: "pv" })).items;
    expect(pv[0].code).toBe("00412");
    expect(pv.at(-1)!.nextInterview).toBeNull();
    const lu = (await searchJobs({ ...empty, sort: "luong", period: "month" })).items;
    expect(lu[0].monthlyMaxYen).toBe(430000);
    expect((await searchJobs({ ...empty, hasInterview: true })).items.every((j) => j.nextInterview)).toBe(true);
  });
  it("demo_error", async () => {
    await expect(searchJobs(empty, { simulateError: true })).rejects.toThrow();
  });
});

describe("dữ liệu liên quan", () => {
  it("getJobByCode: lịch sắp tới đã sắp; liên quan; lịch phỏng vấn", async () => {
    const j = (await getJobByCode("00412"))!;
    expect(j.interviews).toHaveLength(3);
    expect((await getRelatedJobs(j)).every((x) => x.code !== "00412")).toBe(true);
    const l = await listUpcomingInterviews({ prefectures: [], occupations: [] });
    expect(l.every((i) => i.status === "scheduled" && i.job.status === "published")).toBe(true);
    expect(l.map((i) => i.startsAt)).toEqual([...l.map((i) => i.startsAt)].sort());
    const f = await listUpcomingInterviews({ prefectures: ["13"], occupations: ["plc-mach-dien"] });
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((i) => i.job.prefectureIds.includes(pid("13")) && i.job.occupationIds.includes(3))).toBe(true);
    expect(await listUpcomingInterviews({ prefectures: ["27"], occupations: ["plc-mach-dien"] })).toEqual([]);
    const none = await listUpcomingInterviews({ from: "2999-01-01", prefectures: [], occupations: [] });
    expect(none).toEqual([]);
  });
});
