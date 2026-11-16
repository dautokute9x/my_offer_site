"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formToRaw, normalizeJobInput, type Errors, type Raw } from "@/lib/admin/job-input";
import { getCatalog } from "@/lib/data";
import { jobHref } from "@/lib/filters";
import { createServerSupabase } from "@/lib/supabase/server";
import { jstToIso } from "@/lib/time";

export type FormState = { errors?: Errors; values?: Raw; nonce?: number };

function revalidateJob(job?: { slug: string; code: string } | null) {
  for (const p of ["/", "/viec-lam", "/lich-phong-van", "/sitemap.xml"]) revalidatePath(p);
  if (job) revalidatePath(jobHref(job));
}

const idOf = (v: unknown) => (/^\d{1,15}$/.test(String(v ?? "")) && Number(v) > 0 ? Number(v) : null);
const need = (v: unknown) => idOf(v) ?? (() => { throw new Error("Mã không hợp lệ."); })();

export async function saveJob(_prev: FormState, fd: FormData): Promise<FormState> {
  const rawId = String(fd.get("id") ?? "");
  await requireAdmin(`/admin/tin/${rawId || "moi"}`);
  const id = rawId ? idOf(rawId) : null;
  const raw = formToRaw(fd);
  if (rawId && id == null) return { errors: { form: "Mã nội bộ của tin không hợp lệ." }, values: raw, nonce: Date.now() };
  const r = normalizeJobInput(raw, await getCatalog());
  if ("errors" in r) return { errors: r.errors, values: raw, nonce: Date.now() };
  const sb = await createServerSupabase();
  const old = id != null ? (await sb.from("jobs").select("slug, code").eq("id", id).maybeSingle()).data : null;
  const { data, error } = await sb.rpc("admin_save_job", {
    p: { id, job: r.job, prefectureIds: r.prefectureIds, occupationIds: r.occupationIds, skillIds: r.skillIds, benefits: r.benefits, ackTranslation: fd.get("ackTranslation") === "1" },
  });
  if (error) {
    console.error("[admin/saveJob]", error.code, error.message);
    const errors: Errors = error.code === "23505" ? { code: "Mã tin đã tồn tại." } : { form: "Không lưu được tin. Thử lại hoặc báo quản trị viên." };
    return { errors, values: raw, nonce: Date.now() };
  }
  revalidateJob(old);
  revalidateJob({ slug: String(r.job.slug), code: String(r.job.code) });
  redirect(`/admin/tin/${data}?da-luu=1`);
}

export async function setJobStatus(rawId: number, status: "published" | "closed" | "draft") {
  await requireAdmin(`/admin/tin/${rawId}`);
  const id = need(rawId);
  if (!["published", "closed", "draft"].includes(status)) throw new Error("Trạng thái không hợp lệ");
  const sb = await createServerSupabase();
  const { data: job, error: e1 } = await sb.from("jobs").select("slug, code, published_at").eq("id", id).maybeSingle();
  if (e1 || !job) { console.error("[admin/setJobStatus]", e1?.code, e1?.message); throw new Error("Không tìm thấy tin"); }
  const { error } = await sb.from("jobs").update({
    status, ...(status === "published" && !job.published_at && { published_at: new Date().toISOString() }),
  }).eq("id", id);
  if (error) { console.error("[admin/setJobStatus]", error.code, error.message); throw new Error("Không đổi được trạng thái"); }
  revalidateJob(job);
  redirect(`/admin/tin/${id}?da-luu=1`);
}

async function interviewJob(jobId: number) {
  const sb = await createServerSupabase();
  const { data } = await sb.from("jobs").select("slug, code").eq("id", jobId).maybeSingle();
  return { sb, job: data };
}

export async function saveInterview(rawJobId: number, fd: FormData) {
  await requireAdmin(`/admin/tin/${rawJobId}`);
  const jobId = need(rawJobId);
  const date = String(fd.get("date") ?? ""), time = String(fd.get("time") ?? "");
  const fmt = String(fd.get("format") ?? "unknown");
  const bad = !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !["online", "onsite", "unknown"].includes(fmt);
  let startsAt: string | null = null;
  try { if (!bad) startsAt = jstToIso(date, time); } catch { /* ngày không tồn tại (vd 2026-13-45) */ }
  if (!startsAt) redirect(`/admin/tin/${jobId}?loi=lich`);
  const { sb, job } = await interviewJob(jobId);
  const { error } = await sb.from("interview_events").insert({
    job_id: jobId, starts_at: startsAt, format: fmt, public_note: String(fd.get("publicNote") ?? "").trim() || null,
  });
  if (error) { console.error("[admin/saveInterview]", error.code, error.message); redirect(`/admin/tin/${jobId}?loi=lich`); }
  revalidateJob(job);
  redirect(`/admin/tin/${jobId}?da-luu=1`);
}

export async function cancelInterview(rawJobId: number, rawEventId: number) {
  await requireAdmin(`/admin/tin/${rawJobId}`);
  const jobId = need(rawJobId), eventId = need(rawEventId);
  const { sb, job } = await interviewJob(jobId);
  const { error } = await sb.from("interview_events").update({ status: "cancelled" }).eq("id", eventId).eq("job_id", jobId);
  if (error) { console.error("[admin/cancelInterview]", error.code, error.message); throw new Error("Không hủy được lịch"); }
  revalidateJob(job);
  redirect(`/admin/tin/${jobId}?da-luu=1`);
}

export async function deleteInterview(rawJobId: number, rawEventId: number) {
  await requireAdmin(`/admin/tin/${rawJobId}`);
  const jobId = need(rawJobId), eventId = need(rawEventId);
  const { sb, job } = await interviewJob(jobId);
  const { error } = await sb.from("interview_events").delete().eq("id", eventId).eq("job_id", jobId);
  if (error) { console.error("[admin/deleteInterview]", error.code, error.message); throw new Error("Không xóa được lịch"); }
  revalidateJob(job);
  redirect(`/admin/tin/${jobId}?da-luu=1`);
}
