// Ghi lại supabase/seed_catalog.sql và seed_demo.sql từ lib/demo. Chạy: npm run db:gen-seed
import { writeFileSync } from "node:fs";
import { seedCatalogSql, seedDemoSql } from "../lib/demo/seed-sql.ts";

writeFileSync(new URL("../supabase/seed_catalog.sql", import.meta.url), seedCatalogSql());
writeFileSync(new URL("../supabase/seed_demo.sql", import.meta.url), seedDemoSql());
