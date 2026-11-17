import type { Metadata } from "next";
import Paragraphs from "@/components/Paragraphs";
import { getSiteSettings } from "@/lib/data";
import { isPlaceholder } from "@/lib/site-defaults";
import { languageAlternates, localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getT();
  return { title: t.pages.about.title, alternates: { canonical: localePath(lang, "/gioi-thieu"), languages: languageAlternates("/gioi-thieu") } };
}

export default async function AboutPage() {
  const [{ aboutText }, { lang, t }] = await Promise.all([getSiteSettings(), getT()]);
  const a = t.pages.about;
  return (
    <article className="space-y-8">
      <h1 className="text-[length:var(--text-display-s)]">{a.title}</h1>
      {isPlaceholder(aboutText) ? (
        <p role="note" className="max-w-[68ch] border-l-4 border-ink bg-paper-3 p-4 font-semibold text-ink">
          {a.placeholder}
        </p>
      ) : lang === "vi" ? (
        <Paragraphs text={aboutText} className="prose-body" />
      ) : (
        <>
          <p role="note" className="text-sm text-muted">{a.ownerTextNote}</p>
          <div lang="vi" className="space-y-8"><Paragraphs text={aboutText} className="prose-body" /></div>
        </>
      )}
    </article>
  );
}
