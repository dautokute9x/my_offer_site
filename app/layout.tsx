import type { Metadata } from "next";
import { Bricolage_Grotesque, Noto_Sans_JP, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DemoBanner from "@/components/DemoBanner";
import { getSiteSettings } from "@/lib/data";

// Cả hai đều có bộ dấu tiếng Việt; Bricolage cần trục wdth để có dáng chữ hẹp của theme.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["vietnamese", "latin"],
  axes: ["wdth", "opsz"],
});
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["vietnamese", "latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
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
    <html lang="vi" className={`${bricolage.variable} ${sourceSerif.variable} ${notoJp.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper max-lg:has-[[data-apply-bar]]:pb-16">
        <a href="#main" className="absolute left-2 top-2 z-50 inline-flex min-h-11 -translate-y-[200%] items-center whitespace-nowrap bg-ink px-4 font-semibold text-paper underline focus:translate-y-0">Bỏ qua đến nội dung chính</a>
        <DemoBanner />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="wrap flex-1 pt-10 pb-24 focus:outline-none">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
