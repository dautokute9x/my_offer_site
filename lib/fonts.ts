import { Be_Vietnam_Pro, Big_Shoulders, Noto_Sans_Devanagari, Noto_Sans_JP, Noto_Sans_SC } from "next/font/google";

// Big Shoulders (opsz 72 = bản "Display") và Be Vietnam Pro đều có bộ dấu tiếng Việt.
// Noto JP/SC/Devanagari chỉ là font dự phòng cho chữ Nhật, Trung, Hindi: không preload, trình duyệt chỉ tải khi trang có ký tự đó.
const bigShoulders = Big_Shoulders({ variable: "--font-big-shoulders", subsets: ["vietnamese", "latin"], axes: ["opsz"] });
const beVietnam = Be_Vietnam_Pro({ variable: "--font-be-vietnam", weight: ["400", "500", "700"], subsets: ["vietnamese", "latin"] });
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", weight: ["400", "700"], preload: false });
const notoSc = Noto_Sans_SC({ variable: "--font-noto-sc", weight: ["400", "700"], preload: false });
const notoDeva = Noto_Sans_Devanagari({ variable: "--font-noto-deva", weight: ["400", "700"], subsets: ["devanagari"], preload: false });

export const fontVars = [bigShoulders, beVietnam, notoJp, notoSc, notoDeva].map((f) => f.variable).join(" ");
