export const STATUS_LABELS = {
  pending_upload: "Chờ tải CV", new: "Mới nhận", contacting: "Đang liên hệ", interview_scheduled: "Hẹn phỏng vấn",
  hired: "Trúng tuyển", rejected: "Không phù hợp", withdrawn: "Rút hồ sơ",
} as const;
export type ApplicationStatus = keyof typeof STATUS_LABELS;
export const isValidStatus = (s: unknown): s is ApplicationStatus => typeof s === "string" && Object.hasOwn(STATUS_LABELS, s);
