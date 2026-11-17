"use client";
import { useActionState, useId } from "react";
import { addNote, changeStatus, deleteApplication, purgeExpired, type AppState } from "@/app/admin/(protected)/ho-so/actions";
import { STATUS_LABELS } from "@/lib/applications/status";

const input = "mt-1 block min-h-11 w-full rounded border px-3 font-normal";
const btn = "min-h-11 rounded bg-ink px-4 font-semibold text-paper disabled:opacity-60";

function Msg({ s, id }: { s: AppState; id: string }) {
  return (
    <>
      {s.error && <p id={id} role="alert" className="text-sm text-error">{s.error}</p>}
      {s.ok && <p role="status" className="text-sm text-success">{s.ok}</p>}
    </>
  );
}

export function StatusForm({ id, status }: { id: string; status: string }) {
  const uid = useId();
  const locked = status === "pending_upload";
  const [s, action, pending] = useActionState<AppState, FormData>(changeStatus, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="text-sm font-semibold">Trạng thái
        <select name="status" defaultValue={status} disabled={locked} className={input} aria-describedby={s.error ? uid : undefined}>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k} disabled={k === "pending_upload"}>{l}</option>)}
        </select>
      </label>
      {locked && <p className="text-sm text-muted">Hồ sơ chưa tải xong CV</p>}
      <button type="submit" disabled={pending || locked} className={btn}>Lưu trạng thái</button>
      <Msg s={s} id={uid} />
    </form>
  );
}

export function NoteForm({ id }: { id: string }) {
  const uid = useId();
  const [s, action, pending] = useActionState<AppState, FormData>(addNote, {});
  return (
    <form key={s.ok ? s.nonce : 0} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm font-semibold">Thêm ghi chú nội bộ
        <textarea name="body" required maxLength={2000} rows={3} className={`${input} py-2`} aria-invalid={s.error ? true : undefined} aria-describedby={s.error ? uid : undefined} />
      </label>
      <button type="submit" disabled={pending} className={btn}>Thêm ghi chú</button>
      <Msg s={s} id={uid} />
    </form>
  );
}

export function DeleteForm({ id, refCode }: { id: string; refCode: string }) {
  const uid = useId();
  const [s, action, pending] = useActionState<AppState, FormData>(deleteApplication, {});
  return (
    <form action={action} className="space-y-2 rounded border border-error p-3">
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm font-semibold">Xóa hồ sơ và CV vĩnh viễn: nhập <code>{refCode}</code> để xác nhận
        <input name="confirm" required autoComplete="off" className={input} aria-invalid={s.error ? true : undefined} aria-describedby={s.error ? uid : undefined} />
      </label>
      <button type="submit" disabled={pending} className="min-h-11 rounded bg-error px-4 font-semibold text-paper disabled:opacity-60">Xóa hồ sơ</button>
      <Msg s={s} id={uid} />
    </form>
  );
}

export function PurgeForm() {
  const uid = useId();
  const [s, action, pending] = useActionState<AppState, FormData>(purgeExpired, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="min-h-11 rounded border px-4 font-semibold disabled:opacity-60">Dọn hồ sơ quá hạn lưu</button>
      <Msg s={s} id={uid} />
    </form>
  );
}
