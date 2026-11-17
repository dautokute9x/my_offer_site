import { describe, expect, it } from "vitest";
import { formatYenRange, salaryLines, UNCONFIRMED } from "@/lib/salary";
import type { Job } from "@/lib/types";

describe("formatYenRange", () => {
  it("formats ranges and open ends", () => {
    expect(formatYenRange(250000, 300000, "month")).toBe("25–30 万円/tháng");
    expect(formatYenRange(3500000, 4410000, "year")).toBe("350–441 万円/năm");
    expect(formatYenRange(3640000, null, "year")).toBe("Từ 364 万円/năm");
    expect(formatYenRange(null, 300000, "month")).toBe("Đến 30 万円/tháng");
    expect(formatYenRange(null, null, "month")).toBeNull();
    expect(formatYenRange(215500, null, "month")).toBe("Từ 21,55 万円/tháng");
    expect(formatYenRange(333333, null, "month")).toBe("Từ 33,33 万円/tháng");
    expect(formatYenRange(null, 3333333, "year")).toBe("Đến 333,33 万円/năm");
  });
  it("shows a single value when min equals max", () => {
    expect(formatYenRange(250000, 250000, "month")).toBe("25 万円/tháng");
  });
});

describe("salaryLines", () => {
  it("maps job fields", () => {
    const job = { monthlyMinYen: 250000, monthlyMaxYen: 300000, annualMinYen: null, annualMaxYen: null } as Job;
    expect(salaryLines(job)).toEqual({ monthly: "25–30 万円/tháng", annual: null });
    expect(UNCONFIRMED).toBe("Chưa xác nhận");
  });
});
