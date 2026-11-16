import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatJst } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { draft: "Nháp", published: "Đang đăng", closed: "Đã đóng" };

type InterviewRow = { id: number; starts_at: string; jobs: { code: string; title_vi: string } | null };

export default async function Dashboard() {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  await requireAdmin();
  const sb = await createServerSupabase();
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 864e5).toISOString();
  const [jobs, apps, events] = await Promise.all([
    sb.from("jobs").select("id, code, title_vi, status, salary_needs_review"),
    sb.from("applications").select("id", { count: "exact", head: true }).eq("status", "new").gte("created_at", since),
    sb.from("interview_events").select("id, starts_at, jobs(code, title_vi)").eq("status", "scheduled")
      .gte("starts_at", now.toISOString()).order("starts_at").limit(5).overrideTypes<InterviewRow[]>(),
  ]);
  const err = jobs.error ?? apps.error ?? events.error;
  if (err) {
    console.error("[admin/dashboard]", err.code, err.message);
    return <p role="alert" className="text-red-700">Không tải được dữ liệu tổng quan.</p>;
  }
  const rows = jobs.data ?? [];
  const upcoming = events.data ?? [];
  const review = rows.filter((j) => j.salary_needs_review);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tổng quan</h1>
      <section aria-labelledby="h-jobs">
        <h2 id="h-jobs" className="mb-2 font-semibold">Tin tuyển dụng theo trạng thái</h2>
        <ul className="flex flex-wrap gap-3">
          {Object.entries(STATUS_LABEL).map(([s, label]) => (
            <li key={s} className="rounded border px-4 py-2">{label}: <strong>{rows.filter((j) => j.status === s).length}</strong></li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="h-apps">
        <h2 id="h-apps" className="mb-2 font-semibold">Hồ sơ mới trong 7 ngày gần nhất</h2>
        <p><strong>{apps.count ?? 0}</strong> hồ sơ</p>
      </section>
      <section aria-labelledby="h-iv">
        <h2 id="h-iv" className="mb-2 font-semibold">5 lịch phỏng vấn sắp tới</h2>
        {upcoming.length === 0 ? <p className="text-sm text-gray-600">Chưa có lịch.</p> : (
          <ul className="space-y-1 text-sm">
            {upcoming.map((e) => <li key={e.id}>{formatJst(e.starts_at)} — {e.jobs ? `${e.jobs.code} ${e.jobs.title_vi}` : "(tin đã xóa)"}</li>)}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-sal">
        <h2 id="h-sal" className="mb-2 font-semibold">Tin cần kiểm tra lương</h2>
        {review.length === 0 ? <p className="text-sm text-gray-600">Không có.</p> : (
          <ul className="list-disc pl-5 text-sm">
            {review.map((j) => <li key={j.id}><Link href={`/admin/tin/${j.id}`} className="underline">{j.code} — {j.title_vi}</Link></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
