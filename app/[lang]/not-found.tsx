import Link from "next/link";
import { localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t.notFound.title };
}

export default async function NotFound() {
  const { lang, t } = await getT();
  return (
    <section>
      <h1 className="text-[length:var(--text-display-s)]">{t.notFound.title}</h1>
      <p className="standfirst mt-6">{t.notFound.body}</p>
      <Link href={localePath(lang, "/viec-lam")} className="btn btn-primary mt-8">
        {t.notFound.cta}
      </Link>
    </section>
  );
}
