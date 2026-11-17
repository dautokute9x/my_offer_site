import type { Metadata } from "next";
import Paragraphs from "@/components/Paragraphs";
import { getSiteSettings } from "@/lib/data";
import { isPlaceholder } from "@/lib/site-defaults";

export const metadata: Metadata = { title: "Giới thiệu", alternates: { canonical: "/gioi-thieu" } };

export default async function AboutPage() {
  const { aboutText } = await getSiteSettings();
  return (
    <article className="space-y-8">
      <h1 className="text-[length:var(--text-display-s)]">Giới thiệu</h1>
      {isPlaceholder(aboutText) ? (
        <p role="note" className="max-w-[68ch] border-l-4 border-ink bg-paper-3 p-4 font-semibold text-ink">
          Nội dung cần chủ website cung cấp
        </p>
      ) : (
        <Paragraphs text={aboutText} className="prose-body" />
      )}
    </article>
  );
}
