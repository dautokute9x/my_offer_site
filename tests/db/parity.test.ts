// So khớp hàm SQL công khai (0002_public_api.sql) với nguồn demo TS. Cần Postgres cục bộ: chạy qua `npm run db:test`.
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as demo from "@/lib/data/demo";
import type { JobFilters } from "@/lib/filters";
import { normText } from "@/lib/normalize";
import { jstDateKey } from "@/lib/time";

const PSQL = ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "-d", "app"];
const sql = (query: string) =>
  execFileSync("psql", PSQL, { input: query, encoding: "utf8", env: { ...process.env, PGCLIENTENCODING: "UTF8" } }).trim();
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const json = (query: string) => JSON.parse(sql(`select (${query})::text`) || "null");

// Hàm không nhận `now` (get_job, related_jobs, open_job_counts_by_group) dùng now() của DB: lấy mốc ≈ giờ thật.
const NOW = new Date();
const BASE: JobFilters = {
  q: "", prefectures: [], groups: [], occupations: [], salaryMinMan: null, salaryMaxMan: null, period: "month",
  jpLevel: null, maxExperience: null, benefits: [], hasInterview: false, sort: "moi", page: 1,
};

// Id khác nhau sau khi seed lại → bỏ trường id. DB không lưu thứ tự prefectureIds/occupationIds/skillIds → so sau khi sắp.
const noIds = (o: unknown): unknown =>
  Array.isArray(o) ? o.map(noIds)
  : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "id" && k !== "jobId")
    .map(([k, v]) => [k, k.endsWith("Ids") ? [...(v as number[])].sort((a, b) => a - b) : noIds(v)]))
  : o;

describe.skipIf(!process.env.DB_TEST)("parity SQL ↔ demo TS", () => {
  beforeAll(() => {
    execFileSync("bash", ["scripts/db-local.sh", "reset"], { stdio: ["ignore", "ignore", "inherit"] });
    sql(`set app.demo_now = ${lit(NOW.toISOString())};\n\\i supabase/seed_demo.sql`);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  }, 60_000);
  afterAll(() => vi.useRealTimers());

  const cases: [string, Partial<JobFilters>][] = [
    ["rỗng", {}],
    ["mã #00412", { q: "#00412" }],
    ["Tokyo", { q: "Tokyo" }],
    ["ky su dien", { q: "ky su dien" }],
    ["tỉnh + nhóm", { prefectures: ["13", "27"], groups: ["dien"] }],
    ["lương tháng", { salaryMinMan: 30, period: "month" }],
    ["lương năm", { salaryMinMan: 400, period: "year" }],
    ["N3", { jpLevel: "N3" }],
    ["ký túc xá", { benefits: ["ky-tuc-xa"] }],
    ["có PV, sx pv", { hasInterview: true, sort: "pv" }],
    ["sx lương", { sort: "luong" }],
    ["trang 2", { page: 2 }],
    ["412 không boost mã", { q: "412" }],
    ["lương trần + kinh nghiệm", { salaryMaxMan: 30, maxExperience: 2 }],
    // Cố ý rỗng: ký tự đại diện LIKE phải được hiểu nguyên văn.
    ["% nguyên văn", { q: "%" }],
    ["_ nguyên văn", { q: "ky_su" }],
  ];
  const EMPTY = new Set(["% nguyên văn", "_ nguyên văn"]);
  it.each(cases)("search_jobs: %s", async (name, part) => {
    const f = { ...BASE, ...part };
    const ts = await demo.searchJobs(f, { now: NOW });
    expect(ts.total > 0).toBe(!EMPTY.has(name));
    const db = json(`search_jobs(${lit(JSON.stringify({ ...f, now: NOW.toISOString() }))})`);
    expect(db.items.map((j: { code: string }) => j.code)).toEqual(ts.items.map((j) => j.code));
    expect([db.total, db.page, db.pageSize, db.pageCount]).toEqual([ts.total, ts.page, ts.pageSize, ts.pageCount]);
  });

  it("search_jobs: JobSummary đầy đủ, không lộ cột nội bộ", async () => {
    const ts = await demo.searchJobs({ ...BASE, q: "00412" }, { now: NOW });
    const db = json(`search_jobs(${lit(JSON.stringify({ ...BASE, q: "00412", now: NOW.toISOString() }))})`);
    expect(noIds(db.items[0])).toEqual(noIds(ts.items[0]));
    for (const k of ["searchText", "search_text", "translationSourceHash", "salaryNeedsReview"]) expect(db.items[0]).not.toHaveProperty(k);
  });

  it("get_job: tin đang tuyển, tin đã đóng; draft và mã lạ trả null", async () => {
    for (const code of ["00412", "40671"]) {
      const ts = await demo.getJobByCode(code);
      expect(ts).not.toBeNull();
      expect(noIds(json(`get_job(${lit(code)})`))).toEqual(noIds(ts));
    }
    expect(json(`get_job(' ＃００４１２')`).code).toBe("00412");
    expect(json(`get_job('412')`)).toBeNull();
    expect(sql(`begin;
      insert into jobs (code, slug, status, title_vi, title_ja) values ('DRAFT9', 'draft-9', 'draft', 'Nháp', '下書き');
      select coalesce(get_job('DRAFT9')::text, 'null'); rollback;`)).toBe("null");
  });

  it("mã không phân biệt hoa thường: get_job, boost, unique lower(code)", () => {
    // 00412 đổi tiêu đề → updated_at mới nhất, cũng khớp 'abc123'; boost phải đưa ABC123 lên trước.
    const out = sql(`begin;
      update jobs set code = 'ABC123' where code = '10587';
      update jobs set title_vi = title_vi || ' abc123' where code = '00412';
      select get_job('abc123')->>'code';
      select get_job('#Abc123')->>'code';
      select (select string_agg(x->>'code', ',') from jsonb_array_elements(search_jobs('{"q": "ABC123"}')->'items') x);
      select (select string_agg(x->>'code', ',') from jsonb_array_elements(search_jobs('{"q": "abc12"}')->'items') x);
      rollback;`);
    expect(out.split("\n")).toEqual(["ABC123", "ABC123", "ABC123,00412", "00412,ABC123"]);
  });

  it("related_jobs", async () => {
    const job = (await demo.getJobByCode("00412"))!;
    const id = sql(`select id from jobs where code = '00412'`);
    for (const limit of [4, 20]) {
      const ts = await demo.getRelatedJobs(job, limit);
      expect(json(`related_jobs(${id}, ${limit})`).map((j: { code: string }) => j.code)).toEqual(ts.map((j) => j.code));
    }
  });

  it.each([
    ["không tham số", { prefectures: [], occupations: [] }],
    ["nghề plc-mach-dien", { prefectures: [], occupations: ["plc-mach-dien"] }],
    ["khoảng ngày + tỉnh", {
      from: jstDateKey(new Date(NOW.getTime() + 3 * 86_400_000).toISOString()),
      to: jstDateKey(new Date(NOW.getTime() + 14 * 86_400_000).toISOString()), prefectures: ["13", "23", "99"], occupations: [],
    }],
  ])("upcoming_interviews: %s", async (_, o) => {
    const ts = await demo.listUpcomingInterviews(o, { now: NOW });
    const db = json(`upcoming_interviews(${lit(JSON.stringify({ ...o, now: NOW.toISOString() }))})`);
    expect(ts.length).toBeGreaterThan(0);
    expect(noIds(db)).toEqual(noIds(ts));
  });

  it("open_job_counts_by_group", async () => {
    expect(json(`open_job_counts_by_group()`)).toEqual(await demo.countOpenJobsByGroup());
  });

  it("norm_text = normText", () => {
    const samples = [
      "  Kỹ   Sư ĐIỆN ", "Đà Nẵng", "đường ống", "Nguyễn Thị Hương", "ＡｕｔｏＣＡＤ", "ﾊﾟｲﾌﾟ", "ガス配管", "東京都品川区",
      "０１２３４５６７８９", "＃００４１２", "#00412", "\t a \n b 　 c ", "a﻿b", "﻿ Kỹ sư", "ＰＬＣ／回路設計",
      "Ｃａｆé", "ｶﾞｽ ｺｳｼﾞ", "Thiết kế CAD (2D/3D)", "", "BIM・CIM　モデラー",
    ];
    const db: string[] = json(`select jsonb_agg(norm_text(x) order by i) from unnest(array[${samples.map(lit).join(", ")}]) with ordinality t(x, i)`);
    expect(db).toEqual(samples.map(normText));
  });
});
