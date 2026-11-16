import type { Metadata } from "next";
import ApplicationForm from "@/components/ApplicationForm";
import { getSiteSettings } from "@/lib/data";
import { contactLinks } from "@/lib/contact";

export const metadata: Metadata = { title: "Liên hệ", alternates: { canonical: "/lien-he" } };

const link = "font-semibold text-brand underline";

export default async function ContactPage() {
  const s = await getSiteSettings();
  const items = contactLinks(s);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-navy">Liên hệ</h1>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((i) => <li key={i.label}>{i.label}: {i.href ? <a className={link} href={i.href}>{i.text}</a> : i.text}</li>)}
        </ul>
      ) : (
        <p>Kênh liên hệ chưa được cập nhật.</p>
      )}
      <section id="tu-van" className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold text-navy">Nhận tư vấn</h2>
        <div className="mt-3"><ApplicationForm kind="consult" jobCode={null} consentVersion={s.consentVersion} retentionMonths={s.retentionMonths} /></div>
      </section>
    </div>
  );
}
