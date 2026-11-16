export type SiteSettings = {
  brandName: string;
  domain: string;
  email: string;
  phone: string;
  zalo: string;
  facebookUrl: string;
  zaloGroupUrl: string;
  aboutText: string;
  consentVersion: string;
  retentionMonths: number;
  policiesConfirmed: boolean;
};

// Giá trị dạng [...] là placeholder chưa điền: không hiển thị liên kết/mục tương ứng.
export const siteDefaults: SiteSettings = {
  brandName: "[TÊN THƯƠNG HIỆU]",
  domain: "[TÊN MIỀN]",
  email: "[EMAIL LIÊN HỆ]",
  phone: "[SỐ LIÊN HỆ]",
  zalo: "[ZALO]",
  facebookUrl: "[LINK FACEBOOK]",
  zaloGroupUrl: "[LINK NHÓM ZALO]",
  aboutText: "[GIỚI THIỆU]",
  consentVersion: "v0-chua-xac-nhan",
  retentionMonths: 12,
  policiesConfirmed: false,
};

export function isPlaceholder(v: string): boolean {
  return /^\[.*\]$/.test(v.trim());
}
