import { describe, expect, it } from "vitest";
import { generateSlug } from "@/lib/admin/job-input";
import { codeFromSlugParam, jobHref } from "@/lib/filters";

describe("codeFromSlugParam", () => {
  it("takes the part after the last dash", () => {
    expect(codeFromSlugParam("thiet-ke-dien-plc-00412")).toBe("00412");
    expect(codeFromSlugParam("00412")).toBe("00412");
  });
  it("does not throw on edge input", () => {
    expect(codeFromSlugParam("abc-")).toBe("");
    expect(codeFromSlugParam("")).toBe("");
  });
  it("round-trips jobHref", () => {
    const href = jobHref({ slug: "ky-su-dien", code: "00412" });
    expect(href).toBe("/viec-lam/ky-su-dien-00412");
    expect(codeFromSlugParam(href.split("/").pop()!)).toBe("00412");
  });
});

describe("generateSlug", () => {
  it("strips Vietnamese diacritics (incl. đ) and punctuation", () => {
    expect(generateSlug("Đường ống — Kỹ sư  CAD/CAM!")).toBe("duong-ong-ky-su-cadcam");
  });
  it("falls back when nothing usable remains", () => {
    expect(generateSlug("電気技術者")).toBe("tin");
    expect(generateSlug("  ")).toBe("tin");
  });
});
