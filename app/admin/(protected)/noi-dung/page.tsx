import { SettingsForm, WipeDemo } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings, isDemoMode } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContentAdmin() {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  await requireAdmin("/admin/noi-dung");
  const sb = await createServerSupabase();
  const [settings, demo] = await Promise.all([
    getSiteSettings(), sb.from("jobs").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  if (demo.error) console.error("[admin/noi-dung]", demo.error.code);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Nội dung &amp; liên hệ</h1>
      <SettingsForm initial={settings} />
      <section aria-labelledby="h-wipe" className="space-y-3">
        <h2 id="h-wipe" className="text-xl font-bold">Dọn tin demo</h2>
        <WipeDemo count={demo.count ?? 0} />
      </section>
    </div>
  );
}
