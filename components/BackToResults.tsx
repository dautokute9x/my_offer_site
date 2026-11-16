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
    <Link href="/viec-lam" onClick={onClick} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176AC0]">
      ← Quay lại kết quả
    </Link>
  );
}
