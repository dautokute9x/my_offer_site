import { isDemoMode } from "@/lib/data";
import { getT } from "@/lib/i18n/server";

export default async function DemoBanner() {
  if (!isDemoMode()) return null;
  const { t } = await getT();
  return (
    <div role="status" className="border-b-2 border-accent-2/30 bg-paper-3 px-4 py-2 text-center text-sm text-ink">
      {t.common.demoBanner}
    </div>
  );
}
