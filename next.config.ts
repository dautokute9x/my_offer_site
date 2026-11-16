import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tệp CSV tối đa 2 MB + phần thừa của multipart/mã hóa; kiểm tra byte chính xác nằm ở server action.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
