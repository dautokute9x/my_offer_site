import Link from "next/link";
import { getSiteSettings } from "@/lib/data";
import { contactLinks } from "@/lib/contact";
import { PHOTOS } from "@/lib/photos";
import { localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";

export default async function SiteFooter() {
  const [s, { lang, t }] = await Promise.all([getSiteSettings(), getT()]);
  const items = contactLinks(s, t.contactLabels);
  return (
    <footer className="band-b">
      <div className="wrap grid gap-10 py-16 md:grid-cols-12">
        <p className="display-face text-[length:var(--text-section)] leading-none text-paper md:col-span-6">{s.brandName}</p>
        <dl className="grid content-start gap-x-6 gap-y-2 text-sm md:col-span-4 md:grid-cols-[auto_1fr]">
          {items.map((i) => (
            <div key={i.label} className="contents">
              <dt className="text-paper-2">{i.label}</dt>
              <dd>
                {i.href ? (
                  <a href={i.href} className="whitespace-nowrap underline decoration-paper-2 underline-offset-4 hover:decoration-paper">
                    {i.text}
                  </a>
                ) : (
                  i.text
                )}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-2 text-sm md:col-span-2">
          <li>
            <Link href={localePath(lang, "/chinh-sach-bao-mat")} className="whitespace-nowrap underline decoration-paper-2 underline-offset-4 hover:decoration-paper">
              {t.footer.privacy}
            </Link>
          </li>
          <li>
            <Link href={localePath(lang, "/dieu-khoan")} className="whitespace-nowrap underline decoration-paper-2 underline-offset-4 hover:decoration-paper">
              {t.footer.terms}
            </Link>
          </li>
        </ul>
      </div>
      <p className="wrap border-t-2 border-paper/30 py-6 text-xs text-paper-2">
        {t.footer.photoCredits}{" "}
        {Object.values(PHOTOS).map((p, i) => (
          <span key={p.src}>
            {i > 0 && ", "}
            <a href={p.page} className="underline underline-offset-2 hover:text-paper">{p.author}</a> ({p.license})
          </span>
        ))}
        .
      </p>
    </footer>
  );
}
