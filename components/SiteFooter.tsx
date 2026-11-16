import Link from "next/link";
import { getSiteSettings } from "@/lib/data";
import { contactLinks } from "@/lib/contact";

export default async function SiteFooter() {
  const s = await getSiteSettings();
  const items = contactLinks(s);
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div>
          <p className="font-bold">{s.brandName}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.label}>
                {i.label}:{" "}
                {i.href ? (
                  <a href={i.href} className="underline">
                    {i.text}
                  </a>
                ) : (
                  i.text
                )}
              </li>
            ))}
          </ul>
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href="/chinh-sach-bao-mat" className="underline">
              Chính sách bảo mật
            </Link>
          </li>
          <li>
            <Link href="/dieu-khoan" className="underline">
              Điều khoản sử dụng
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
