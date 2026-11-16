"use client";
import { useState, useTransition } from "react";
import { importCsv, previewCsv, type ImportResult, type Preview } from "@/app/admin/(protected)/nhap-csv/actions";

const MAX_BYTES = 2 * 1024 * 1024;

export function CsvImport() {
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const run = (t: string, mapping: unknown) => start(async () => {
    try { setPreview(await previewCsv(t, mapping)); } catch { setMsg("Không xem trước được. Thử lại."); }
  });
  const onFile = async (f: File | undefined) => {
    setResult(null); setPreview(null); setText(null); setMsg("");
    if (!f) return;
    if (f.size > MAX_BYTES) { setMsg("Tệp quá lớn (tối đa 2 MB)."); return; }
    const t = await f.text();
    if (t.includes("\uFFFD")) { setMsg("Tệp phải được lưu dạng UTF-8 (CSV UTF-8 trong Excel)."); return; }
    setText(t); run(t, null);
  };
  const errCount = preview ? preview.errors.length + preview.lines.reduce((n, l) => n + l.errors.length, 0) : 0;
  const canImport = !!text && !!preview && !preview.fatal && errCount === 0 && preview.valid > 0 && !pending;
  const doImport = () => start(async () => {
    try { setResult(await importCsv(text!, preview!.mapping)); } catch { setResult({ ok: false, message: "Không nhập được. Thử lại." }); }
  });
  const updates = preview?.lines.filter((l) => l.action === "update").length ?? 0;
  const setCol = (col: string, v: string) => run(text!, { ...preview!.mapping, [col]: v === "" ? null : Number(v) });

  return (
    <div className="space-y-6">
      <p><a href="/mau-nhap-tin.csv" download className="inline-flex min-h-11 items-center font-semibold underline">Tải file mẫu (.csv)</a></p>
      <label className="block text-sm font-semibold">Chọn tệp CSV (UTF-8, tối đa 2 MB, tối đa 2000 dòng)
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block min-h-11 w-full rounded border px-3 py-2 font-normal" />
      </label>
      <div role="status" aria-live="polite" className="text-sm">{pending && "Đang xử lý…"}</div>
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
      {preview?.fatal && <p role="alert" className="text-sm text-red-700">{preview.fatal}</p>}
      {preview && !preview.fatal && (
        <>
          <section aria-labelledby="h-map" className="space-y-2">
            <h2 id="h-map" className="text-xl font-bold">Ánh xạ cột</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(preview.mapping).map(([col, idx]) => (
                <label key={col} className="block text-sm font-semibold">{col}
                  <select value={idx ?? ""} onChange={(e) => setCol(col, e.target.value)} className="mt-1 block min-h-11 w-full rounded border px-2 font-normal">
                    <option value="">— không dùng —</option>
                    {preview.header.map((h, i) => <option key={i} value={i}>{h || `(cột ${i + 1})`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>
          <section aria-labelledby="h-prev" className="space-y-2">
            <h2 id="h-prev" className="text-xl font-bold">Xem trước</h2>
            {preview.errors.map((e, i) => <p key={i} role="alert" className="text-sm text-red-700">{e.message}</p>)}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Xem trước các dòng sẽ nhập</caption>
                <thead><tr><th scope="col" className="p-2">Dòng</th><th scope="col" className="p-2">Hành động</th><th scope="col" className="p-2">Mã</th><th scope="col" className="p-2">Tiêu đề</th><th scope="col" className="p-2">Lỗi / cảnh báo</th></tr></thead>
                <tbody>
                  {preview.lines.map((l) => (
                    <tr key={l.line} className="border-t align-top">
                      <td className="p-2">{l.line}</td>
                      <td className="p-2">{l.action === "create" ? "Tạo" : <strong className="text-red-700">Ghi đè</strong>}</td>
                      <td className="p-2">{l.code}</td>
                      <td className="p-2">{l.title}</td>
                      <td className="p-2">
                        {l.errors.map((m, i) => <p key={i} className="text-red-700">Lỗi — {m}</p>)}
                        {l.warnings.map((m, i) => <p key={i} className="text-amber-800">Cảnh báo — {m}</p>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {updates > 0 && <p role="alert" className="rounded border-2 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-800">{updates} tin đã tồn tại sẽ bị GHI ĐÈ toàn bộ nội dung; ô để trống sẽ xóa nội dung hiện có.</p>}
            <button type="button" onClick={doImport} disabled={!canImport} className="min-h-11 rounded bg-navy px-4 font-semibold text-white disabled:opacity-60">
              Nhập {preview.valid} tin
            </button>
            {errCount > 0 && <p className="text-sm text-red-700">Còn {errCount} lỗi — sửa tệp rồi chọn lại.</p>}
          </section>
        </>
      )}
      {result && (result.ok
        ? <p role="status" className="text-sm text-green-800">Đã nhập xong: tạo {result.created} tin, cập nhật {result.updated} tin.</p>
        : <p role="alert" className="text-sm text-red-700">{result.message}</p>)}
    </div>
  );
}
