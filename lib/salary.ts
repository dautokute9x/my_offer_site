import type { Job } from "@/lib/types";

export const UNCONFIRMED = "Chưa xác nhận";

const man = (yen: number) => String(Math.round(yen / 100) / 100).replace(".", ",");

export function formatYenRange(min: number | null, max: number | null, period: "month" | "year"): string | null {
  const unit = `万円/${period === "month" ? "tháng" : "năm"}`;
  if (min == null && max == null) return null;
  if (min == null) return `Đến ${man(max!)} ${unit}`;
  if (max == null) return `Từ ${man(min)} ${unit}`;
  return min === max ? `${man(min)} ${unit}` : `${man(min)}–${man(max)} ${unit}`;
}

export function salaryLines(job: Job) {
  return {
    monthly: formatYenRange(job.monthlyMinYen, job.monthlyMaxYen, "month"),
    annual: formatYenRange(job.annualMinYen, job.annualMaxYen, "year"),
  };
}
