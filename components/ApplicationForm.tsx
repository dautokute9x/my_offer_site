"use client";
import { useEffect, useRef, useState } from "react";
import { isSuccess } from "@/lib/application-response";
import { ALLOWED_EXT, MAX_CV_BYTES, validateApplication, type ApplicationInput } from "@/lib/validate";

const LEVELS: [string, string][] = [["", "Chưa chọn"], ["N1", "N1"], ["N2", "N2"], ["N3", "N3"], ["N4", "N4"], ["N5", "N5"], ["none", "Chưa có/Không"]];
const input = "mt-1 block min-h-11 w-full rounded border border-slate-400 px-3 py-2";
const FIELDS = ["fullName", "email", "phone", "facebook", "jpLevel", "file", "note", "consent"];

// XMLHttpRequest (không phải fetch) để có sự kiện tiến độ tải lên.
function putFile(url: string, file: File, onPct: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", file.type || "application/octet-stream");
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`upload ${x.status}`)));
    x.onerror = x.onabort = x.ontimeout = () => reject(new Error("upload network"));
    x.send(file);
  });
}

type Props = { kind: "apply" | "consult"; jobCode: string | null; jobTitle?: string; consentVersion: string; retentionMonths: number };

export default function ApplicationForm({ kind: initialKind, jobCode, jobTitle, consentVersion, retentionMonths }: Props) {
  const [kind, setKind] = useState(initialKind);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const submittingRef = useRef(false);
  const keyRef = useRef<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  // randomUUID chỉ có trên ngữ cảnh an toàn (https/localhost); LAN http cần phương án dự phòng.
  keyRef.current ||= globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (done) statusRef.current?.focus(); }, [done]);
  const visible = (k: string) => k === "contact" || k === "kind" || (k === "file" ? apply : FIELDS.includes(k));
  const focusFirst = (errs: Record<string, string>) => {
    const first = [...FIELDS, "contact"].find((k) => errs[k] && visible(k));
    const target = first === "contact" ? "email" : first;
    formRef.current?.querySelector<HTMLElement>(`[name="${target === "file" ? "cv" : target}"]`)?.focus();
  };
  const apply = kind === "apply";

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (submittingRef.current) return;
    const fd = new FormData(ev.currentTarget);
    const cv = fd.get("cv");
    const f = cv instanceof File && cv.name ? cv : null;
    const probe: ApplicationInput = {
      kind, jobCode, fullName: String(fd.get("fullName") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? ""),
      facebook: String(fd.get("facebook") ?? ""), jpLevel: String(fd.get("jpLevel") ?? "") as ApplicationInput["jpLevel"], note: String(fd.get("note") ?? ""),
      consent: fd.get("consent") !== null, idempotencyKey: keyRef.current, consentVersion,
      file: apply && f ? { name: f.name, size: f.size, type: f.type } : null,
    };
    const errs = validateApplication(probe);
    setGeneral("");
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const post = (url: string, body: object) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      let res = await post("/api/applications/start", probe);
      let data = await res.json().catch(() => null);
      // Có CV: tải thẳng lên Storage rồi để máy chủ kiểm tra tệp thật; chỉ phản hồi của complete mới là thành công.
      if (res.ok && data?.upload && typeof data.id === "string" && f) {
        setProgress(0);
        try {
          await putFile(data.upload.signedUrl, f, setProgress);
        } catch {
          setGeneral("Không tải được CV lên. Dữ liệu của bạn vẫn được giữ — vui lòng thử lại.");
          return;
        } finally {
          setProgress(null);
        }
        res = await post("/api/applications/complete", { id: data.id, idempotencyKey: keyRef.current });
        data = await res.json().catch(() => null);
      }
      const se = data?.errors && typeof data.errors === "object" ? (data.errors as Record<string, string>) : null;
      if (isSuccess(res.ok, data)) setDone(`Đã nhận hồ sơ — mã ${data.refCode}`);
      else if (se && Object.keys(se).some((k) => se[k] && visible(k))) {
        setErrors(se);
        setTimeout(() => focusFirst(se), 0);
      }
      else setGeneral(data?.message || "Không gửi được hồ sơ. Vui lòng kiểm tra lại và thử lại.");
    } catch {
      setGeneral("Không gửi được do lỗi mạng. Dữ liệu của bạn vẫn được giữ — vui lòng thử lại.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const field = (name: string, label: string, el: (p: object) => React.ReactNode) => (
    <div>
      <label htmlFor={`f-${name}`} className="font-semibold">{label}</label>
      {el({ id: `f-${name}`, name, "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? `e-${name}` : undefined })}
      {errors[name] && <p id={`e-${name}`} className="mt-1 text-sm font-semibold text-red-800">{errors[name]}</p>}
    </div>
  );

  return (
    <>
    <p ref={statusRef} tabIndex={-1} role="status" className={done ? "rounded bg-green-50 px-4 py-3 font-semibold text-green-900" : undefined}>{done}</p>
    {!done && <form ref={formRef} onSubmit={onSubmit} method="post" action="/api/applications/start" encType="multipart/form-data" noValidate aria-busy={submitting} className="space-y-4">
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
          <span>Tôi đồng ý để xử lý thông tin cá nhân nhằm mục đích tuyển dụng và tư vấn, lưu tối đa {retentionMonths} tháng. Xem <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener" className="font-semibold text-brand underline">Chính sách bảo mật (mở tab mới)</a>.</span>
        </label>
        {errors.consent && <p id="e-consent" className="mt-1 text-sm font-semibold text-red-800">{errors.consent}</p>}
      </div>
      {progress !== null && (
        <label className="block text-sm font-semibold">
          Đang tải CV… {progress}%
          <progress value={progress} max={100} className="mt-1 block w-full" />
        </label>
      )}
      <button type="submit" disabled={submitting} aria-busy={submitting} className="inline-flex min-h-11 items-center justify-center rounded bg-brand px-6 font-semibold text-white disabled:opacity-60">
        {submitting ? "Đang gửi…" : general ? "Thử lại" : apply ? "Gửi hồ sơ" : "Gửi yêu cầu tư vấn"}
      </button>
    </form>}
    </>
  );
}
