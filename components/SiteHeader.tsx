import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileMenu from "@/components/MobileMenu";
import { getSiteSettings } from "@/lib/data";
import { localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";

const link = "link inline-flex min-h-11 items-center whitespace-nowrap decoration-transparent";

export default async function SiteHeader() {
  const [{ brandName }, { lang, t }] = await Promise.all([getSiteSettings(), getT()]);
  const p = (path: string) => localePath(lang, path);
  const nav = [
    { href: p("/viec-lam"), label: t.nav.jobs },
    { href: p("/lich-phong-van"), label: t.nav.schedule },
    { href: p("/gioi-thieu"), label: t.nav.about },
    { href: p("/lien-he"), label: t.nav.contact },
  ];
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="wrap flex min-h-18 items-center justify-between gap-4">
        <Link href={p("/")} aria-label={`${brandName}, ${t.common.home}`} className="display-face whitespace-nowrap text-xl leading-none sm:text-2xl">
          {brandName}
        </Link>
        <div className="flex items-center gap-3 lg:gap-7">
          <nav aria-label={t.common.mainMenu} className="hidden items-center gap-7 lg:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={link}>
                {n.label}
              </Link>
            ))}
            <Link href={`${p("/lien-he")}#tu-van`} className="btn btn-primary">
              {t.nav.consult}
            </Link>
          </nav>
          <LanguageSwitcher />
          <MobileMenu>
            <nav aria-label={t.common.mobileMenu} className="well absolute right-0 z-10 mt-2 flex w-64 flex-col bg-paper p-2">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="flex min-h-12 items-center border-b-2 border-accent-2/30 px-3">
                  {n.label}
                </Link>
              ))}
              <Link href={`${p("/lien-he")}#tu-van`} className="btn btn-primary mt-2">
                {t.nav.consult}
              </Link>
            </nav>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
