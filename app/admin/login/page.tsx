import type { Metadata } from "next";
import AdminDemoNotice from "@/components/AdminDemoNotice";
import { safeNext } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { login } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đăng nhập quản trị", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "Email hoặc mật khẩu không đúng.",
  forbidden: "Tài khoản này không có quyền quản trị.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  if (isDemoMode()) return <AdminDemoNotice />;
  const { error, next } = await searchParams;
  const message = error && Object.hasOwn(ERRORS, error) ? ERRORS[error] : null;
  return (
    <form action={login} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Đăng nhập quản trị</h1>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      <input type="hidden" name="next" value={safeNext(next)} />
      <label className="block text-sm font-semibold">Email
        <input name="email" type="email" required autoComplete="username" className="mt-1 block min-h-11 w-full rounded border px-3 font-normal" />
      </label>
      <label className="block text-sm font-semibold">Mật khẩu
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 block min-h-11 w-full rounded border px-3 font-normal" />
      </label>
      <button type="submit" className="min-h-11 rounded bg-navy px-5 font-semibold text-white">Đăng nhập</button>
    </form>
  );
}
