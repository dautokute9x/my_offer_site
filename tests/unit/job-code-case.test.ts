import { describe, expect, it, vi } from "vitest";

// Đổi mã 10587 → ABC123 và cho 00412 (mới nhất) cũng chứa "abc123" trong tiêu đề.
vi.mock("@/lib/demo/jobs", async (orig) => {
  const m = await orig<typeof import("@/lib/demo/jobs")>();
  return {
    buildDemoJobs: (now: Date) => {
      const r = m.buildDemoJobs(now);
      return {
        ...r,
        jobs: r.jobs.map((j) =>
          j.code === "10587" ? { ...j, code: "ABC123" } : j.code === "00412" ? { ...j, titleVi: `${j.titleVi} abc123` } : j),
      };
    },
  };
});

const { getJobByCode, searchJobs } = await import("@/lib/data/demo");
const { parseFilters } = await import("@/lib/filters");
const { demoCatalog } = await import("@/lib/demo/catalog");

describe("mã tin không phân biệt hoa thường (demo)", () => {
  it("getJobByCode", async () => {
    expect((await getJobByCode("abc123"))?.code).toBe("ABC123");
    expect((await getJobByCode("#Abc123"))?.code).toBe("ABC123");
  });
  it("mã khớp chính xác lên đầu", async () => {
    const f = parseFilters({}, demoCatalog);
    expect((await searchJobs({ ...f, q: "ABC123" })).items.map((j) => j.code)).toEqual(["ABC123", "00412"]);
    expect((await searchJobs({ ...f, q: "abc12" })).items.map((j) => j.code)).toEqual(["00412", "ABC123"]);
  });
});
