import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Chỉ POST: GET không được đăng xuất (tránh CSRF qua thẻ <img>/link).
export async function POST(request: Request) {
  if (!isDemoMode()) await (await createServerSupabase()).auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
