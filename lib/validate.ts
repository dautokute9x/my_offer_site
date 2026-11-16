import type { JpLevel } from "./types";

export interface ApplicationInput {
  kind: "apply" | "consult";
  jobCode: string | null;
  fullName: string;
  email: string;
  phone: string;
  facebook: string;
  jpLevel: JpLevel | "";
  note: string;
  consent: boolean;
  idempotencyKey: string;
  consentVersion: string;
  // Chỉ để kiểm tra trước; chốt chặn thật là bước complete (kích thước thật + magic bytes).
  file: { name: string; size: number; type: string } | null;
}

export const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx"];
export const MAX_CV_BYTES = 10 * 1024 * 1024;

export const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{9,15}$/;
const FB_URL = /^https:\/\/(www\.|m\.)?(facebook|fb)\.com\/(profile\.php\?id=\d+|[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*\/?)$/i;
const FB_HANDLE = /^[A-Za-z0-9.]{1,100}$/;
const JP_LEVELS = ["", "N1", "N2", "N3", "N4", "N5", "none"];
const ZIP_MIME = ["application/zip", "application/x-zip-compressed"];

// Trust boundary: input may be any shape, so never call string methods on raw values.
const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");

export function validateApplication(i: ApplicationInput): Record<string, string> {
  const e: Record<string, string> = {};
  const kind = str(i?.kind);
  const name = str(i?.fullName);
  const email = str(i?.email);
  const phone = str(i?.phone);
  const fb = str(i?.facebook);

  if (kind !== "apply" && kind !== "consult") e.kind = "Loại yêu cầu không hợp lệ.";
  if (kind === "apply" && !/^[A-Za-z0-9]{1,20}$/.test(str(i?.jobCode))) e.jobCode = "Mã việc làm không hợp lệ.";
  if (name.length < 1 || name.length > 100) e.fullName = "Họ tên cần từ 1 đến 100 ký tự.";
  if (email && (email.length > 254 || !EMAIL.test(email))) e.email = "Email không hợp lệ.";
  if (phone && !PHONE.test(phone.replace(/[\s.-]/g, ""))) e.phone = "Số điện thoại không hợp lệ.";
  if (fb && !FB_HANDLE.test(fb) && !FB_URL.test(fb)) e.facebook = "Facebook không hợp lệ.";
  if (!email && !phone && !fb) e.contact = "Cần ít nhất một cách liên hệ: email, điện thoại/Zalo hoặc Facebook.";
  if (typeof i?.note !== "string" || i.note.trim().length > 2000) e.note = "Ghi chú tối đa 2000 ký tự.";
  if (i?.consent !== true) e.consent = "Bạn cần đồng ý xử lý dữ liệu cá nhân.";
  const cv = str(i?.consentVersion);
  if (!cv || cv.length > 50) e.consentVersion = "Phiên bản đồng ý không hợp lệ.";
  if (!JP_LEVELS.includes(i?.jpLevel as string)) e.jpLevel = "Trình độ tiếng Nhật không hợp lệ.";
  const key = str(i?.idempotencyKey);
  if (!key || key.length > 100) e.idempotencyKey = "Mã yêu cầu không hợp lệ.";

  const f: unknown = i?.file;
  if (f == null) {
    if (kind === "apply") e.file = "Vui lòng đính kèm CV.";
  } else if (typeof f !== "object") {
    e.file = "Tệp không hợp lệ.";
  } else {
    const { name: fname, size, type } = f as Record<string, unknown>;
    const n = str(fname);
    const dot = n.lastIndexOf(".");
    const ext = dot > 0 ? n.slice(dot + 1).toLowerCase() : "";
    const mime = str(type).toLowerCase();
    const mimeOk = !mime || mime === "application/octet-stream" || mime === MIME[ext] || ((ext === "docx" || ext === "xlsx") && ZIP_MIME.includes(mime));
    if (n.length > 200) e.file = "Tên tệp tối đa 200 ký tự.";
    else if (!ALLOWED_EXT.includes(ext)) e.file = "CV chỉ nhận PDF, Word hoặc Excel (pdf, doc, docx, xls, xlsx).";
    else if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_CV_BYTES) e.file = "CV phải lớn hơn 0 và không quá 10 MB.";
    else if (!mimeOk) e.file = "Loại tệp không khớp với phần mở rộng.";
  }
  return e;
}

export function sniffFileKind(head: Uint8Array): "pdf" | "ole" | "zip" | null {
  const starts = (sig: number[]) => head.length >= sig.length && sig.every((b, n) => head[n] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ole";
  if (starts([0x50, 0x4b, 0x03, 0x04])) return "zip";
  return null;
}
