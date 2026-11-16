import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/ho-so/${id}`);
  const notFound = () => new NextResponse("Not found", { status: 404, headers: NO_STORE });
  if (!UUID.test(id)) return notFound();
  const sb = await createServerSupabase();
  const { data: app, error } = await sb.from("applications").select("ref_code, status, cv_path").eq("id", id).maybeSingle();
  if (error) { console.error("[admin/cv]", error.code); return new NextResponse("Error", { status: 500, headers: NO_STORE }); }
  if (!app?.cv_path || app.status === "pending_upload") return notFound();
  const ext = app.cv_path.slice(app.cv_path.lastIndexOf(".") + 1);
  // Service role chỉ sau khi requireAdmin đã qua. Không stream qua server: chuyển hướng tới URL 60 giây.
  const { data, error: se } = await createAdminSupabase().storage.from("cvs").createSignedUrl(app.cv_path, 60, { download: `${app.ref_code}.${ext}` });
  if (se || !data) { console.error("[admin/cv] sign", se?.message); return new NextResponse("Error", { status: 500, headers: NO_STORE }); }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: NO_STORE });
}
