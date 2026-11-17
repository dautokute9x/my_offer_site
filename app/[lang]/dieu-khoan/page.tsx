import Link from "next/link";
import type { Metadata } from "next";
import PolicyDraftBanner from "@/components/PolicyDraftBanner";
import { getSiteSettings } from "@/lib/data";
import { languageAlternates, localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getT();
  return { title: t.pages.terms.title, alternates: { canonical: localePath(lang, "/dieu-khoan"), languages: languageAlternates("/dieu-khoan") } };
}

const h2 = "pt-4 text-[length:var(--text-title)]";

export default async function Page() {
  const [{ policiesConfirmed, retentionMonths }, { lang, t }] = await Promise.all([getSiteSettings(), getT()]);
  const p = t.pages.terms;
  return (
    <article className="prose-body space-y-5">
      <h1 className="text-[length:var(--text-display-s)]">{p.title}</h1>
      {lang !== "vi" && <p role="note" className="border-l-4 border-ink bg-paper-3 px-4 py-3 font-semibold text-ink">{t.common.legalVersionNote}</p>}
      {!policiesConfirmed && <PolicyDraftBanner />}
      <h2 className={h2}>{p.scopeH}</h2>
      <p>{p.scope}</p>
      <h2 className={h2}>{p.jobsH}</h2>
      <p>{p.jobs}</p>
      <h2 className={h2}>{p.dataH}</h2>
      <p>{fmt(p.dataBefore, { months: retentionMonths })}<Link href={localePath(lang, "/chinh-sach-bao-mat")} className="link">{p.dataLink}</Link>{p.dataAfter}</p>
    </article>
  );
}
