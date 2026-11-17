import Link from "next/link";
import { PurgeForm } from "@/components/admin/ApplicationForms";
import { isValidStatus, STATUS_LABELS } from "@/lib/applications/status";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatJst } from "@/lib/time";

export const dynamic = "force-dynamic";
const PAGE = 20;
const staleCutoff = () => new Date(Date.now() - 24 * 3600_000).toISOString();

export default async function ApplicationsAdmin({ searchParams }: { searchParams: Promise<{ tt?: string; tin?: string; trang?: string; "da-xoa"?: string }> }) {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  await requireAdmin("/admin/ho-so");
  const sp = await searchParams;
  const tt = isValidStatus(sp.tt) ? sp.tt : "";
  const tin = (sp.tin ?? "").replace(/[^\w-]/g, "").slice(0, 40);
  const page = /^\d{1,5}$/.test(sp.trang ?? "") ? Math.max(1, Number(sp.trang)) : 1;
  const sb = await createServerSupabase();
  let q = sb.from("applications").select("id, ref_code, full_name, email, phone, facebook, job_code, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (tt) q = q.eq("status", tt);
  else q = q.or(`status.neq.pending_upload,created_at.gte.${staleCutoff()}`); // ẩn pending_upload quá 24 giờ
  if (tin) q = q.ilike("job_code", tin.replace(/_/g, "\\_")); // không phân biệt hoa/thường; "_" là ký tự đại diện của ilike
  const { data, count, error } = await q;
  if (error) {
    console.error("[admin/ho-so]", error.code);
    return <p role="alert" className="text-error">Không tải được danh sách hồ sơ.</p>;
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (p: number) => `/admin/ho-so?${new URLSearchParams({ ...(tt && { tt }), ...(tin && { tin }), trang: String(p) })}`;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hồ sơ ứng viên</h1>
      {sp["da-xoa"] && <p role="status" className="text-sm text-success">Đã xóa hồ sơ.</p>}
      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="text-sm font-semibold">Mã tin
          <input name="tin" defaultValue={tin} className="mt-1 block min-h-11 rounded border px-3 font-normal" />
        </label>
        <label className="text-sm font-semibold">Trạng thái
          <select name="tt" defaultValue={tt} className="mt-1 block min-h-11 rounded border px-3 font-normal">
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded border px-4 font-semibold">Lọc</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="py-2 pr-3">Mã</th><th className="pr-3">Họ tên</th><th className="pr-3">Liên hệ</th><th className="pr-3">Tin</th><th className="pr-3">Nhận lúc</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2 pr-3"><Link href={`/admin/ho-so/${a.id}`} className="inline-flex min-h-11 items-center underline">{a.ref_code}</Link></td>
                <td className="pr-3">{a.full_name}</td>
                <td className="pr-3">{a.email || a.phone || a.facebook || "—"}</td>
                <td className="pr-3">{a.job_code || "Tư vấn"}</td>
                <td className="pr-3">{formatJst(a.created_at)}</td>
                <td>{STATUS_LABELS[a.status as keyof typeof STATUS_LABELS]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data ?? []).length === 0 && <p className="py-4 text-sm text-muted">Không có hồ sơ nào.</p>}
      </div>
      {pages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={href(page - 1)} className="inline-flex min-h-11 items-center underline">← Trước</Link>}
          <span>Trang {page}/{pages}</span>
          {page < pages && <Link href={href(page + 1)} className="inline-flex min-h-11 items-center underline">Sau →</Link>}
        </nav>
      )}
      <section aria-labelledby="h-purge" className="space-y-2 border-t pt-4">
        <h2 id="h-purge" className="text-lg font-bold">Dọn dẹp</h2>
        <p className="text-sm text-muted">Xóa hồ sơ đã quá hạn lưu và hồ sơ chờ tải CV quá 24 giờ, kèm CV.</p>
        <PurgeForm />
      </section>
    </div>
  );
}
