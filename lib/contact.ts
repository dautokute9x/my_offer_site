import { isPlaceholder, type SiteSettings } from "@/lib/site-defaults";

export type ContactLink = { label: string; text: string; href?: string };

const ok = (v: string) => v.trim() !== "" && !isPlaceholder(v);
const https = (v: string) => ok(v) && /^https:\/\/\S+$/.test(v.trim());

// Ẩn placeholder/rỗng; chỉ tạo liên kết khi giá trị hợp lệ (Zalo không hợp lệ vẫn hiện dạng chữ).
export function contactLinks(s: SiteSettings): ContactLink[] {
  const out: ContactLink[] = [];
  const digits = s.zalo.replace(/[\s.\-()]/g, "").replace(/^\+/, "");
  if (ok(s.email)) out.push({ label: "Email", text: s.email, href: `mailto:${encodeURIComponent(s.email.trim()).replace(/%40/g, "@")}` });
  if (ok(s.phone)) out.push({ label: "Điện thoại", text: s.phone, href: `tel:${s.phone.replace(/[\s.\-()]/g, "")}` });
  if (ok(s.zalo)) out.push({ label: "Zalo", text: s.zalo, href: /^\d{8,15}$/.test(digits) ? `https://zalo.me/${digits}` : undefined });
  if (https(s.facebookUrl)) out.push({ label: "Facebook", text: s.facebookUrl, href: s.facebookUrl.trim() });
  if (https(s.zaloGroupUrl)) out.push({ label: "Nhóm Zalo", text: s.zaloGroupUrl, href: s.zaloGroupUrl.trim() });
  return out;
}
