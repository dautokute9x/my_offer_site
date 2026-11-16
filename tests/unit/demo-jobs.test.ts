import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/lib/demo/catalog";
import { buildDemoJobs } from "@/lib/demo/jobs";

describe("buildDemoJobs", () => {
  const { jobs, interviews } = buildDemoJobs(new Date("2026-11-16T03:00:00Z"));
  it("đủ số tin, mã duy nhất, có 00412", () => {
    expect(jobs.length).toBeGreaterThanOrEqual(12);
    expect(jobs.length).toBeLessThanOrEqual(18);
    expect(jobs.every((j) => j.isDemo)).toBe(true);
    expect(jobs.find((j) => j.code === "00412")).toBeTruthy();
    expect(new Set(jobs.map((j) => j.code)).size).toBe(jobs.length);
    expect(jobs.every((j) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(j.slug))).toBe(true);
  });
  it("các tình huống lịch và trạng thái", () => {
    expect(interviews.find((i) => i.status === "cancelled")).toBeTruthy();
    expect(interviews.some((i) => i.startsAt < "2026-11-16")).toBe(true);
    expect(interviews.filter((i) => i.jobId === 1)).toHaveLength(3);
    expect(interviews[0].startsAt).toBe("2026-11-18T01:00:00.000Z"); // hôm nay JST +2, 10:00 JST
    expect(jobs.some((j) => j.status === "closed")).toBe(true);
    expect(jobs.some((j) => j.translationStatus === "unreviewed")).toBe(true);
  });
  it("lương đủ các dạng và mỗi nhóm nghề có tin", () => {
    expect(jobs.some((j) => j.monthlyMinYen != null && j.annualMinYen == null)).toBe(true);
    expect(jobs.some((j) => j.monthlyMinYen == null && j.annualMinYen != null)).toBe(true);
    expect(jobs.some((j) => j.monthlyMinYen != null && j.annualMinYen != null)).toBe(true);
    expect(jobs.some((j) => j.monthlyMinYen == null && j.annualMinYen == null)).toBe(true);
    for (const g of demoCatalog.groups) {
      const ids = demoCatalog.occupations.filter((o) => o.groupId === g.id).map((o) => o.id);
      expect(jobs.some((j) => j.occupationIds.some((x) => ids.includes(x)))).toBe(true);
    }
  });
});
