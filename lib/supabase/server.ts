import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client mang phiên của người dùng (đọc/ghi cookie).
export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(list) { // bỏ qua headers cache: Server Component không đặt được header phản hồi; proxy.ts đặt chúng cho /admin
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server Component không ghi được cookie; proxy.ts đã làm mới phiên.
          }
        },
      },
    },
  );
}
