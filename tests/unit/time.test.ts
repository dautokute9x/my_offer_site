import { describe, expect, it } from "vitest";
import { formatJst, formatVn, jstDateKey, jstToIso, jstTodayKey } from "@/lib/time";

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
  it("converts JST keys", () => {
    expect(jstToIso("2026-11-20", "10:00")).toBe("2026-11-20T01:00:00.000Z");
    expect(jstTodayKey(new Date("2026-11-19T16:00:00Z"))).toBe("2026-11-20");
  });
});
