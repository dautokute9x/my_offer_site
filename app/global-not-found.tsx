import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { fontVars } from "@/lib/fonts";
import { MESSAGES } from "@/lib/i18n/messages";

// 404 cho URL không khớp route nào (dự án có hai layout gốc: [lang] và admin). Không có layout nên tự nạp CSS và font.
export const metadata: Metadata = { title: MESSAGES.vi.notFound.title, robots: { index: false } };

export default function GlobalNotFound() {
  const vi = MESSAGES.vi.notFound, en = MESSAGES.en.notFound;
  return (
    <html lang="vi" className={fontVars}>
      <body className="bg-paper">
        <main className="wrap py-24">
          <h1 className="text-[length:var(--text-display-s)]">{vi.title}</h1>
          <p className="standfirst mt-6">{vi.body}</p>
          <p lang="en" className="mt-2 text-muted">{en.body}</p>
          <Link href="/viec-lam" className="btn btn-primary mt-8">{vi.cta}</Link>
        </main>
      </body>
    </html>
  );
}
