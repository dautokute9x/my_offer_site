import { cache } from "react";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

// Chống open redirect: chỉ nhận đường dẫn nội bộ trong /admin (parse URL để chuẩn hóa ., .., \).
export function safeNext(next: string | null | undefined): string {
  if (!next || /[\r\n]/.test(next)) return "/admin";
  try {
    const u = new URL(next, "http://x");
    return u.origin === "http://x" && /^\/admin(\/|$)/.test(u.pathname) ? u.pathname + u.search : "/admin";
  } catch {
    return "/admin";
  }
}

// Mọi page/layout/server action của admin phải gọi hàm này. Không phải admin → signOut + về trang đăng nhập
// (không dùng forbidden(): cần cấu hình thử nghiệm authInterrupts).
export const requireAdmin = cache(async (next = "/admin"): Promise<{ userId: string; email: string }> => {
  if (isDemoMode()) throw new Error("requireAdmin được gọi ở chế độ demo");
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser(); // xác thực phía server, không dùng getSession()
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(safeNext(next))}`);
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) {
    // Lỗi hạ tầng không có nghĩa là "không phải admin": không signOut, để error boundary xử lý.
    console.error("[auth] is_admin", error.code, error.message);
    throw new Error("Không kiểm tra được quyền quản trị");
  }
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }
  return { userId: user.id, email: user.email ?? "" };
});
