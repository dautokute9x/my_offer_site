import Link from "next/link";
import { getSiteSettings } from "@/lib/data";
import { contactLinks } from "@/lib/contact";

export default async function SiteFooter() {
  const s = await getSiteSettings();
  const items = contactLinks(s);
  return (
    <footer className="bg-ink text-paper">
      <div className="wrap grid gap-10 py-16 md:grid-cols-12">
        <p className="display-face text-[length:var(--text-section)] leading-none text-paper md:col-span-6">{s.brandName}</p>
        <dl className="grid content-start gap-x-6 gap-y-2 text-sm md:col-span-4 md:grid-cols-[auto_1fr]">
          {items.map((i) => (
            <div key={i.label} className="contents">
              <dt className="text-paper-3">{i.label}</dt>
              <dd>
                {i.href ? (
                  <a href={i.href} className="whitespace-nowrap underline decoration-paper-3 underline-offset-4 hover:decoration-paper">
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
            <Link href="/chinh-sach-bao-mat" className="whitespace-nowrap underline decoration-paper-3 underline-offset-4 hover:decoration-paper">
              Chính sách bảo mật
            </Link>
          </li>
          <li>
            <Link href="/dieu-khoan" className="whitespace-nowrap underline decoration-paper-3 underline-offset-4 hover:decoration-paper">
              Điều khoản sử dụng
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
