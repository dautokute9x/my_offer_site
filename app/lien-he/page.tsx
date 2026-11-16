import type { Metadata } from "next";
import ApplicationForm from "@/components/ApplicationForm";
import { getSiteSettings } from "@/lib/data";
import { isPlaceholder } from "@/lib/site-defaults";

export const metadata: Metadata = { title: "Liên hệ", alternates: { canonical: "/lien-he" } };

const link = "font-semibold text-brand underline";

export default async function ContactPage() {
  const s = await getSiteSettings();
  const ok = (v: string) => v.trim() !== "" && !isPlaceholder(v);
  const digits = s.zalo.replace(/[\s.\-()]/g, "").replace(/^\+/, "");
  const https = (v: string) => ok(v) && v.startsWith("https://");
  const items: [string, React.ReactNode][] = [];
  if (ok(s.email)) items.push(["Email", <a key="e" className={link} href={`mailto:${s.email}`}>{s.email}</a>]);
  if (ok(s.phone)) items.push(["Điện thoại", <a key="p" className={link} href={`tel:${s.phone.replace(/[\s.\-()]/g, "")}`}>{s.phone}</a>]);
  if (ok(s.zalo)) items.push(["Zalo", /^\d{8,15}$/.test(digits) ? <a key="z" className={link} href={`https://zalo.me/${digits}`}>{s.zalo}</a> : s.zalo]);
  if (https(s.facebookUrl)) items.push(["Facebook", <a key="f" className={link} href={s.facebookUrl}>{s.facebookUrl}</a>]);
  if (https(s.zaloGroupUrl)) items.push(["Nhóm Zalo", <a key="g" className={link} href={s.zaloGroupUrl}>{s.zaloGroupUrl}</a>]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-navy">Liên hệ</h1>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map(([k, v]) => <li key={k}>{k}: {v}</li>)}
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
