import { describe, expect, it } from "vitest";
import { contactLinks } from "@/lib/contact";
import { siteDefaults, type SiteSettings } from "@/lib/site-defaults";

const make = (p: Partial<SiteSettings>) => contactLinks({ ...siteDefaults, ...p });

describe("contactLinks", () => {
  it("ẩn toàn bộ khi là placeholder", () => expect(make({})).toEqual([]));
  it("ẩn chuỗi rỗng/khoảng trắng", () => {
    expect(make({ email: "", phone: "  ", zalo: "", facebookUrl: "", zaloGroupUrl: "" })).toEqual([]);
  });
  it("từ chối http:// và javascript:", () => {
    expect(make({ facebookUrl: "http://fb.com/x", zaloGroupUrl: "javascript:alert(1)" })).toEqual([]);
  });
  it("tạo liên kết hợp lệ", () => {
    const r = make({ email: "a@b.vn", phone: "090 123 4567", zalo: "+84 90 123 4567", facebookUrl: "https://fb.com/x", zaloGroupUrl: "https://zalo.me/g/abc" });
    expect(r.map((i) => i.href)).toEqual(["mailto:a@b.vn", "tel:0901234567", "https://zalo.me/84901234567", "https://fb.com/x", "https://zalo.me/g/abc"]);
  });
  it("Zalo không phải số thì chỉ hiện chữ; email có ký tự lạ được mã hóa", () => {
    const r = make({ zalo: "abc", email: "a b@c.vn?x=1" });
    expect(r.find((i) => i.label === "Zalo")).toEqual({ label: "Zalo", text: "abc", href: undefined });
    expect(r[0].href).toBe("mailto:a%20b@c.vn%3Fx%3D1");
  });
});
