"use client";
import Link from "next/link";

export default function BackToResults() {
  const onClick = (e: React.MouseEvent) => {
    try {
      const r = new URL(document.referrer);
      if (r.origin === location.origin && r.pathname.startsWith("/viec-lam")) {
        e.preventDefault();
        history.back();
      }
    } catch {} // không có referrer: để link /viec-lam chạy bình thường
  };
  return (
    <Link href="/viec-lam" onClick={onClick} className="link inline-flex min-h-11 items-center text-sm font-semibold text-ink">
      ← Quay lại kết quả
    </Link>
  );
}
