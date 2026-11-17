import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DemoBanner from "@/components/DemoBanner";
import { getSiteSettings } from "@/lib/data";
import { fontVars } from "@/lib/fonts";
import { HTML_LANG, LOCALES, OG_LOCALE, hasLocale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { MESSAGES } from "@/lib/i18n/messages";

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const l = hasLocale(lang) ? lang : "vi";
  const { brandName } = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: brandName, template: `%s | ${brandName}` },
    description: MESSAGES[l].meta.siteDescription,
    openGraph: { siteName: brandName, type: "website", locale: OG_LOCALE[l] },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = MESSAGES[lang];
  return (
    <html lang={HTML_LANG[lang]} className={fontVars}>
      <body className="flex min-h-screen flex-col bg-paper max-lg:has-[[data-apply-bar]]:pb-16">
        <I18nProvider lang={lang} t={t}>
          <a href="#main" className="absolute left-2 top-2 z-50 inline-flex min-h-11 -translate-y-[200%] items-center whitespace-nowrap bg-ink px-4 font-semibold text-paper underline focus:translate-y-0">{t.common.skipToContent}</a>
          <DemoBanner />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="wrap flex-1 pt-10 pb-24 focus:outline-none">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
