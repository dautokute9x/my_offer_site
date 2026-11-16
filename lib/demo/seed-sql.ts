// Sinh supabase/seed_catalog.sql và seed_demo.sql từ dữ liệu demo TS (scripts/gen-seed.mts; tests/unit/seed-sync.test.ts).
// Đuôi .ts tường minh để chạy được bằng `node --experimental-strip-types`.
import { demoCatalog } from "./catalog.ts";
import { buildDemoJobs } from "./jobs.ts";
import { siteDefaults } from "../site-defaults.ts";
import { jstDateKey } from "../time.ts";

const HEADER = "-- Sinh tự động bởi `npm run db:gen-seed` (scripts/gen-seed.mts). Không sửa tay.\n";
const HOUR = 3_600_000;
const NOW = "(select t from demo_now)";

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

function lit(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  if (Array.isArray(v)) return v.length ? `array[${v.map(lit).join(", ")}]` : "'{}'::text[]";
  throw new Error(`không chuyển được sang SQL: ${JSON.stringify(v)}`);
}

function insert(table: string, rows: Record<string, unknown>[]): string {
  const cols = Object.keys(rows[0]);
  const values = rows.map((r) => `  (${cols.map((c) => r[c]).join(", ")})`).join(",\n");
  return `insert into ${table} (${cols.map(snake).join(", ")}) values\n${values};\n`;
}

const literals = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, lit(v)]));

export function seedCatalogSql(): string {
  const c = demoCatalog;
  const tables: [string, object[]][] = [
    ["prefectures", c.prefectures], ["occupation_groups", c.groups], ["occupations", c.occupations],
    ["skills", c.skills], ["benefits", c.benefits],
  ];
  return HEADER + "-- Chạy một lần trên DB mới; chạy lại sẽ lỗi unique (an toàn, không ghi gì).\nbegin;\n" +
    tables.map(([t, rows]) =>
      insert(t, rows.map(literals)) + `alter table ${t} alter column id restart with ${Math.max(...rows.map((r) => (r as { id: number }).id)) + 1};\n`,
    ).join("\n") +
    `\ninsert into site_settings (id, data) values (1, ${lit(JSON.stringify(siteDefaults))}::jsonb);\ncommit;\n`;
}

// Mốc thời gian tương đối so với `now` (pin bằng `set app.demo_now = '...'`).
function rel(iso: string | null, now: Date): string {
  if (iso === null) return "null";
  const h = (Date.parse(iso) - now.getTime()) / HOUR;
  if (!Number.isInteger(h)) throw new Error(`mốc thời gian demo không tròn giờ: ${iso}`);
  return `${NOW} + interval '${h} hours'`;
}

const pairs = (rows: [string, string | number][]) => rows.map(([a, b]) => `(${lit(a)}, ${lit(b)})`).join(", ");

export function seedDemoSql(): string {
  const now = new Date(Date.UTC(2026, 0, 1, 3)); // mốc bất kỳ: chỉ dùng để suy ra độ lệch tương đối
  const { jobs, interviews } = buildDemoJobs(now);
  const rows = jobs.map((j) => {
    const { id, prefectureIds, occupationIds, skillIds, benefits, content, publishedAt, updatedAt, validThrough, ...rest } = j;
    void id; void prefectureIds; void occupationIds; void skillIds; void benefits;
    const r: Record<string, string> = literals(rest);
    for (const [f, v] of Object.entries(content)) {
      r[`${f}Ja`] = lit(v.ja);
      r[`${f}Vi`] = lit(v.vi);
    }
    return { ...r, publishedAt: rel(publishedAt, now), updatedAt: rel(updatedAt, now), validThrough: rel(validThrough, now) };
  });
  const code = (jobId: number) => jobs.find((j) => j.id === jobId)!.code;
  const link = (table: string, col: string, list: [string, string | number][], via?: string) =>
    list.length === 0 ? "" :
      `insert into ${table} (job_id, ${col}${via ? ", value" : ""})\nselect j.id, ${via ? "b.id, true" : "v.x"} from (values ${pairs(list)}) v(code, x)\n` +
      `join jobs j on j.code = v.code${via ? ` join ${via} b on b.slug = v.x` : ""};\n`;

  const base = Date.parse(`${jstDateKey(now.toISOString())}T10:00:00+09:00`);
  const ev = interviews.map((e, i) => {
    const d = (Date.parse(e.startsAt) - base) / (24 * HOUR);
    if (!Number.isInteger(d) || (e.endsAt && Date.parse(e.endsAt) - Date.parse(e.startsAt) !== HOUR)) {
      throw new Error(`lịch demo không theo mẫu ngày + 10:00–11:00 JST: ${e.startsAt}`);
    }
    const day = `date_trunc('day', ${NOW} at time zone 'Asia/Tokyo') + interval '${d} days`;
    return `  (${i + 1}, ${lit(code(e.jobId))}, (${day} 10 hours') at time zone 'Asia/Tokyo', ` +
      `(${day} 11 hours') at time zone 'Asia/Tokyo', ${lit(e.format)}, ${lit(e.publicNote)}, ${lit(e.status)})`;
  });

  return HEADER +
    "-- Tin demo (is_demo = true), tùy chọn, chỉ để thử. Chạy lại sẽ thay toàn bộ tin demo.\n" +
    "-- Ngày tính tương đối từ now(); ghim bằng `set app.demo_now = '2026-11-16T03:00:00Z'`.\n" +
    "begin;\ncreate temp table demo_now on commit drop as\n  select coalesce(nullif(current_setting('app.demo_now', true), '')::timestamptz, now()) as t;\n" +
    "delete from jobs where is_demo;\n\n" +
    insert("jobs", rows) + "\n" +
    link("job_prefectures", "prefecture_id", jobs.flatMap((j) => j.prefectureIds.map((x): [string, number] => [j.code, x]))) +
    link("job_occupations", "occupation_id", jobs.flatMap((j) => j.occupationIds.map((x): [string, number] => [j.code, x]))) +
    link("job_skills", "skill_id", jobs.flatMap((j) => j.skillIds.map((x): [string, number] => [j.code, x]))) +
    link("job_benefits", "benefit_id", jobs.flatMap((j) =>
      Object.entries(j.benefits).map(([slug, v]): [string, string] => {
        if (v !== true) throw new Error("seed chỉ hỗ trợ quyền lợi = true");
        return [j.code, slug];
      })), "benefits") +
    "\ninsert into interview_events (job_id, starts_at, ends_at, format, public_note, status)\n" +
    "select j.id, v.starts_at, v.ends_at, v.format, v.public_note, v.status from (values\n" +
    ev.join(",\n") + "\n) v(ord, code, starts_at, ends_at, format, public_note, status)\n" +
    "join jobs j on j.code = v.code order by v.ord;\ncommit;\n";
}
