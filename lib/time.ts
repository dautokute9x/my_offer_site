const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function parts(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  // weekday of the calendar date in the target zone
  const weekday = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute, weekday };
}

export function formatJst(iso: string): string {
  const p = parts(new Date(iso), "Asia/Tokyo");
  return `${WEEKDAYS[p.weekday]}, ${p.d}/${p.m}/${p.y} · ${p.hh}:${p.mm} giờ Nhật (JST, UTC+9)`;
}

export function formatVn(iso: string): string {
  const p = parts(new Date(iso), "Asia/Ho_Chi_Minh");
  return `${p.d}/${p.m}/${p.y} · ${p.hh}:${p.mm} giờ Việt Nam (UTC+7)`;
}

export function jstDateKey(iso: string): string {
  const p = parts(new Date(iso), "Asia/Tokyo");
  return `${p.y}-${p.m}-${p.d}`;
}

export function jstToIso(dateKey: string, hhmm: string): string {
  return new Date(`${dateKey}T${hhmm}:00+09:00`).toISOString();
}

export function jstTodayKey(now: Date = new Date()): string {
  return jstDateKey(now.toISOString());
}

// "2026-11-20" -> "Thứ Sáu, 20/11/2026"
export function dayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${WEEKDAYS[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()]}, ${d}/${m}/${y}`;
}

// Tham số ?tu=/?den= dạng YYYY-MM-DD có thật (bỏ 2026-02-30); lặp lại thì lấy giá trị đầu.
export function parseDateKey(v: string | string[] | undefined): string | undefined {
  const s = [v ?? []].flat()[0] ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s) ? s : undefined;
}
