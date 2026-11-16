import { describe, expect, it } from "vitest";
import { parseCatalog } from "@/lib/admin/catalog-input";
import { parseSettings } from "@/lib/admin/settings-input";
import { siteDefaults } from "@/lib/site-defaults";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ ...siteDefaults, retentionMonths: "12", policiesConfirmed: "", ...o })) if (v !== "") f.set(k, String(v));
  return f;
};
const errs = (o: Record<string, string>) => { const r = parseSettings(fd(o)); return "errors" in r ? r.errors : {}; };

describe("parseSettings", () => {
  it("placeholder mặc định hợp lệ", () => { expect(parseSettings(fd({}))).toMatchObject({ email: "[EMAIL LIÊN HỆ]", retentionMonths: 12, policiesConfirmed: false }); });
  it("retentionMonths", () => {
    for (const v of ["0", "61", "abc", "1.5"]) expect(errs({ retentionMonths: v }).retentionMonths).toBeTruthy();
    expect(errs({ retentionMonths: "60" })).toEqual({});
  });
  it("URL phải https", () => {
    expect(errs({ facebookUrl: "http://fb.com/x" }).facebookUrl).toBeTruthy();
    expect(errs({ facebookUrl: "javascript:x" }).facebookUrl).toBeTruthy();
    expect(errs({ zaloGroupUrl: "https://zalo.me/g/abc" })).toEqual({});
  });
  it("email, consent, brand, checkbox", () => {
    expect(errs({ email: "a@b" }).email).toBeTruthy();
    expect(errs({ email: "a@b.jp" })).toEqual({});
    expect(errs({ email: "[EMAIL]" })).toEqual({});
    expect(errs({ consentVersion: " " }).consentVersion).toBeTruthy();
    expect(errs({ brandName: "x".repeat(101) }).brandName).toBeTruthy();
    expect(errs({ aboutText: "x".repeat(5001) }).aboutText).toBeTruthy();
    expect(parseSettings(fd({ policiesConfirmed: "on" }))).toMatchObject({ policiesConfirmed: true });
  });
});

describe("parseCatalog", () => {
  const f = (o: Record<string, string>) => Object.entries(o).reduce((a, [k, v]) => (a.set(k, v), a), new FormData());
  it("nghề: slug, nhóm tồn tại, alias tách dấu phẩy", () => {
    const ok = parseCatalog("occupation", f({ slug: "dien", name_vi: "Điện", name_ja: "電気", group_id: "2", aliases: "a, b,,a" }), new Set([2]));
    expect(ok).toEqual({ row: { slug: "dien", name_vi: "Điện", name_ja: "電気", group_id: 2, aliases: ["a", "b"] } });
    const bad = parseCatalog("occupation", f({ slug: "Điện", name_vi: "", name_ja: "x", group_id: "9" }), new Set([2]));
    expect("errors" in bad && Object.keys(bad.errors).sort()).toEqual(["group_id", "name_vi", "slug"]);
  });
  it("tỉnh chỉ nameVi + aliases", () => {
    expect(parseCatalog("prefecture", f({ name_vi: "Tokyo", aliases: "tokyo", slug: "bad!" }))).toEqual({ row: { name_vi: "Tokyo", aliases: ["tokyo"] } });
  });
});
