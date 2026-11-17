// Cách viết ngày giờ theo ngôn ngữ; mặc định tiếng Việt. Bản dịch nằm ở từ điển (messages.*.dates).
export type DateWords = { weekdays: string[]; date: string; jst: string; vn: string };
export const DATES_VI: DateWords = {
  weekdays: ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"],
  date: "{d}/{m}/{y}",
  jst: "giờ Nhật (JST, UTC+9)",
  vn: "giờ Việt Nam (UTC+7)",
};
const dmy = (W: DateWords, p: { d: string; m: string; y: string }) => W.date.replace("{d}", p.d).replace("{m}", p.m).replace("{y}", p.y);

function parts(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  // weekday of the calendar date in the target zone
  const weekday = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute, weekday };
}

export function formatJst(iso: string, W: DateWords = DATES_VI): string {
  const p = parts(new Date(iso), "Asia/Tokyo");
  return `${W.weekdays[p.weekday]}, ${dmy(W, p)} · ${p.hh}:${p.mm} ${W.jst}`;
}

export function formatVn(iso: string, W: DateWords = DATES_VI): string {
  const p = parts(new Date(iso), "Asia/Ho_Chi_Minh");
  return `${dmy(W, p)} · ${p.hh}:${p.mm} ${W.vn}`;
}

export function jstDateKey(iso: string): string {
  const p = parts(new Date(iso), "Asia/Tokyo");
  return `${p.y}-${p.m}-${p.d}`;
}

// Ném RangeError khi ngày/giờ không tồn tại (2026-02-30, 25:00): Date tự "lăn" sang ngày khác nên phải so lại.
export function jstToIso(dateKey: string, hhmm: string): string {
  const d = new Date(`${dateKey}T${hhmm}:00+09:00`);
  if (Number.isNaN(d.getTime()) || jstDateKey(d.toISOString()) !== dateKey) throw new RangeError(`Ngày không hợp lệ: ${dateKey} ${hhmm}`);
  return d.toISOString();
}

export function jstTodayKey(now: Date = new Date()): string {
  return jstDateKey(now.toISOString());
}

// "2026-11-20" -> "Thứ Sáu, 20/11/2026"
export function dayHeading(dateKey: string, W: DateWords = DATES_VI): string {
  const [y, m, d] = dateKey.split("-");
  return `${W.weekdays[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()]}, ${dmy(W, { d, m, y })}`;
}

// Tham số ?tu=/?den= dạng YYYY-MM-DD có thật (bỏ 2026-02-30); lặp lại thì lấy giá trị đầu.
// "YYYY-MM-DD" có thật (loại 2026-02-30, 2026-13-45).
export const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);

export function parseDateKey(v: string | string[] | undefined): string | undefined {
  const s = [v ?? []].flat()[0] ?? "";
  return isDateKey(s) ? s : undefined;
}
