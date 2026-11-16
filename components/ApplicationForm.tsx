"use client";
import { useRef, useState } from "react";
import { ALLOWED_EXT, MAX_CV_BYTES, validateApplication, type ApplicationInput } from "@/lib/validate";

const LEVELS: [string, string][] = [["", "Chưa chọn"], ["N1", "N1"], ["N2", "N2"], ["N3", "N3"], ["N4", "N4"], ["N5", "N5"], ["none", "Chưa có/Không"]];
const input = "mt-1 block min-h-11 w-full rounded border border-slate-400 px-3 py-2";
const FIELDS = ["fullName", "email", "phone", "facebook", "jpLevel", "file", "note", "consent"];

type Props = { kind: "apply" | "consult"; jobCode: string | null; jobTitle?: string; consentVersion: string; retentionMonths: number };

export default function ApplicationForm({ kind: initialKind, jobCode, jobTitle, consentVersion, retentionMonths }: Props) {
  const [kind, setKind] = useState(initialKind);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");
  const submittingRef = useRef(false);
  const keyRef = useRef<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  keyRef.current ||= typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random());
  const apply = kind === "apply";

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (submittingRef.current) return;
    const fd = new FormData(ev.currentTarget);
    const cv = fd.get("cv");
    const f = cv instanceof File && cv.name ? cv : null;
    fd.set("kind", kind);
    fd.set("idempotencyKey", keyRef.current);
    fd.set("consentVersion", consentVersion);
    fd.set("consent", fd.get("consent") ? "true" : "false");
    if (jobCode) fd.set("jobCode", jobCode);
    if (!apply) fd.delete("cv");
    const probe: ApplicationInput = {
      kind, jobCode, fullName: String(fd.get("fullName") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? ""),
      facebook: String(fd.get("facebook") ?? ""), jpLevel: String(fd.get("jpLevel") ?? "") as ApplicationInput["jpLevel"], note: String(fd.get("note") ?? ""),
      consent: fd.get("consent") === "true", idempotencyKey: keyRef.current, file: apply && f ? { name: f.name, size: f.size, type: f.type } : null,
    };
    const errs = validateApplication(probe);
    setGeneral("");
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = [...FIELDS, "contact"].find((k) => errs[k]);
      const target = first === "contact" ? "email" : first;
      formRef.current?.querySelector<HTMLElement>(`[name="${target === "file" ? "cv" : target}"]`)?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications/start", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok === true && data.refCode) setDone(`Đã nhận hồ sơ — mã ${data.refCode}`);
      else if (data?.errors) setErrors(data.errors);
      else setGeneral(data?.message || "Gửi không thành công. Vui lòng thử lại.");
    } catch {
      setGeneral("Không gửi được do lỗi mạng. Dữ liệu của bạn vẫn được giữ — vui lòng thử lại.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (done) return <p role="status" className="rounded bg-green-50 px-4 py-3 font-semibold text-green-900">{done}</p>;

  const field = (name: string, label: string, el: (p: object) => React.ReactNode) => (
    <div>
      <label htmlFor={`f-${name}`} className="font-semibold">{label}</label>
      {el({ id: `f-${name}`, name, "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? `e-${name}` : undefined })}
      {errors[name] && <p id={`e-${name}`} className="mt-1 text-sm font-semibold text-red-800">{errors[name]}</p>}
    </div>
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={submitting} className="space-y-4">
      {general && <p role="alert" className="rounded bg-red-50 px-4 py-3 font-semibold text-red-900">{general}</p>}
      {errors.contact && <p id="e-contact" role="alert" className="rounded bg-red-50 px-4 py-3 font-semibold text-red-900">{errors.contact}</p>}
      {errors.kind && <p role="alert" className="font-semibold text-red-900">{errors.kind}</p>}
      {jobCode && (
        <p className="text-sm">
          Tin: <input readOnly aria-label="Mã tin" value={`#${jobCode}`} className="w-24 border-0 bg-transparent font-semibold" />
          {jobTitle && <input readOnly aria-label="Tên tin" value={jobTitle} className="w-full border-0 bg-transparent" />}
        </p>
      )}
      {field("fullName", "Họ và tên", (p) => <input {...p} autoComplete="name" required maxLength={100} className={input} />)}
      <p className="text-sm text-slate-700">Cần ít nhất một cách liên hệ bên dưới.</p>
      {field("email", "Email", (p) => <input {...p} type="email" autoComplete="email" className={input} />)}
      {field("phone", "Điện thoại / Zalo", (p) => <input {...p} type="tel" autoComplete="tel" className={input} />)}
      {field("facebook", "Facebook (liên kết hoặc tên)", (p) => <input {...p} className={input} />)}
      {field("jpLevel", "Trình độ tiếng Nhật", (p) => <select {...p} defaultValue="" className={input}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}
      {apply && field("file", `CV (${ALLOWED_EXT.join(", ")}; tối đa ${MAX_CV_BYTES / 1024 / 1024} MB)`, (p) => <input {...p} name="cv" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className={input} />)}
      {apply && (
        <button type="button" onClick={() => setKind("consult")} className="font-semibold text-brand underline">Chưa có CV? Nhận tư vấn trước</button>
      )}
      {!apply && initialKind === "apply" && (
        <button type="button" onClick={() => setKind("apply")} className="font-semibold text-brand underline">Quay lại ứng tuyển với CV</button>
      )}
      {field("note", "Ghi chú", (p) => <textarea {...p} rows={4} maxLength={2000} className={input} />)}
      <div>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent" aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "e-consent" : undefined} className="mt-1 size-5" />
          <span>Tôi đồng ý để xử lý thông tin cá nhân nhằm mục đích tuyển dụng và tư vấn, lưu tối đa {retentionMonths} tháng. Xem <a href="/chinh-sach-bao-mat" className="font-semibold text-brand underline">Chính sách bảo mật</a>.</span>
        </label>
        {errors.consent && <p id="e-consent" className="mt-1 text-sm font-semibold text-red-800">{errors.consent}</p>}
      </div>
      <button type="submit" disabled={submitting} aria-busy={submitting} className="inline-flex min-h-11 items-center justify-center rounded bg-brand px-6 font-semibold text-white disabled:opacity-60">
        {submitting ? "Đang gửi…" : general ? "Thử lại" : apply ? "Gửi hồ sơ" : "Gửi yêu cầu tư vấn"}
      </button>
    </form>
  );
}
