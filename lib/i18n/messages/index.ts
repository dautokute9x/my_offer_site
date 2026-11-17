import vi from "./vi";
import type { Locale } from "../config";

// Kiểu từ điển: mọi chuỗi của bản tiếng Việt, nới thành string để bản dịch khác điền vào.
type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
export type Messages = Widen<typeof vi>;

// shortcut: chưa có bản dịch thì dùng tiếng Việt; bỏ khi đã đủ cả 6 tệp.
export const MESSAGES: Record<Locale, Messages> = { vi, en: vi, zh: vi, ja: vi, fil: vi, hi: vi };
