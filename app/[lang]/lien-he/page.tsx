import type { Metadata } from "next";
import ApplicationForm from "@/components/ApplicationForm";
import { getSiteSettings } from "@/lib/data";
import { contactLinks } from "@/lib/contact";
import { languageAlternates, localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getT();
  return { title: t.pages.contact.title, alternates: { canonical: localePath(lang, "/lien-he"), languages: languageAlternates("/lien-he") } };
}

const link = "link font-semibold text-ink";

export default async function ContactPage() {
  const [s, { t }] = await Promise.all([getSiteSettings(), getT()]);
  const c = t.pages.contact;
  const items = contactLinks(s, t.contactLabels);
  return (
    <div className="space-y-16">
      <h1 className="text-[length:var(--text-display-s)]">{c.title}</h1>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((i) => <li key={i.label}>{i.label}: {i.href ? <a className={link} href={i.href}>{i.text}</a> : i.text}</li>)}
        </ul>
      ) : (
        <p>{c.noChannels}</p>
      )}
      <section id="tu-van" className="well grid scroll-mt-4 gap-8 p-6 sm:p-10 lg:grid-cols-12">
        <h2 className="lg:col-span-4">{c.consult}</h2>
        <div className="lg:col-span-8"><ApplicationForm kind="consult" jobCode={null} consentVersion={s.consentVersion} retentionMonths={s.retentionMonths} /></div>
      </section>
    </div>
  );
}
