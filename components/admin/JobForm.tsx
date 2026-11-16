"use client";
import { useActionState } from "react";
import { saveJob, type FormState } from "@/app/admin/(protected)/tin/actions";
import type { Raw } from "@/lib/admin/job-input";
import { CONTENT_FIELDS } from "@/lib/admin/job-input";
import type { Catalog } from "@/lib/types";

const CONTENT_LABEL: Record<(typeof CONTENT_FIELDS)[number], string> = {
  summary: "Tóm tắt", description: "Mô tả công việc", requirements: "Yêu cầu", workingHours: "Giờ làm",
  holidays: "Ngày nghỉ", overtime: "Tăng ca", benefitsNote: "Ghi chú quyền lợi",
};
const input = "mt-1 block min-h-11 w-full rounded border px-3 font-normal";
const TRI = [["", "Chưa xác nhận"], ["yes", "Có"], ["no", "Không"]] as const;

export default function JobForm({ catalog, initial, id, sourceChanged }: { catalog: Catalog; initial: Raw; id?: number; sourceChanged?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveJob, {});
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const s = (k: string) => { const x = v[k]; return Array.isArray(x) ? x[0] ?? "" : x ?? ""; };
  const list = (k: string) => (Array.isArray(v[k]) ? v[k] : v[k] ? [v[k] as string] : []);
  const err = (k: string) => e[k] && <p id={`e-${k}`} role="alert" className="text-sm text-red-700">{e[k]}</p>;
  const aria = (k: string) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": `e-${k}` } : {});
  const field = (k: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-semibold">{label}
      <input name={k} defaultValue={s(k)} className={input} {...aria(k)} {...extra} />
      {err(k)}
    </label>
  );
  const tri = (k: string, label: string) => (
    <label className="block text-sm font-semibold">{label}
      <select name={k} defaultValue={s(k)} className={input}>{TRI.map(([val, t]) => <option key={val} value={val}>{t}</option>)}</select>
    </label>
  );
  const checks = (k: string, legend: string, items: { id: number; label: string }[]) => (
    <fieldset className="space-y-1" {...aria(k)}>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="grid gap-x-4 sm:grid-cols-3">
        {items.map((it) => (
          <label key={it.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name={k} value={it.id} defaultChecked={list(k).includes(String(it.id))} />{it.label}
          </label>
        ))}
      </div>
      {err(k)}
    </fieldset>
  );
  return (
    <form key={state.nonce ?? 0} action={action} className="space-y-6">
      {id != null && <input type="hidden" name="id" value={id} />}
      {err("form")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("code", "Mã tin", { required: true, maxLength: 20 })}
        {field("slug", "Slug (để trống để tự sinh từ tiêu đề)")}
        {field("titleVi", "Tiêu đề (tiếng Việt)", { required: true })}
        {field("titleJa", "Tiêu đề (tiếng Nhật)", { required: true, lang: "ja" })}
        {field("employerName", "Tên công ty")}
        {field("locationDetailJa", "Địa điểm chi tiết (tiếng Nhật)", { lang: "ja" })}
        <label className="block text-sm font-semibold">Trạng thái
          <select name="status" defaultValue={s("status") || "draft"} className={input} {...aria("status")}>
            <option value="draft">Nháp</option><option value="published">Đang đăng</option><option value="closed">Đã đóng</option>
          </select>
          {err("status")}
        </label>
        {field("validThrough", "Hạn tuyển (JST)", { type: "date" })}
      </div>
      {checks("prefectureIds", "Tỉnh (bắt buộc)", catalog.prefectures.map((p) => ({ id: p.id, label: p.nameVi })))}
      {checks("occupationIds", "Ngành nghề", catalog.occupations.map((o) => ({ id: o.id, label: o.nameVi })))}
      {checks("skillIds", "Kỹ năng", catalog.skills.map((k) => ({ id: k.id, label: k.name })))}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Lương (đơn vị: 万円, ví dụ 27,5)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("monthlyMinMan", "Lương tháng — tối thiểu", { inputMode: "decimal" })}
          {field("monthlyMaxMan", "Lương tháng — tối đa", { inputMode: "decimal" })}
          {field("annualMinMan", "Thu nhập năm — tối thiểu", { inputMode: "decimal" })}
          {field("annualMaxMan", "Thu nhập năm — tối đa", { inputMode: "decimal" })}
          {tri("salaryNegotiable", "Thương lượng")}
          {field("salarySourceText", "Nguyên văn lương (nguồn)")}
        </div>
        <p className="text-xs text-gray-600">Cờ “cần kiểm tra lương” tự bật khi lương tháng tối đa × 12 vượt thu nhập năm tối đa.</p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Tiếng Nhật
          <select name="jpLevel" defaultValue={s("jpLevel")} className={input} {...aria("jpLevel")}>
            <option value="">Chưa xác nhận</option>
            {["N1", "N2", "N3", "N4", "N5"].map((l) => <option key={l}>{l}</option>)}
            <option value="none">Không yêu cầu</option>
          </select>
          {err("jpLevel")}
        </label>
        {field("jpNote", "Ghi chú tiếng Nhật", { lang: "ja" })}
        {field("experienceYearsMin", "Kinh nghiệm tối thiểu (năm)", { inputMode: "numeric" })}
        {field("experienceNote", "Ghi chú kinh nghiệm", { lang: "ja" })}
        {tri("driverLicenseRequired", "Bằng lái bắt buộc")}
        {tri("companyCarProvided", "Xe công ty")}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Quyền lợi</legend>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {catalog.benefits.map((b) => (
            <label key={b.slug} className="flex items-center justify-between gap-2 border-b py-1 text-sm">{b.nameVi}
              <select name={`benefit.${b.slug}`} defaultValue={s(`benefit.${b.slug}`)} className="min-h-11 rounded border px-2">
                {TRI.map(([val, t]) => <option key={val} value={val}>{t}</option>)}
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Nội dung song ngữ</legend>
        {sourceChanged && <p role="alert" className="rounded bg-amber-100 p-2 text-sm text-amber-900">Bản gốc đã đổi — kiểm tra lại bản dịch</p>}
        <label className="block text-sm font-semibold">Trạng thái bản dịch
          <select name="translationStatus" defaultValue={s("translationStatus") || "none"} className={input} {...aria("translationStatus")}>
            <option value="none">Chưa có bản dịch</option><option value="unreviewed">Chưa duyệt</option><option value="approved">Đã duyệt</option>
          </select>
          {err("translationStatus")}
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="ackTranslation" value="1" />Tôi đã kiểm tra lại bản dịch theo bản gốc hiện tại
        </label>
        {CONTENT_FIELDS.map((f) => (
          <div key={f} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">{CONTENT_LABEL[f]} (JA)
              <textarea name={`${f}Ja`} lang="ja" rows={4} defaultValue={s(`${f}Ja`)} className="mt-1 block w-full rounded border p-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">{CONTENT_LABEL[f]} (VI)
              <textarea name={`${f}Vi`} rows={4} defaultValue={s(`${f}Vi`)} className="mt-1 block w-full rounded border p-3 font-normal" />
            </label>
          </div>
        ))}
      </fieldset>
      <button type="submit" disabled={pending} className="min-h-11 rounded bg-navy px-5 font-semibold text-white disabled:opacity-60">
        {pending ? "Đang lưu…" : "Lưu tin"}
      </button>
    </form>
  );
}
