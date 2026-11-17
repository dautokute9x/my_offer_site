import type { Metadata } from "next";
import "../globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DemoBanner from "@/components/DemoBanner";
import { fontVars } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n/client";
import { MESSAGES } from "@/lib/i18n/messages";

// Layout gốc riêng của trang quản trị: chỉ có tiếng Việt, nằm ngoài [lang].
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={fontVars}>
      <body className="flex min-h-screen flex-col bg-paper">
        <I18nProvider lang="vi" t={MESSAGES.vi}>
          <a href="#main" className="absolute left-2 top-2 z-50 inline-flex min-h-11 -translate-y-[200%] items-center whitespace-nowrap bg-ink px-4 font-semibold text-paper underline focus:translate-y-0">{MESSAGES.vi.common.skipToContent}</a>
          <DemoBanner />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="wrap flex-1 pt-10 pb-24 focus:outline-none">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
