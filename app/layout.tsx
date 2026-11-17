import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DemoBanner from "@/components/DemoBanner";
import { getSiteSettings } from "@/lib/data";

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

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: brandName, template: `%s | ${brandName}` },
    description: "Việc làm kỹ sư tại Nhật Bản dành cho người Việt.",
    openGraph: { siteName: brandName, type: "website", locale: "vi_VN" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${notoJp.variable}`}>
      <body className="min-h-screen flex flex-col max-lg:has-[[data-apply-bar]]:pb-16">
        <a href="#main" className="absolute left-2 top-2 z-50 inline-flex min-h-11 -translate-y-[200%] items-center bg-white px-4 font-semibold text-navy underline focus:translate-y-0">Bỏ qua đến nội dung chính</a>
        <DemoBanner />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
