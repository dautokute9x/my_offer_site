import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  // Tệp CSV tối đa 2 MB + phần thừa của multipart/mã hóa; kiểm tra byte chính xác nằm ở server action.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const config = (phase: string): NextConfig => {
  // Có Supabase (bản thật) mà thiếu Site URL thì canonical/sitemap trỏ về localhost: dừng build. Demo không cần.
  if (phase === PHASE_PRODUCTION_BUILD && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
    throw new Error("Thiếu NEXT_PUBLIC_SITE_URL (bắt buộc khi build production có NEXT_PUBLIC_SUPABASE_URL).");
  }
  return nextConfig;
};

export default config;
