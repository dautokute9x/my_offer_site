"use client";
import { useState } from "react";
import type { Job } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";

const ja = (t: string) => <p lang="ja" className="whitespace-pre-line">{t}</p>;

export default function BilingualBlock({ text, status }: { text: { ja: string | null; vi: string | null }; status: Job["translationStatus"] }) {
  const { lang, t } = useI18n();
  // Bản ja: hiện bản gốc tiếng Nhật trước.
  const [showJa, setShowJa] = useState(lang === "ja");
  if (!text.ja && !text.vi) return null;
  if (status === "none" || !text.vi) return ja(text.ja ?? "");
  return (
    <div className="space-y-2">
      {status === "unreviewed" && (
        <p className="tag">{t.detail.unreviewed}</p>
      )}
      {showJa && text.ja ? ja(text.ja) : <p lang={lang === "vi" ? undefined : "vi"} className="whitespace-pre-line">{text.vi}</p>}
      {text.ja && (
        <button type="button" onClick={() => setShowJa(!showJa)} aria-pressed={showJa}
          className="link min-h-11 text-sm font-semibold text-ink">
          {showJa ? t.detail.showVi : t.detail.showJa}
        </button>
      )}
    </div>
  );
}
