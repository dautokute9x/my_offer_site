import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { getSiteSettings } from "@/lib/data";

const nav = [
  { href: "/viec-lam", label: "Việc làm" },
  { href: "/lich-phong-van", label: "Lịch phỏng vấn" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lien-he", label: "Liên hệ" },
];
const cta = "inline-flex min-h-11 items-center rounded bg-brand px-4 font-semibold text-white";

export default async function SiteHeader() {
  const { brandName } = await getSiteSettings();
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/" className="text-lg font-bold text-navy">
          {brandName}
        </Link>
        <nav aria-label="Menu chính" className="hidden items-center gap-5 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="inline-flex min-h-11 items-center hover:text-brand">
              {n.label}
            </Link>
          ))}
          <Link href="/lien-he#tu-van" className={cta}>
            Nhận tư vấn
          </Link>
        </nav>
        <MobileMenu>
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
        </MobileMenu>
      </div>
    </header>
  );
}
