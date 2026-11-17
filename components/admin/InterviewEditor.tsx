"use client";
import { useActionState } from "react";
import { cancelInterview, deleteInterview, saveInterview, type InterviewState } from "@/app/admin/(protected)/tin/actions";
import { formatJst } from "@/lib/time";
import type { InterviewEvent } from "@/lib/types";

const FORMAT = { online: "Online", onsite: "Trực tiếp", unknown: "Chưa xác nhận" };
const input = "mt-1 block min-h-11 rounded border px-3 font-normal";
const btn = "min-h-11 rounded border px-3 text-sm font-semibold";

export default function InterviewEditor({ jobId, events, missing }: { jobId: number; events: InterviewEvent[]; missing?: boolean }) {
  const [state, action, pending] = useActionState<InterviewState, FormData>(saveInterview.bind(null, jobId), {});
  const v = state.values ?? {};
  return (
    <section aria-labelledby="h-pv" className="space-y-3">
      <h2 id="h-pv" className="text-lg font-bold">Lịch phỏng vấn</h2>
      {missing && <p role="alert" className="text-sm text-error">Không tìm thấy lịch phỏng vấn (có thể đã bị xóa).</p>}
      {events.length === 0 ? <p className="text-sm text-muted">Chưa có lịch.</p> : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm">
              <span className={e.status === "cancelled" ? "line-through" : ""}>{formatJst(e.startsAt)} · {FORMAT[e.format]}{e.publicNote && ` · ${e.publicNote}`}</span>
              {e.status === "cancelled" && <span className="rounded bg-paper-3 px-2 text-xs">Đã hủy</span>}
              <span className="ml-auto flex gap-2">
                {e.status === "scheduled" && <form action={cancelInterview.bind(null, jobId, e.id)}><button className={btn}>Hủy lịch</button></form>}
                <form action={deleteInterview.bind(null, jobId, e.id)}><button className={`${btn} text-error`}>Xóa</button></form>
              </span>
            </li>
          ))}
        </ul>
      )}
      {state.error && <p id="e-lich" role="alert" className="text-sm text-error">{state.error}</p>}
      <form key={state.nonce ?? 0} action={action} className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">Ngày (JST)<input type="date" name="date" required defaultValue={v.date} className={input} /></label>
        <label className="text-sm font-semibold">Giờ (JST)<input type="time" name="time" required defaultValue={v.time} className={input} /></label>
        <label className="text-sm font-semibold">Hình thức
          <select name="format" defaultValue={v.format} className={input}><option value="unknown">Chưa xác nhận</option><option value="online">Online</option><option value="onsite">Trực tiếp</option></select>
        </label>
        <label className="text-sm font-semibold">Ghi chú công khai<input name="publicNote" defaultValue={v.publicNote} className={input} /></label>
        <button type="submit" disabled={pending} className="min-h-11 rounded bg-ink px-4 font-semibold text-paper">Thêm lịch</button>
      </form>
    </section>
  );
}
