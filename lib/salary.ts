import type { Job } from "@/lib/types";

export const UNCONFIRMED = "Chưa xác nhận";

// Từ ngữ quanh con số lương theo ngôn ngữ; mặc định tiếng Việt. Bản dịch nằm ở từ điển (messages.*.salary).
export type SalaryWords = { month: string; year: string; upTo: string; from: string; decimal: string };
export const SALARY_VI: SalaryWords = { month: "tháng", year: "năm", upTo: "Đến {v}", from: "Từ {v}", decimal: "," };

const man = (yen: number, W: SalaryWords) => String(Math.round(yen / 100) / 100).replace(".", W.decimal);

export function formatYenRange(min: number | null, max: number | null, period: "month" | "year", W: SalaryWords = SALARY_VI): string | null {
  const unit = `万円/${period === "month" ? W.month : W.year}`;
  if (min == null && max == null) return null;
  if (min == null) return W.upTo.replace("{v}", `${man(max!, W)} ${unit}`);
  if (max == null) return W.from.replace("{v}", `${man(min, W)} ${unit}`);
  return min === max ? `${man(min, W)} ${unit}` : `${man(min, W)}–${man(max, W)} ${unit}`;
}

export function salaryLines(job: Job, W: SalaryWords = SALARY_VI) {
  return {
    monthly: formatYenRange(job.monthlyMinYen, job.monthlyMaxYen, "month", W),
    annual: formatYenRange(job.annualMinYen, job.annualMaxYen, "year", W),
  };
}
