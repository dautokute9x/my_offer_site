"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { checkMapping, mapColumns, MAX_BYTES, validateRows, type Mapping, type RowIssue } from "@/lib/admin/csv-import";
import { parseCsv } from "@/lib/csv";
import { getCatalog } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";

export type PreviewLine = { line: number; action: "create" | "update"; code: string; title: string; errors: string[]; warnings: string[] };
export type Preview = {
  header: string[]; mapping: Mapping; lines: PreviewLine[]; valid: number; errors: RowIssue[]; fatal?: string;
};
export type ImportResult = { ok: true; created: number; updated: number } | { ok: false; message: string };

const PATH = "/admin/nhap-csv";

// Dùng chung cho xem trước và nhập: luôn đọc lại CSV + mapping từ client, không tin kết quả xem trước.
async function check(text: unknown, rawMapping: unknown) {
  if (typeof text !== "string" || Buffer.byteLength(text) > MAX_BYTES) return { fatal: "Tệp phải là văn bản UTF-8 và không quá 2 MB." } as const;
  const [header, ...data] = parseCsv(text);
  if (!header) return { fatal: "Tệp rỗng." } as const;
  const mapping = rawMapping == null ? mapColumns(header) : checkMapping(rawMapping, header.length);
  if (!mapping) return { fatal: "Ánh xạ cột không hợp lệ." } as const;
  const sb = await createServerSupabase();
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) { // PostgREST cắt mỗi lần 1000 dòng
    const { data: page, error } = await sb.from("jobs").select("code").order("id").range(from, from + 999);
    if (error) { console.error("[admin/csv]", error.code); return { fatal: "Không đọc được danh sách tin hiện có." } as const; }
    page.forEach((j) => existing.add(j.code.toLowerCase()));
    if (page.length < 1000) break;
  }
  const res = validateRows(data, mapping, await getCatalog(), existing);
  return { header, data, mapping, existing, ...res } as const;
}

export async function previewCsv(text: string, rawMapping: unknown = null): Promise<Preview> {
  await requireAdmin(PATH);
  const r = await check(text, rawMapping);
  if (r.fatal) return { header: [], mapping: mapColumns([]), lines: [], valid: 0, errors: [], fatal: r.fatal };
  const cell = (row: string[], c: "code" | "title_vi") => (r.mapping[c] == null ? "" : (row[r.mapping[c]!] ?? "").trim());
  const lines: PreviewLine[] = [];
  r.data.forEach((row, i) => {
    if (row.every((x) => x.trim() === "")) return;
    const line = i + 2, code = cell(row, "code");
    lines.push({
      line, code, title: cell(row, "title_vi"), action: r.existing.has(code.toLowerCase()) ? "update" : "create",
      errors: r.errors.filter((e) => e.line === line).map((e) => `${e.column ? `${e.column}: ` : ""}${e.message}`),
      warnings: r.warnings.filter((e) => e.line === line).map((e) => e.message),
    });
  });
  const general = r.errors.filter((e) => !lines.some((l) => l.line === e.line)); // lỗi chung (vd quá 2000 dòng)
  return { header: r.header, mapping: r.mapping, lines, valid: r.rows.length, errors: general };
}

export async function importCsv(text: string, rawMapping: unknown): Promise<ImportResult> {
  await requireAdmin(PATH);
  const r = await check(text, rawMapping);
  if (r.fatal) return { ok: false, message: r.fatal };
  if (r.errors.length) return { ok: false, message: `Còn ${r.errors.length} lỗi; không có dòng nào được nhập.` };
  if (!r.rows.length) return { ok: false, message: "Không có dòng nào để nhập." };
  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc("import_jobs", { p: { rows: r.rows.map((x) => ({ job: x.data.job, prefectureIds: x.data.prefectureIds, occupationIds: x.data.occupationIds, skillIds: x.data.skillIds, benefits: x.data.benefits, interviews: x.data.interviews })) } });
  if (error) {
    console.error("[admin/importCsv]", error.code, error.message);
    return { ok: false, message: "Không nhập được; không có dòng nào được ghi. Thử lại hoặc báo quản trị viên." };
  }
  for (const p of ["/", "/viec-lam", "/lich-phong-van", "/sitemap.xml"]) revalidatePath(p);
  const res = data as { created: number; updated: number };
  return { ok: true, created: res.created, updated: res.updated };
}
