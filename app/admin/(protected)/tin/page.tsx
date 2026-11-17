import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE = 20;
const STATUS: Record<string, string> = { draft: "Nháp", published: "Đang đăng", closed: "Đã đóng" };

export default async function JobsAdmin({ searchParams }: { searchParams: Promise<{ tt?: string; q?: string; trang?: string }> }) {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  await requireAdmin("/admin/tin");
  const sp = await searchParams;
  const tt = sp.tt && Object.hasOwn(STATUS, sp.tt) ? sp.tt : "";
  const q = (sp.q ?? "").replace(/[,()%*_\\"']/g, " ").trim().slice(0, 100);
  const page = /^\d{1,5}$/.test(sp.trang ?? "") ? Math.max(1, Number(sp.trang)) : 1;
  const sb = await createServerSupabase();
  let query = sb.from("jobs").select("id, code, title_vi, status, salary_needs_review, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (tt) query = query.eq("status", tt);
  if (q) query = query.or(`code.ilike.%${q}%,title_vi.ilike.%${q}%`);
  const { data, count, error } = await query;
  if (error) {
    console.error("[admin/tin]", error.code, error.message);
    return <p role="alert" className="text-error">Không tải được danh sách tin.</p>;
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (p: number) => `/admin/tin?${new URLSearchParams({ ...(tt && { tt }), ...(q && { q }), trang: String(p) })}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tin tuyển dụng</h1>
        <Link href="/admin/tin/moi" className="inline-flex min-h-11 items-center rounded bg-ink px-4 font-semibold text-paper">Tạo tin mới</Link>
      </div>
      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="text-sm font-semibold">Tìm theo mã hoặc tiêu đề
          <input name="q" defaultValue={q} className="mt-1 block min-h-11 rounded border px-3 font-normal" />
        </label>
        <label className="text-sm font-semibold">Trạng thái
          <select name="tt" defaultValue={tt} className="mt-1 block min-h-11 rounded border px-3 font-normal">
            <option value="">Tất cả</option>
            {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded border px-4 font-semibold">Lọc</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="py-2 pr-3">Mã</th><th className="pr-3">Tiêu đề</th><th className="pr-3">Trạng thái</th><th>Cập nhật</th></tr></thead>
          <tbody>
            {(data ?? []).map((j) => (
              <tr key={j.id} className="border-b">
                <td className="py-2 pr-3"><Link href={`/admin/tin/${j.id}`} className="inline-flex min-h-11 items-center underline">{j.code}</Link></td>
                <td className="pr-3">{j.title_vi}{j.salary_needs_review && <span className="ml-2 rounded bg-paper-3 px-2 text-xs">Kiểm tra lương</span>}</td>
                <td className="pr-3">{STATUS[j.status]}</td>
                <td>{j.updated_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data ?? []).length === 0 && <p className="py-4 text-sm text-muted">Không có tin nào.</p>}
      </div>
      {pages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={href(page - 1)} className="inline-flex min-h-11 items-center underline">← Trước</Link>}
          <span>Trang {page}/{pages}</span>
          {page < pages && <Link href={href(page + 1)} className="inline-flex min-h-11 items-center underline">Sau →</Link>}
        </nav>
      )}
    </div>
  );
}
