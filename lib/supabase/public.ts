import { createClient } from "@supabase/supabase-js";

// Client ẩn danh không cookie: trang công khai không thành dynamic, ISR (revalidate) vẫn chạy.
export function createPublicSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
