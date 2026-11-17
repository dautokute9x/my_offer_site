import { CsvError, parseCsv } from "@/lib/csv";
import { normText } from "@/lib/normalize";
import { isDateKey, jstToIso } from "@/lib/time";
import type { Catalog } from "@/lib/types";
import { normalizeJobInput, type JobInput, type Raw } from "@/lib/admin/job-input";

// Danh sách cột theo spec §9 bước 8.
export const COLUMNS = [
  "code", "status", "title_vi", "title_ja", "employer_name", "prefectures", "location_detail_ja", "occupations", "skills",
  "monthly_min_yen", "monthly_max_yen", "annual_min_man", "annual_max_man", "salary_negotiable", "salary_source_text",
  "jp_level", "experience_years_min",
  ...["summary", "description", "requirements", "working_hours", "holidays", "overtime", "benefits_note"].flatMap((f) => [`${f}_ja`, `${f}_vi`]),
  "translation_status", "benefits_yes", "benefits_no", "driver_license_required", "company_car_provided", "interviews", "valid_through",
] as const;
export type Column = (typeof COLUMNS)[number];
export type Mapping = Record<Column, number | null>;
export type RowIssue = { line: number; column: string; message: string };
export type ImportRow = { line: number; action: "create" | "update"; data: JobInput & { interviews: string[] } };

export const MAX_ROWS = 2000;
export const MAX_BYTES = 2 * 1024 * 1024;

// Đọc + kiểm tra tệp thô; lỗi nghiêm trọng trả về `fatal` (tiếng Việt) thay vì ném.
export function readCsv(text: unknown): { fatal: string } | { header: string[]; data: string[][] } {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BYTES) return { fatal: "Tệp phải là văn bản UTF-8 và không quá 2 MB." };
  if (text.includes("\uFFFD")) return { fatal: "Tệp phải được lưu dạng UTF-8 (CSV UTF-8 trong Excel)." };
  try {
    const [header, ...data] = parseCsv(text);
    return header ? { header, data } : { fatal: "Tệp rỗng." };
  } catch (e) {
    if (e instanceof CsvError) return { fatal: e.message };
    throw e;
  }
}

const key = (s: string) => s.replace(/^﻿/, "").trim().toLowerCase().replace(/\s+/g, "_");
export function mapColumns(header: string[]): Mapping {
  const idx = header.map(key);
  return Object.fromEntries(COLUMNS.map((c) => { const i = idx.indexOf(c); return [c, i < 0 ? null : i]; })) as Mapping;
}

// Mapping đến từ client: chỉ nhận khóa đã biết và chỉ số trong phạm vi header.
export function checkMapping(m: unknown, width: number): Mapping | null {
  if (!m || typeof m !== "object") return null;
  const out = Object.fromEntries(COLUMNS.map((c) => [c, null])) as Mapping;
  for (const [k, v] of Object.entries(m)) {
    if (!(COLUMNS as readonly string[]).includes(k)) return null;
    if (v === null) continue;
    if (!Number.isInteger(v) || (v as number) < 0 || (v as number) >= width) return null;
    out[k as Column] = v as number;
  }
  return out;
}

const camel = (c: string) => c.replace(/_([a-z])/g, (_, x: string) => x.toUpperCase());
const RAW_TO_COLUMN: Record<string, Column> = {
  prefectureIds: "prefectures", occupationIds: "occupations", skillIds: "skills",
  monthlyMinMan: "monthly_min_yen", monthlyMaxMan: "monthly_max_yen",
};
for (const c of COLUMNS) RAW_TO_COLUMN[camel(c)] ??= c;

const TRI: Record<string, "yes" | "no"> = { co: "yes", yes: "yes", true: "yes", "1": "yes", khong: "no", no: "no", false: "no", "0": "no" };
const MAN_SUFFIX = /\s*万円?$/;

function monthlyToMan(v: string): string | null {
  if (MAN_SUFFIX.test(v)) return v.replace(MAN_SUFFIX, "");
  if (!/^\d+$/.test(v) || Number(v) < 10_000 || Number(v) % 100) return null;
  return String(Number(v) / 10_000);
}

function interviewIso(v: string): string | null {
  const m = /^(\d{4})[-/](\d{2})[-/](\d{2}) (\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const d = `${m[1]}-${m[2]}-${m[3]}`;
  if (!isDateKey(d) || +m[4] > 23 || +m[5] > 59) return null;
  return jstToIso(d, `${m[4]}:${m[5]}`);
}

export function validateRows(rows: string[][], mapping: Mapping, catalog: Catalog, existingCodes: Iterable<string>) {
  const out: ImportRow[] = [], errors: RowIssue[] = [], warnings: RowIssue[] = [];
  if (rows.length > MAX_ROWS) {
    return { rows: out, errors: [{ line: 1, column: "", message: `Tệp có ${rows.length} dòng; tối đa ${MAX_ROWS} dòng mỗi lần nhập.` }], warnings };
  }
  const existing = new Set([...existingCodes].map((c) => c.toLowerCase()));
  const numericLen = new Map<number, number>(); // giá trị số → độ dài mã số dài nhất đã có
  for (const e of existing) if (/^\d+$/.test(e)) numericLen.set(Number(e), Math.max(numericLen.get(Number(e)) ?? 0, e.length));
  const lookup = (items: { id: number; keys: string[] }[]) => {
    const m = new Map<string, number>();
    for (const it of items) for (const k of it.keys) m.set(normText(k), it.id);
    return m;
  };
  const prefs = lookup(catalog.prefectures.map((p) => ({ id: p.id, keys: [p.nameJa, p.nameVi, p.romaji, p.code, String(Number(p.code)), ...p.aliases] })));
  const occs = lookup(catalog.occupations.map((o) => ({ id: o.id, keys: [o.nameVi, o.nameJa, o.slug, ...o.aliases] })));
  const skills = lookup(catalog.skills.map((s) => ({ id: s.id, keys: [s.name, ...s.aliases] })));
  const benefits = new Map<string, string>();
  for (const b of catalog.benefits) for (const k of [b.slug, b.nameVi, b.nameJa]) benefits.set(normText(k), b.slug);

  const cell = (r: string[], c: Column) => (mapping[c] == null ? "" : (r[mapping[c]!] ?? "").trim());
  const codeCount = new Map<string, number>();
  for (const r of rows) { const c = cell(r, "code").toLowerCase(); if (c) codeCount.set(c, (codeCount.get(c) ?? 0) + 1); }

  rows.forEach((r, i) => {
    if (r.every((x) => x.trim() === "")) return;
    const line = i + 2;
    const errs: RowIssue[] = [];
    const bad = (column: string, message: string) => errs.push({ line, column, message });
    const raw: Raw = {};
    for (const c of COLUMNS) if (mapping[c] != null) raw[camel(c)] = cell(r, c);

    const list = (c: Column, map: Map<string, number>, key: string) => {
      const ids: number[] = [];
      for (const part of cell(r, c).split("|").map((x) => x.trim()).filter(Boolean)) {
        const id = map.get(normText(part));
        if (id === undefined) bad(c, `Không nhận ra "${part}".`); else ids.push(id);
      }
      raw[key] = ids.map(String);
    };
    list("prefectures", prefs, "prefectureIds"); list("occupations", occs, "occupationIds"); list("skills", skills, "skillIds");

    for (const [c, v] of [["benefits_yes", "yes"], ["benefits_no", "no"]] as const) {
      for (const part of cell(r, c).split("|").map((x) => x.trim()).filter(Boolean)) {
        const slug = benefits.get(normText(part));
        if (!slug) bad(c, `Không nhận ra phúc lợi "${part}".`); else raw[`benefit.${slug}`] = v;
      }
    }
    for (const c of ["salary_negotiable", "driver_license_required", "company_car_provided"] as const) {
      const v = cell(r, c);
      if (!v) { raw[camel(c)] = ""; continue; }
      const t = TRI[normText(v)];
      if (t) raw[camel(c)] = t; else bad(c, 'Chỉ nhận "co", "khong" hoặc để trống.');
    }
    for (const c of ["monthly_min_yen", "monthly_max_yen"] as const) {
      const v = cell(r, c), man = v ? monthlyToMan(v) : "";
      if (man === null) bad(c, "Nhập số yên (từ 10000, bội của 100) hoặc số 万 như 25万."); else raw[camel(c).replace("Yen", "Man")] = man;
    }
    for (const c of ["annual_min_man", "annual_max_man"] as const) raw[camel(c)] = cell(r, c).replace(MAN_SUFFIX, "");
    raw.jpLevel = cell(r, "jp_level").replace(/^n[1-5]$/i, (x) => x.toUpperCase());
    raw.translationStatus = cell(r, "translation_status").toLowerCase();
    raw.status = cell(r, "status").toLowerCase();
    raw.validThrough = cell(r, "valid_through").replace(/\//g, "-");

    const interviews: string[] = [];
    for (const part of cell(r, "interviews").split("|").map((x) => x.trim()).filter(Boolean)) {
      const iso = interviewIso(part);
      if (iso) interviews.push(iso); else bad("interviews", `Ngày giờ "${part}" không hợp lệ (YYYY-MM-DD HH:mm, giờ Nhật).`);
    }

    const code = cell(r, "code");
    if (code && (codeCount.get(code.toLowerCase()) ?? 0) > 1) bad("code", "Mã tin bị trùng trong tệp.");
    if (/^\d+$/.test(code) && (numericLen.get(Number(code)) ?? 0) > code.length)
      warnings.push({ line, column: "code", message: "Có thể Excel đã bỏ số 0 ở đầu." });

    const res = normalizeJobInput(raw, catalog);
    if ("errors" in res) for (const [k, message] of Object.entries(res.errors)) bad(RAW_TO_COLUMN[k] ?? k, message);
    if (errs.length || "errors" in res) {
      // Một ô sai có thể bị báo hai lần (bước đọc ô và bước chuẩn hóa): giữ lỗi đầu tiên của mỗi cột.
      const seen = new Set<string>();
      for (const e of errs) if (!seen.has(e.column)) { seen.add(e.column); errors.push(e); }
      return;
    }
    out.push({ line, action: existing.has(code.toLowerCase()) ? "update" : "create", data: { ...res, interviews } });
  });
  return { rows: out, errors, warnings };
}
