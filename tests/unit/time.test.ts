import { describe, expect, it } from "vitest";
import { formatJst, formatVn, jstDateKey, jstToIso, jstTodayKey, dayHeading, parseDateKey } from "@/lib/time";

describe("time", () => {
  it("formats JST and VN", () => {
    expect(formatJst("2026-11-20T01:00:00Z")).toBe("Thứ Sáu, 20/11/2026 · 10:00 giờ Nhật (JST, UTC+9)");
    expect(formatVn("2026-11-20T01:00:00Z")).toBe("20/11/2026 · 08:00 giờ Việt Nam (UTC+7)");
  });
  it("handles near-midnight date differences", () => {
    expect(formatVn("2026-11-19T16:00:00Z")).toBe("19/11/2026 · 23:00 giờ Việt Nam (UTC+7)");
    expect(formatJst("2026-11-19T16:00:00Z")).toBe("Thứ Sáu, 20/11/2026 · 01:00 giờ Nhật (JST, UTC+9)");
    expect(jstDateKey("2026-11-19T16:00:00Z")).toBe("2026-11-20");
    expect(formatVn("2026-11-20T12:30:00Z")).toBe("20/11/2026 · 19:30 giờ Việt Nam (UTC+7)");
  });
  it("00:30 JST is the next calendar day vs UTC/VN", () => {
    expect(formatJst("2026-11-19T15:30:00Z")).toBe("Thứ Sáu, 20/11/2026 · 00:30 giờ Nhật (JST, UTC+9)");
    expect(formatVn("2026-11-19T15:30:00Z")).toBe("19/11/2026 · 22:30 giờ Việt Nam (UTC+7)");
    expect(jstDateKey("2026-11-19T15:30:00Z")).toBe("2026-11-20");
  });
  it("converts JST keys", () => {
    expect(jstToIso("2026-11-20", "10:00")).toBe("2026-11-20T01:00:00.000Z");
    // ngày/giờ không tồn tại: báo lỗi thay vì lăn sang 02/03
    expect(() => jstToIso("2026-02-30", "10:00")).toThrow(RangeError);
    expect(() => jstToIso("2026-11-20", "24:00")).toThrow(RangeError);
    expect(jstTodayKey(new Date("2026-11-19T16:00:00Z"))).toBe("2026-11-20");
  });
  it("day heading", () => {
    expect(dayHeading("2026-11-20")).toBe("Thứ Sáu, 20/11/2026");
  });
  it("parses interview date params", () => {
    expect(parseDateKey("2026-11-20")).toBe("2026-11-20");
    expect(parseDateKey(["2026-11-20", "2026-12-01"])).toBe("2026-11-20");
    expect(parseDateKey("2028-02-29")).toBe("2028-02-29");
    for (const bad of [undefined, "", "2026-02-30", "2026-13-01", "2026-1-5", "20/11/2026", "2026-11-20T00:00"]) {
      expect(parseDateKey(bad)).toBeUndefined();
    }
  });
});
