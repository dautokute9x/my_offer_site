import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service role: bỏ qua RLS, chỉ dùng phía server, không có phiên.
export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY (cần cho createAdminSupabase)");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
