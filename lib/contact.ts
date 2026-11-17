import { isPlaceholder, type SiteSettings } from "@/lib/site-defaults";

export type ContactLink = { label: string; text: string; href?: string };

const ok = (v: string) => v.trim() !== "" && !isPlaceholder(v);
const https = (v: string) => ok(v) && /^https:\/\/\S+$/.test(v.trim());

// Ẩn placeholder/rỗng; chỉ tạo liên kết khi giá trị hợp lệ (Zalo không hợp lệ vẫn hiện dạng chữ).
export const CONTACT_LABELS_VI = { email: "Email", phone: "Điện thoại", zalo: "Zalo", facebook: "Facebook", zaloGroup: "Nhóm Zalo" };

export function contactLinks(s: SiteSettings, L: typeof CONTACT_LABELS_VI = CONTACT_LABELS_VI): ContactLink[] {
  const out: ContactLink[] = [];
  const digits = s.zalo.replace(/[\s.\-()]/g, "").replace(/^\+/, "");
  if (ok(s.email)) out.push({ label: L.email, text: s.email, href: `mailto:${encodeURIComponent(s.email.trim()).replace(/%40/g, "@")}` });
  if (ok(s.phone)) out.push({ label: L.phone, text: s.phone, href: `tel:${s.phone.replace(/[\s.\-()]/g, "")}` });
  if (ok(s.zalo)) out.push({ label: L.zalo, text: s.zalo, href: /^\d{8,15}$/.test(digits) ? `https://zalo.me/${digits}` : undefined });
  if (https(s.facebookUrl)) out.push({ label: L.facebook, text: s.facebookUrl, href: s.facebookUrl.trim() });
  if (https(s.zaloGroupUrl)) out.push({ label: L.zaloGroup, text: s.zaloGroupUrl, href: s.zaloGroupUrl.trim() });
  return out;
}
