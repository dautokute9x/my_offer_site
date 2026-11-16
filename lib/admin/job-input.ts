import { createHash } from "node:crypto";
import { normText } from "@/lib/normalize";
import { jstToIso } from "@/lib/time";
import type { Catalog } from "@/lib/types";

export type Raw = Record<string, string | string[]>;
export type Errors = Record<string, string>;
// Khóa snake_case đúng cột bảng jobs (admin_save_job đọc bằng jsonb_populate_record).
export type JobRow = Record<string, string | number | boolean | null>;
export type JobInput = {
  job: JobRow; prefectureIds: number[]; occupationIds: number[]; skillIds: number[]; benefits: Record<string, boolean>;
};

export const CONTENT_FIELDS = ["summary", "description", "requirements", "workingHours", "holidays", "overtime", "benefitsNote"] as const;
export const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// Phải khớp md5 trong admin_save_job (0004): các *_ja nối bằng U+001F, null → ''.
export const jaSourceHash = (get: (f: (typeof CONTENT_FIELDS)[number]) => string | null | undefined) =>
  createHash("md5").update(CONTENT_FIELDS.map((f) => get(f) ?? "").join("\u001f")).digest("hex");

export function generateSlug(titleVi: string): string {
  const s = normText(titleVi).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "tin";
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const tri = (v: string) => (v === "yes" ? true : v === "no" ? false : null);

// shortcut: "4 chữ số thập phân" không hỗ trợ; 万円 nhập tối đa 2 số lẻ (đủ cho 27,5万), nâng cấp khi cần.
const man = (s: string) => (/^\d{1,5}([.,]\d{1,2})?$/.test(s) ? Math.round(Number(s.replace(",", ".")) * 10_000) : NaN);

export function normalizeJobInput(raw: Raw, catalog: Catalog, opts: { salaryUnparseable?: boolean } = {}): JobInput | { errors: Errors } {
  const errors: Errors = {};
  const code = str(raw.code);
  if (!/^[A-Za-z0-9]{1,20}$/.test(code)) errors.code = "Mã tin chỉ gồm chữ và số (tối đa 20 ký tự), không có dấu gạch ngang.";
  const titleVi = str(raw.titleVi), titleJa = str(raw.titleJa);
  if (!titleVi) errors.titleVi = "Nhập tiêu đề tiếng Việt.";
  if (!titleJa) errors.titleJa = "Nhập tiêu đề tiếng Nhật.";
  const slug = str(raw.slug) || generateSlug(titleVi);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = "Slug chỉ gồm a-z, 0-9 và dấu gạch ngang.";
  const status = str(raw.status) || "draft";
  if (!["draft", "published", "closed"].includes(status)) errors.status = "Trạng thái không hợp lệ.";

  const ids = (key: string, label: string, valid: Set<number>, required = false) => {
    const out = [...new Set(arr(raw[key]).map(Number))];
    if (out.some((n) => !valid.has(n))) errors[key] = `${label} không hợp lệ.`;
    else if (required && !out.length) errors[key] = `Chọn ít nhất một ${label.toLowerCase()}.`;
    return out;
  };
  const prefectureIds = ids("prefectureIds", "Tỉnh", new Set(catalog.prefectures.map((p) => p.id)), true);
  const occupationIds = ids("occupationIds", "Ngành nghề", new Set(catalog.occupations.map((o) => o.id)));
  const skillIds = ids("skillIds", "Kỹ năng", new Set(catalog.skills.map((s) => s.id)));

  const benefits: Record<string, boolean> = {};
  for (const b of catalog.benefits) {
    const t = tri(str(raw[`benefit.${b.slug}`]));
    if (t !== null) benefits[b.slug] = t; // chưa xác nhận = không có dòng
  }

  const money = (key: string, label: string) => {
    const s = str(raw[key]);
    if (!s) return null;
    const v = man(s);
    if (Number.isNaN(v)) { errors[key] = `${label}: nhập số theo 万円 (ví dụ 350).`; return null; }
    return v;
  };
  const mMin = money("monthlyMinMan", "Lương tháng tối thiểu"), mMax = money("monthlyMaxMan", "Lương tháng tối đa");
  const aMin = money("annualMinMan", "Thu nhập năm tối thiểu"), aMax = money("annualMaxMan", "Thu nhập năm tối đa");
  if (mMin != null && mMax != null && mMin > mMax) errors.monthlyMaxMan = "Lương tháng tối đa phải ≥ tối thiểu.";
  if (aMin != null && aMax != null && aMin > aMax) errors.annualMaxMan = "Thu nhập năm tối đa phải ≥ tối thiểu.";
  // min > max đã là lỗi chặn ở trên nên không còn vào được đây (spec §6 vẫn đúng).
  const needsReview = !!opts.salaryUnparseable || (mMax != null && aMax != null && mMax * 12 > aMax);

  const jp = str(raw.jpLevel);
  if (jp && !["N1", "N2", "N3", "N4", "N5", "none"].includes(jp)) errors.jpLevel = "Trình độ tiếng Nhật không hợp lệ.";
  const exp = str(raw.experienceYearsMin);
  if (exp && !/^\d{1,2}$/.test(exp)) errors.experienceYearsMin = "Nhập số năm (0–99).";
  const ts = str(raw.translationStatus) || "none";
  if (!["none", "unreviewed", "approved"].includes(ts)) errors.translationStatus = "Trạng thái bản dịch không hợp lệ.";
  const vt = str(raw.validThrough);
  if (vt && !/^\d{4}-\d{2}-\d{2}$/.test(vt)) errors.validThrough = "Ngày không hợp lệ.";

  if (Object.keys(errors).length) return { errors };

  const content: JobRow = {};
  for (const f of CONTENT_FIELDS) for (const l of ["Ja", "Vi"]) content[snake(f + l)] = str(raw[f + l]) || null;
  return {
    job: {
      code, slug, status, title_vi: titleVi, title_ja: titleJa,
      employer_name: str(raw.employerName) || null,
      location_detail_ja: str(raw.locationDetailJa),
      monthly_min_yen: mMin, monthly_max_yen: mMax, annual_min_yen: aMin, annual_max_yen: aMax,
      salary_negotiable: tri(str(raw.salaryNegotiable)),
      salary_source_text: str(raw.salarySourceText) || null,
      salary_needs_review: needsReview,
      jp_level: jp || null, jp_note: str(raw.jpNote) || null,
      experience_years_min: exp ? Number(exp) : null, experience_note: str(raw.experienceNote) || null,
      driver_license_required: tri(str(raw.driverLicenseRequired)),
      company_car_provided: tri(str(raw.companyCarProvided)),
      valid_through: vt ? jstToIso(vt, "23:59") : null,
      translation_status: ts,
      ...content,
    },
    prefectureIds, occupationIds, skillIds, benefits,
  };
}

// FormData → Raw: trường lặp (checkbox/select multiple) thành mảng, bỏ File.
export function formToRaw(fd: FormData): Raw {
  const raw: Raw = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const cur = raw[k];
    raw[k] = cur === undefined ? v : [...(Array.isArray(cur) ? cur : [cur]), v];
  }
  return raw;
}

export const parseJobForm = (fd: FormData, catalog: Catalog) => normalizeJobInput(formToRaw(fd), catalog);
