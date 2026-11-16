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
  file: { name: string; size: number; type: string } | null;
}

export const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx"];
export const MAX_CV_BYTES = 10 * 1024 * 1024;

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{9,15}$/;
const FB_URL = /^https:\/\/(www\.|m\.)?(facebook|fb)\.com\/\S*$/i;

export function validateApplication(i: ApplicationInput): Record<string, string> {
  const e: Record<string, string> = {};
  const name = i.fullName.trim();
  const email = i.email.trim();
  const phone = i.phone.trim();
  const fb = i.facebook.trim();

  if (i.kind !== "apply" && i.kind !== "consult") e.kind = "Loại yêu cầu không hợp lệ.";
  if (i.kind === "apply" && !/^[A-Za-z0-9]{1,20}$/.test((i.jobCode ?? "").trim())) e.jobCode = "Mã việc làm không hợp lệ.";
  if (name.length < 1 || name.length > 100) e.fullName = "Họ tên cần từ 1 đến 100 ký tự.";
  if (email && !EMAIL.test(email)) e.email = "Email không hợp lệ.";
  if (phone && !PHONE.test(phone.replace(/[\s.-]/g, ""))) e.phone = "Số điện thoại không hợp lệ.";
  if (fb && !(fb.length <= 100 && !/^https?:\/\//i.test(fb)) && !FB_URL.test(fb)) e.facebook = "Facebook không hợp lệ.";
  if (!email && !phone && !fb) e.contact = "Cần ít nhất một cách liên hệ: email, điện thoại/Zalo hoặc Facebook.";
  if (i.note.trim().length > 2000) e.note = "Ghi chú tối đa 2000 ký tự.";
  if (!i.consent) e.consent = "Bạn cần đồng ý xử lý dữ liệu cá nhân.";
  const key = i.idempotencyKey.trim();
  if (!key || key.length > 100) e.idempotencyKey = "Mã yêu cầu không hợp lệ.";

  if (i.kind === "apply" && !i.file) e.file = "Vui lòng đính kèm CV.";
  else if (i.file) {
    const ext = i.file.name.trim().split(".").pop()?.toLowerCase() ?? "";
    const mime = i.file.type.trim().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) e.file = "CV chỉ nhận PDF, Word hoặc Excel (pdf, doc, docx, xls, xlsx).";
    else if (i.file.size <= 0 || i.file.size > MAX_CV_BYTES) e.file = "CV phải lớn hơn 0 và không quá 10 MB.";
    else if (mime && mime !== "application/octet-stream" && mime !== MIME[ext]) e.file = "Loại tệp không khớp với phần mở rộng.";
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
