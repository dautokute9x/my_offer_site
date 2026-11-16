import Link from "next/link";
import { notFound } from "next/navigation";
import InterviewEditor from "@/components/admin/InterviewEditor";
import JobForm from "@/components/admin/JobForm";
import JobDetailFull from "@/components/job/JobDetailFull";
import { loadAdminJob } from "@/lib/admin/job-load";
import { requireAdmin } from "@/lib/auth";
import { getCatalog, isDemoMode } from "@/lib/data";
import { jobHref } from "@/lib/filters";
import { setJobStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditJob({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ xem?: string; "da-luu"?: string; loi?: string }>;
}) {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  const { id: idParam } = await params;
  const sp = await searchParams;
  await requireAdmin(`/admin/tin/${idParam}${sp.xem ? "?xem=truoc" : ""}`);
  const catalog = await getCatalog();
  if (idParam === "moi") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tạo tin mới</h1>
        <JobForm catalog={catalog} initial={{ status: "draft", translationStatus: "none" }} />
      </div>
    );
  }
  if (!/^\d{1,15}$/.test(idParam)) notFound();
  const id = Number(idParam);
  const data = await loadAdminJob(id);
  if (!data) notFound();
  const { job, interviews, raw, sourceChanged } = data;
  const statusBtn = (to: "published" | "closed" | "draft", label: string) =>
    job.status !== to && <form action={setJobStatus.bind(null, id, to)}><button className="min-h-11 rounded border px-4 text-sm font-semibold">{label}</button></form>;

  if (sp.xem === "truoc") {
    return (
      <div className="space-y-4">
        {job.status !== "published" && <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm font-semibold">Xem trước — chưa công khai</p>}
        <h1 className="text-2xl font-bold">{job.code} — {job.titleVi}</h1>
        <p><Link href={`/admin/tin/${id}`} className="inline-flex min-h-11 items-center underline">← Quay lại chỉnh sửa</Link></p>
        <JobDetailFull job={job} catalog={catalog} interviews={interviews.filter((e) => e.status === "scheduled")} />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{job.code} — {job.titleVi}</h1>
        <Link href={`/admin/tin/${id}?xem=truoc`} className="inline-flex min-h-11 items-center rounded border px-4 text-sm font-semibold">Xem trước</Link>
        {job.status !== "draft" && <Link href={jobHref(job)} className="inline-flex min-h-11 items-center text-sm underline">Trang công khai</Link>}
        {statusBtn("published", "Đăng tin")}{statusBtn("closed", "Đóng tin")}{statusBtn("draft", "Chuyển về nháp")}
      </div>
      {sp["da-luu"] && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-900">Đã lưu.</p>}
      <JobForm catalog={catalog} initial={raw} id={id} sourceChanged={sourceChanged} />
      <InterviewEditor jobId={id} events={interviews} error={sp.loi === "lich"} />
    </div>
  );
}
