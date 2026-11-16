import { describe, expect, it } from "vitest";
import { isPlaceholder, siteDefaults } from "@/lib/site-defaults";

describe("site-defaults", () => {
  it("nhận diện placeholder dạng [...]", () => {
    expect(isPlaceholder("[EMAIL]")).toBe(true);
    expect(isPlaceholder("a@b.vn")).toBe(false);
  });
  it("giữ mặc định retention 12 tháng và chưa xác nhận chính sách", () => {
    expect(siteDefaults.retentionMonths).toBe(12);
    expect(siteDefaults.policiesConfirmed).toBe(false);
  });
});
