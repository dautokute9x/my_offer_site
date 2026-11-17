import type { Metadata } from "next";
import Link from "next/link";
import AdminDemoNotice from "@/components/AdminDemoNotice";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quản trị", robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Tổng quan"], ["/admin/tin", "Tin tuyển dụng"], ["/admin/ho-so", "Hồ sơ"],
  ["/admin/danh-muc", "Danh mục"], ["/admin/nhap-csv", "Nhập CSV"], ["/admin/noi-dung", "Nội dung & liên hệ"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (isDemoMode()) return <AdminDemoNotice />;
  const { email } = await requireAdmin();
  return (
    <div className="space-y-6">
      <nav aria-label="Quản trị" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3 text-sm">
        {NAV.map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline">{label}</Link>)}
        <span className="ml-auto text-xs text-muted">{email}</span>
        <form action="/admin/logout" method="post">
          <button type="submit" className="min-h-11 font-semibold underline-offset-4 hover:underline">Đăng xuất</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
