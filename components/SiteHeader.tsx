import Link from "next/link";
import { siteDefaults } from "@/lib/site-defaults";

const nav = [
  { href: "/viec-lam", label: "Việc làm" },
  { href: "/lich-phong-van", label: "Lịch phỏng vấn" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lien-he", label: "Liên hệ" },
];
const cta = "inline-flex min-h-11 items-center rounded bg-brand px-4 font-semibold text-white";

export default function SiteHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/" className="text-lg font-bold text-navy">
          {siteDefaults.brandName}
        </Link>
        <nav aria-label="Menu chính" className="hidden items-center gap-5 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="py-2 hover:text-brand">
              {n.label}
            </Link>
          ))}
          <Link href="/lien-he#tu-van" className={cta}>
            Nhận tư vấn
          </Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold text-navy">
            Menu
          </summary>
          <nav
            aria-label="Menu di động"
            className="absolute right-0 z-10 mt-1 flex w-56 flex-col rounded border border-slate-200 bg-white p-2 shadow"
          >
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex min-h-11 items-center px-2">
                {n.label}
              </Link>
            ))}
            <Link href="/lien-he#tu-van" className={`${cta} justify-center`}>
              Nhận tư vấn
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
