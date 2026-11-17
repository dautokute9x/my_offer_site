import type { Metadata } from "next";
import ApplicationForm from "@/components/ApplicationForm";
import { getSiteSettings } from "@/lib/data";
import { contactLinks } from "@/lib/contact";

export const metadata: Metadata = { title: "Liên hệ", alternates: { canonical: "/lien-he" } };

const link = "link font-semibold text-ink";

export default async function ContactPage() {
  const s = await getSiteSettings();
  const items = contactLinks(s);
  return (
    <div className="space-y-16">
      <h1 className="text-[length:var(--text-display-s)]">Liên hệ</h1>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((i) => <li key={i.label}>{i.label}: {i.href ? <a className={link} href={i.href}>{i.text}</a> : i.text}</li>)}
        </ul>
      ) : (
        <p>Kênh liên hệ chưa được cập nhật.</p>
      )}
      <section id="tu-van" className="well grid scroll-mt-4 gap-8 p-6 sm:p-10 lg:grid-cols-12">
        <h2 className="lg:col-span-4">Nhận tư vấn</h2>
        <div className="lg:col-span-8"><ApplicationForm kind="consult" jobCode={null} consentVersion={s.consentVersion} retentionMonths={s.retentionMonths} /></div>
      </section>
    </div>
  );
}
