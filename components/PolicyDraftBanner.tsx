import { getT } from "@/lib/i18n/server";

export default async function PolicyDraftBanner() {
  const { t } = await getT();
  return <p role="note" className="border-l-4 border-ink bg-paper-3 p-4 font-semibold text-ink">{t.common.policyDraft}</p>;
}
