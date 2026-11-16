export const STATUS_LABELS = {
  pending_upload: "Chờ tải CV", new: "Mới nhận", contacting: "Đang liên hệ", interview_scheduled: "Hẹn phỏng vấn",
  hired: "Trúng tuyển", rejected: "Không phù hợp", withdrawn: "Rút hồ sơ",
} as const;
export type ApplicationStatus = keyof typeof STATUS_LABELS;
export const isValidStatus = (s: unknown): s is ApplicationStatus => typeof s === "string" && Object.hasOwn(STATUS_LABELS, s);
// pending_upload do hệ thống đặt (đang chờ CV): admin không được chuyển vào hay ra.
export const isAdminSettableStatus = (s: unknown): s is Exclude<ApplicationStatus, "pending_upload"> => isValidStatus(s) && s !== "pending_upload";
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
