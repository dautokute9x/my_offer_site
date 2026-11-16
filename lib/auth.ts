import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

// Chống open redirect: chỉ nhận đường dẫn nội bộ trong /admin.
export function safeNext(next: string | null | undefined): string {
  return next && /^\/admin(?:$|[/?](?![/\\]))/.test(next) && !next.includes("\\") ? next : "/admin";
}

// Mọi page/layout/server action của admin phải gọi hàm này. Không phải admin → signOut + về trang đăng nhập
// (không dùng forbidden(): cần cấu hình thử nghiệm authInterrupts).
export async function requireAdmin(next = "/admin"): Promise<{ userId: string; email: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser(); // xác thực phía server, không dùng getSession()
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(safeNext(next))}`);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }
  return { userId: user.id, email: user.email ?? "" };
}
