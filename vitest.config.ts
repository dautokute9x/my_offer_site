import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  // "server-only" ném lỗi ngoài React Server; trong test dùng bản rỗng của chính package.
  resolve: { alias: { "@": at("."), "server-only": at("node_modules/server-only/empty.js") } },
  test: { exclude: ["tests/e2e/**", "node_modules/**"] },
});
