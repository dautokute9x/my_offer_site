import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DemoBanner from "@/components/DemoBanner";
import { siteDefaults } from "@/lib/site-defaults";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  weight: ["400", "600", "700"],
  subsets: ["vietnamese", "latin"],
});
const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: siteDefaults.brandName, template: `%s | ${siteDefaults.brandName}` },
  description: "Việc làm kỹ sư tại Nhật Bản dành cho người Việt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${notoJp.variable}`}>
      <body className="min-h-screen flex flex-col max-lg:has-[[data-apply-bar]]:pb-16">
        <DemoBanner />
        <SiteHeader />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
