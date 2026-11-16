import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { seedCatalogSql, seedDemoSql } from "@/lib/demo/seed-sql";

// Lệch nghĩa là đã sửa lib/demo mà chưa chạy `npm run db:gen-seed`.
describe("seed SQL đồng bộ với dữ liệu TS", () => {
  it.each([
    ["supabase/seed_catalog.sql", seedCatalogSql],
    ["supabase/seed_demo.sql", seedDemoSql],
  ])("%s", (file, gen) => {
    expect(readFileSync(file, "utf8")).toBe(gen());
  });
});
