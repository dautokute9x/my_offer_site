export class CsvError extends Error {}

// RFC 4180: ngoặc kép, "" trong ô, xuống dòng trong ô; bỏ BOM; CRLF/LF; bỏ dòng trống cuối tệp.
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, i = 0;
  const endRow = () => { row.push(cell); rows.push(row); row = []; cell = ""; };
  for (; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\r" || c === "\n") { if (c === "\r" && s[i + 1] === "\n") i++; endRow(); }
    else cell += c;
  }
  if (quoted) throw new CsvError(`Tệp CSV có dấu ngoặc kép chưa đóng (gần dòng ${rows.length + 1}).`);
  if (cell !== "" || row.length) endRow();
  while (rows.length && rows[rows.length - 1].every((x) => x === "")) rows.pop();
  return rows;
}
