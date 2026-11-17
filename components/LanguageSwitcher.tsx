"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_LABEL, HTML_LANG, localePath, splitLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// Đổi ngôn ngữ giữ nguyên trang đang xem (chỉ đổi tiền tố URL). Dùng <details> nên vẫn mở được khi chưa chạy JS.
export default function LanguageSwitcher() {
  const { lang, t } = useI18n();
  const rest = splitLocale(usePathname() || "/").rest;
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { ref.current?.removeAttribute("open"); }, [rest, lang]);
  return (
    <details ref={ref} className="relative">
      <summary className="btn min-h-11 cursor-pointer list-none px-3 text-base" aria-label={`${t.common.language}: ${LOCALE_LABEL[lang]}`}>
        <span aria-hidden="true">{lang.toUpperCase()}</span>
      </summary>
      <ul className="well absolute right-0 z-20 mt-2 w-48 bg-paper p-1">
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={localePath(l, rest)} hrefLang={HTML_LANG[l]} lang={HTML_LANG[l]} aria-current={l === lang ? "true" : undefined}
              className={`flex min-h-11 items-center px-3 no-underline hover:bg-paper-2 ${l === lang ? "font-bold" : ""}`}>
              {LOCALE_LABEL[l]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
