import { isPlaceholder, type SiteSettings } from "@/lib/site-defaults";

export type SettingsErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// Rỗng hoặc placeholder được chấp nhận (trang công khai ẩn mục tương ứng, xem lib/contact.ts).
export function parseSettings(fd: FormData): SiteSettings | { errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const brandName = text(fd, "brandName");
  if (!brandName || brandName.length > 100) errors.brandName = "Nhập tên thương hiệu (tối đa 100 ký tự).";
  const domain = text(fd, "domain");
  if (domain.length > 200) errors.domain = "Tối đa 200 ký tự.";
  const email = text(fd, "email");
  if (email && !isPlaceholder(email) && !EMAIL.test(email)) errors.email = "Email không hợp lệ.";
  const phone = text(fd, "phone"), zalo = text(fd, "zalo");
  if (phone.length > 50) errors.phone = "Tối đa 50 ký tự.";
  if (zalo.length > 100) errors.zalo = "Tối đa 100 ký tự.";
  const url = (k: string) => {
    const v = text(fd, k);
    if (v && !isPlaceholder(v) && !/^https:\/\/\S+$/.test(v)) errors[k] = "Liên kết phải bắt đầu bằng https://.";
    else if (v.length > 300) errors[k] = "Tối đa 300 ký tự.";
    return v;
  };
  const facebookUrl = url("facebookUrl"), zaloGroupUrl = url("zaloGroupUrl");
  const aboutText = String(fd.get("aboutText") ?? "").trim();
  if (aboutText.length > 5000) errors.aboutText = "Tối đa 5000 ký tự.";
  const consentVersion = text(fd, "consentVersion");
  if (!consentVersion || consentVersion.length > 50) errors.consentVersion = "Nhập phiên bản đồng ý (tối đa 50 ký tự).";
  const rm = text(fd, "retentionMonths");
  const retentionMonths = /^\d{1,3}$/.test(rm) ? Number(rm) : NaN;
  if (!(retentionMonths >= 1 && retentionMonths <= 60)) errors.retentionMonths = "Nhập số nguyên từ 1 đến 60.";
  if (Object.keys(errors).length) return { errors };
  return {
    brandName, domain, email, phone, zalo, facebookUrl, zaloGroupUrl, aboutText, consentVersion, retentionMonths,
    policiesConfirmed: fd.get("policiesConfirmed") === "on",
  };
}
