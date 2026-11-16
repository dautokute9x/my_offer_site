"use client";
import { useActionState, useId } from "react";
import { saveSettings, wipeDemoJobs, type SettingsState, type WipeState } from "@/app/admin/(protected)/noi-dung/actions";
import type { SiteSettings } from "@/lib/site-defaults";

const input = "mt-1 block min-h-11 w-full rounded border px-3 font-normal";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const uid = useId();
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const e = state.errors ?? {};
  const v = (k: keyof SiteSettings) => state.values?.[k] ?? String(initial[k]);
  const err = (k: string) => e[k] && <p id={`${uid}-${k}`} role="alert" className="text-sm text-red-700">{e[k]}</p>;
  const aria = (k: string) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": `${uid}-${k}` } : {});
  const field = (k: keyof SiteSettings, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="block text-sm font-semibold">{label}
        <input name={k} defaultValue={v(k)} className={input} {...aria(k)} {...extra} />
      </label>
      {err(k)}
    </div>
  );
  return (
    <form key={state.nonce ?? 0} action={action} className="space-y-4">
      {err("form")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("brandName", "Tên thương hiệu", { required: true, maxLength: 100 })}
        {field("domain", "Tên miền")}
        {field("email", "Email liên hệ")}
        {field("phone", "Điện thoại")}
        {field("zalo", "Zalo")}
        {field("facebookUrl", "Liên kết Facebook (https://)")}
        {field("zaloGroupUrl", "Liên kết nhóm Zalo (https://)")}
        {field("consentVersion", "Phiên bản đồng ý", { required: true, maxLength: 50 })}
        {field("retentionMonths", "Thời hạn lưu hồ sơ (tháng, 1–60)", { required: true, inputMode: "numeric" })}
      </div>
      <div>
        <label className="block text-sm font-semibold">Giới thiệu
          <textarea name="aboutText" rows={6} defaultValue={v("aboutText")} className={`${input} py-2`} {...aria("aboutText")} />
        </label>
        {err("aboutText")}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="policiesConfirmed" defaultChecked={state.values ? state.values.policiesConfirmed === "on" : initial.policiesConfirmed} />
        Đã xác nhận các chính sách (quyền riêng tư, điều khoản)
      </label>
      <button type="submit" disabled={pending} className="min-h-11 rounded bg-navy px-4 font-semibold text-white disabled:opacity-60">Lưu</button>
      {state.ok && <span role="status" className="ml-3 text-sm text-green-800">Đã lưu.</span>}
    </form>
  );
}

export function WipeDemo({ count }: { count: number }) {
  const [state, action, pending] = useActionState<WipeState, FormData>(wipeDemoJobs, {});
  return (
    <form action={action} className="space-y-3 rounded border border-red-300 p-4">
      <p className="text-sm">Hiện có <strong>{count}</strong> tin demo. Xóa vĩnh viễn cùng lịch phỏng vấn của các tin đó; hồ sơ ứng tuyển được giữ lại.</p>
      <label className="block text-sm font-semibold">Gõ XOA để xác nhận
        <input name="confirm" autoComplete="off" aria-describedby="wipe-msg" className={`${input} max-w-xs`} />
      </label>
      <button type="submit" disabled={pending} className="min-h-11 rounded border border-red-700 px-4 font-semibold text-red-700 disabled:opacity-60">Xóa toàn bộ tin demo</button>
      <p id="wipe-msg" role={state.error ? "alert" : "status"} className={state.error ? "text-sm text-red-700" : "text-sm text-green-800"}>
        {state.error ?? (state.deleted != null ? `Đã xóa ${state.deleted} tin demo.` : "")}
      </p>
    </form>
  );
}
