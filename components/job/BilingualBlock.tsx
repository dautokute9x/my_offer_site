"use client";
import { useState } from "react";
import type { Job } from "@/lib/types";

const ja = (t: string) => <p lang="ja" className="whitespace-pre-line">{t}</p>;

export default function BilingualBlock({ text, status }: { text: { ja: string | null; vi: string | null }; status: Job["translationStatus"] }) {
  const [showJa, setShowJa] = useState(false);
  if (!text.ja && !text.vi) return null;
  if (status === "none" || !text.vi) return ja(text.ja ?? "");
  return (
    <div className="space-y-2">
      {status === "unreviewed" && (
        <p className="tag">Bản dịch chưa được duyệt</p>
      )}
      {showJa && text.ja ? ja(text.ja) : <p className="whitespace-pre-line">{text.vi}</p>}
      {text.ja && (
        <button type="button" onClick={() => setShowJa(!showJa)} aria-pressed={showJa}
          className="link min-h-11 text-sm font-semibold text-ink">
          {showJa ? "Xem bản dịch tiếng Việt" : "Xem bản gốc tiếng Nhật"}
        </button>
      )}
    </div>
  );
}
