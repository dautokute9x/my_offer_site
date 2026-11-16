import { describe, expect, it } from "vitest";
import { isValidStatus, STATUS_LABELS } from "@/lib/applications/status";

describe("application status", () => {
  it("isValidStatus whitelist", () => {
    expect(isValidStatus("hired")).toBe(true);
    expect(isValidStatus("x")).toBe(false);
    expect(isValidStatus("toString")).toBe(false);
    expect(isValidStatus(null)).toBe(false);
  });
  it("7 nhãn tiếng Việt", () => {
    expect(STATUS_LABELS).toEqual({
      pending_upload: "Chờ tải CV", new: "Mới nhận", contacting: "Đang liên hệ", interview_scheduled: "Hẹn phỏng vấn",
      hired: "Trúng tuyển", rejected: "Không phù hợp", withdrawn: "Rút hồ sơ",
    });
  });
});
