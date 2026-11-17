import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm, NoteForm, StatusForm } from "@/components/admin/ApplicationForms";
import { STATUS_LABELS, UUID_RE } from "@/lib/applications/status";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatJst } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  const { id } = await params;
  await requireAdmin(`/admin/ho-so/${id}`);
  if (!UUID_RE.test(id)) notFound();
  const sb = await createServerSupabase();
  const [a, n] = await Promise.all([
    sb.from("applications").select("*").eq("id", id).maybeSingle(),
    sb.from("application_notes").select("id, body, created_at, author_id").eq("application_id", id).order("created_at", { ascending: false }),
  ]);
  if (a.error || n.error) {
    console.error("[admin/ho-so/id]", a.error?.code, n.error?.code);
    return <p role="alert" className="text-error">Không tải được hồ sơ.</p>;
  }
  const app = a.data;
  if (!app) notFound();
  const rows: [string, string][] = [
    ["Họ tên", app.full_name], ["Email", app.email ?? "—"], ["Điện thoại", app.phone ?? "—"], ["Facebook", app.facebook ?? "—"],
    ["Tiếng Nhật", app.jp_level ?? "—"], ["Tin", app.job_code ? `${app.job_code} — ${app.job_title ?? ""}` : "Tư vấn"],
    ["Loại", app.kind === "apply" ? "Ứng tuyển" : "Tư vấn"], ["Nhận lúc", formatJst(app.created_at)],
    ["Đồng ý điều khoản", `${app.consent_version} · ${formatJst(app.consent_at)}`], ["Hạn lưu", app.delete_after ?? "—"],
  ];
  return (
    <div className="space-y-6">
      <p><Link href="/admin/ho-so" className="inline-flex min-h-11 items-center underline">← Danh sách hồ sơ</Link></p>
      <h1 className="text-2xl font-bold">{app.ref_code} <span className="text-base font-normal">({STATUS_LABELS[app.status as keyof typeof STATUS_LABELS]})</span></h1>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold">{k}</dt><dd className="break-words">{v}</dd></div>)}
        <dt className="font-semibold">Ghi chú của ứng viên</dt><dd className="whitespace-pre-wrap break-words">{app.note || "—"}</dd>
        <dt className="font-semibold">CV</dt>
        <dd>{app.cv_path && app.status !== "pending_upload"
          ? <a href={`/admin/ho-so/${app.id}/cv`} className="inline-flex min-h-11 items-center underline">Tải CV</a> : "Không có CV"}</dd>
      </dl>
      <StatusForm id={app.id} status={app.status} />
      <section aria-labelledby="h-notes" className="space-y-3">
        <h2 id="h-notes" className="text-xl font-bold">Ghi chú nội bộ</h2>
        <NoteForm id={app.id} />
        <ul className="space-y-2">
          {(n.data ?? []).map((x) => (
            <li key={x.id} className="rounded border p-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{x.body}</p>
              <p className="mt-1 text-xs text-muted">{formatJst(x.created_at)} · {x.author_id ? `QTV ${x.author_id.slice(0, 8)}` : "QTV đã xóa"}</p>
            </li>
          ))}
        </ul>
      </section>
      <DeleteForm id={app.id} refCode={app.ref_code} />
    </div>
  );
}
