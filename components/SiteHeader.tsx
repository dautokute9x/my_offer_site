import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { getSiteSettings } from "@/lib/data";

const nav = [
  { href: "/viec-lam", label: "Việc làm" },
  { href: "/lich-phong-van", label: "Lịch phỏng vấn" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lien-he", label: "Liên hệ" },
];
const link = "link inline-flex min-h-11 items-center whitespace-nowrap decoration-transparent";

export default async function SiteHeader() {
  const { brandName } = await getSiteSettings();
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="wrap flex min-h-18 items-center justify-between gap-6">
        <Link href="/" aria-label={`${brandName}, trang chủ`} className="display-face whitespace-nowrap text-xl leading-none sm:text-2xl">
          {brandName}
        </Link>
        <nav aria-label="Menu chính" className="hidden items-center gap-7 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={link}>
              {n.label}
            </Link>
          ))}
          <Link href="/lien-he#tu-van" className="btn btn-primary">
            Nhận tư vấn
          </Link>
        </nav>
        <MobileMenu>
          <nav aria-label="Menu di động" className="absolute right-0 z-10 mt-2 flex w-64 flex-col border border-ink bg-paper p-2">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex min-h-12 items-center border-b-2 border-accent-2/30 px-3">
                {n.label}
              </Link>
            ))}
            <Link href="/lien-he#tu-van" className="btn btn-primary mt-2">
              Nhận tư vấn
            </Link>
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}
