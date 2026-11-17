import vi from "./vi";
import en from "./en";
import zh from "./zh";
import ja from "./ja";
import fil from "./fil";
import hi from "./hi";
import type { Locale } from "../config";

// Kiểu từ điển: mọi chuỗi của bản tiếng Việt, nới thành string để bản dịch khác điền vào.
type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
export type Messages = Widen<typeof vi>;

export const MESSAGES: Record<Locale, Messages> = { vi, en, zh, ja, fil, hi };
