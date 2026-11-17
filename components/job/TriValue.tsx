import type { Tri } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export default async function TriValue({ value, yes, no }: { value: Tri | undefined; yes?: string; no?: string }) {
  const { t } = await getT();
  if (value === true) return <span className="font-semibold text-success"><span aria-hidden="true">✓</span> {yes ?? t.detail.yes}</span>;
  if (value === false) return <span className="text-muted"><span aria-hidden="true">✗</span> {no ?? t.detail.no}</span>;
  return <span className="text-muted">{t.common.unconfirmed}</span>;
}
