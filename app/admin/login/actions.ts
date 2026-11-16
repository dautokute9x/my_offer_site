"use server";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  if (isDemoMode()) redirect("/admin/login");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    if (error.code !== "invalid_credentials") console.error("[admin/login]", error.code, error.message);
    redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }
  redirect(next); // requireAdmin của trang đích kiểm tra quyền admin
}
