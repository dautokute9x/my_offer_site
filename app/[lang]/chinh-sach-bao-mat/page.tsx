import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import PolicyDraftBanner from "@/components/PolicyDraftBanner";
import { contactLinks } from "@/lib/contact";
import { getSiteSettings } from "@/lib/data";
import { languageAlternates, localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getT();
  return {
    title: t.pages.privacy.title,
    description: t.pages.privacy.description,
    alternates: { canonical: localePath(lang, "/chinh-sach-bao-mat"), languages: languageAlternates("/chinh-sach-bao-mat") },
  };
}

const h2 = "pt-6 text-[length:var(--text-title)]";
const list = "list-disc space-y-2 pl-6";

// Nội dung mẫu bám theo Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP (hiệu lực 01/01/2026) và APPI của Nhật cho phần gửi hồ sơ sang Nhật; chủ site cần rà soát pháp lý rồi mới bật policiesConfirmed.
// Văn bản nằm ở lib/i18n/messages/vi-pages.ts (pages.privacy).
export default async function Page() {
  const [s, { lang, t }] = await Promise.all([getSiteSettings(), getT()]);
  const { policiesConfirmed, retentionMonths } = s;
  const p = t.pages.privacy;
  const contacts = contactLinks(s, t.contactLabels);
  const f = (x: string) => fmt(x, { brand: s.brandName, months: retentionMonths });
  return (
    <article className="prose-body space-y-5">
      <h1 className="text-[length:var(--text-display-s)]">{p.title}</h1>
      {lang !== "vi" && <p role="note" className="border-l-4 border-ink bg-paper-3 px-4 py-3 font-semibold text-ink">{t.common.legalVersionNote}</p>}
      {!policiesConfirmed && <PolicyDraftBanner />}
      <p>{f(p.intro)}</p>
      {p.sections.map((sec, i) => (
        <Fragment key={sec.h}>
          <h2 className={h2}>{sec.h}</h2>
          {sec.before.map((x) => <p key={x}>{f(x)}</p>)}
          {/* Mục 1: kênh liên hệ của bên chịu trách nhiệm dữ liệu. */}
          {i === 0 && (contacts.length > 0 ? (
            <ul className={list}>
              {contacts.map((c) => <li key={c.label}>{c.label}: {c.href ? <a href={c.href} className="link">{c.text}</a> : c.text}</li>)}
            </ul>
          ) : (
            <p>{p.noContactsBefore}<Link href={localePath(lang, "/lien-he")} className="link">{p.noContactsLink}</Link>{p.noContactsAfter}</p>
          ))}
          {sec.list.length > 0 && <ul className={list}>{sec.list.map((x) => <li key={x}>{f(x)}</li>)}</ul>}
          {sec.after.map((x) => <p key={x}>{f(x)}</p>)}
        </Fragment>
      ))}
    </article>
  );
}
