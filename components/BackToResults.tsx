"use client";
import Link from "next/link";
import { splitLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

export default function BackToResults() {
  const { t, href } = useI18n();
  const onClick = (e: React.MouseEvent) => {
    try {
      const r = new URL(document.referrer);
      if (r.origin === location.origin && splitLocale(r.pathname).rest.startsWith("/viec-lam")) {
        e.preventDefault();
        history.back();
      }
    } catch {} // không có referrer: để link /viec-lam chạy bình thường
  };
  return (
    <Link href={href("/viec-lam")} onClick={onClick} className="link inline-flex min-h-11 items-center text-sm font-semibold text-ink">
      {t.jobs.list.back}
    </Link>
  );
}
