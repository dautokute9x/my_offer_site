import { createClient } from "@supabase/supabase-js";

// Client ẩn danh không cookie: trang công khai không thành dynamic, ISR (revalidate) vẫn chạy.
export function createPublicSupabase() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
