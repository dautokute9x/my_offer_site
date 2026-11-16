import type { Metadata } from "next";
import Paragraphs from "@/components/Paragraphs";
import { getSiteSettings } from "@/lib/data";
import { isPlaceholder } from "@/lib/site-defaults";

export const metadata: Metadata = { title: "Giới thiệu", alternates: { canonical: "/gioi-thieu" } };

export default async function AboutPage() {
  const { aboutText } = await getSiteSettings();
  return (
    <article className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-navy">Giới thiệu</h1>
      {isPlaceholder(aboutText) ? (
        <p role="note" className="rounded border border-amber-300 bg-amber-100 p-3 font-semibold text-amber-900">
          Nội dung cần chủ website cung cấp
        </p>
      ) : (
        <Paragraphs text={aboutText} />
      )}
    </article>
  );
}
