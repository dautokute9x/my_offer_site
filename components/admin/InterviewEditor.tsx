import { cancelInterview, deleteInterview, saveInterview } from "@/app/admin/(protected)/tin/actions";
import { formatJst } from "@/lib/time";
import type { InterviewEvent } from "@/lib/types";

const FORMAT = { online: "Online", onsite: "Trực tiếp", unknown: "Chưa xác nhận" };
const input = "mt-1 block min-h-11 rounded border px-3 font-normal";
const btn = "min-h-11 rounded border px-3 text-sm font-semibold";

export default function InterviewEditor({ jobId, events, error }: { jobId: number; events: InterviewEvent[]; error?: boolean }) {
  return (
    <section aria-labelledby="h-pv" className="space-y-3">
      <h2 id="h-pv" className="text-lg font-bold">Lịch phỏng vấn</h2>
      {error && <p role="alert" className="text-sm text-red-700">Ngày hoặc giờ không hợp lệ, chưa lưu lịch.</p>}
      {events.length === 0 ? <p className="text-sm text-gray-600">Chưa có lịch.</p> : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm">
              <span className={e.status === "cancelled" ? "line-through" : ""}>{formatJst(e.startsAt)} · {FORMAT[e.format]}{e.publicNote && ` · ${e.publicNote}`}</span>
              {e.status === "cancelled" && <span className="rounded bg-gray-200 px-2 text-xs">Đã hủy</span>}
              <span className="ml-auto flex gap-2">
                {e.status === "scheduled" && <form action={cancelInterview.bind(null, jobId, e.id)}><button className={btn}>Hủy lịch</button></form>}
                <form action={deleteInterview.bind(null, jobId, e.id)}><button className={`${btn} text-red-700`}>Xóa</button></form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form action={saveInterview.bind(null, jobId)} className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">Ngày (JST)<input type="date" name="date" required className={input} /></label>
        <label className="text-sm font-semibold">Giờ (JST)<input type="time" name="time" required className={input} /></label>
        <label className="text-sm font-semibold">Hình thức
          <select name="format" className={input}><option value="unknown">Chưa xác nhận</option><option value="online">Online</option><option value="onsite">Trực tiếp</option></select>
        </label>
        <label className="text-sm font-semibold">Ghi chú công khai<input name="publicNote" className={input} /></label>
        <button type="submit" className="min-h-11 rounded bg-navy px-4 font-semibold text-white">Thêm lịch</button>
      </form>
    </section>
  );
}
