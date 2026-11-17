"use client";
import { createContext, useContext, type ReactNode } from "react";
import { localePath, type Locale } from "./config";
import type { Messages } from "./messages";

const Ctx = createContext<{ lang: Locale; t: Messages } | null>(null);

export function I18nProvider({ lang, t, children }: { lang: Locale; t: Messages; children: ReactNode }) {
  return <Ctx.Provider value={{ lang, t }}>{children}</Ctx.Provider>;
}

/** Ngôn ngữ, từ điển và hàm tạo đường dẫn theo ngôn ngữ cho client component. */
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n cần nằm trong I18nProvider");
  return { ...v, href: (path: string) => localePath(v.lang, path) };
}
