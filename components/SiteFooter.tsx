import Link from "next/link";
import { isPlaceholder, siteDefaults as s } from "@/lib/site-defaults";

export default function SiteFooter() {
  const items = [
    { label: "Email", value: s.email, href: `mailto:${s.email}` },
    { label: "Điện thoại", value: s.phone, href: `tel:${s.phone}` },
    { label: "Zalo", value: s.zalo, href: undefined },
    { label: "Facebook", value: s.facebookUrl, href: s.facebookUrl },
    { label: "Nhóm Zalo", value: s.zaloGroupUrl, href: s.zaloGroupUrl },
  ].filter((i) => !isPlaceholder(i.value));
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
                    {i.value}
                  </a>
                ) : (
                  i.value
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
