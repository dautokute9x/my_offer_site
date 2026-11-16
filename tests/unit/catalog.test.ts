import { describe, expect, it } from "vitest";
import { demoCatalog as c } from "@/lib/demo/catalog";
import { normText } from "@/lib/normalize";

describe("demoCatalog", () => {
  it("47 tỉnh, mã JIS 01..47, 8 vùng", () => {
    expect(c.prefectures).toHaveLength(47);
    expect(c.prefectures.map((p) => p.code)).toEqual(Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0")));
    expect(new Set(c.prefectures.map((p) => p.region)).size).toBe(8);
  });
  it("alias Tokyo và Hokkaido", () => {
    const tokyo = c.prefectures.find((p) => p.code === "13")!;
    expect(tokyo.aliases.map(normText)).toEqual(expect.arrayContaining(["tokyo", "東京", "東京都"]));
    expect(c.prefectures[0].aliases).toEqual(expect.arrayContaining(["北海道", "北海"]));
  });
  it("nhóm và nghề", () => {
    expect(new Set(c.groups.map((g) => g.slug)).size).toBe(5);
    expect(new Set(c.occupations.map((o) => o.slug)).size).toBe(c.occupations.length);
    for (const g of c.groups) {
      const n = c.occupations.filter((o) => o.groupId === g.id).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
    }
    for (const o of c.occupations) expect(c.groups.filter((g) => g.id === o.groupId)).toHaveLength(1);
  });
  it("kỹ năng và quyền lợi", () => {
    expect(c.skills).toHaveLength(12);
    expect(c.benefits.map((b) => b.slug)).toHaveLength(8);
    expect(c.benefits.filter((b) => b.featured).map((b) => b.slug)).toEqual(["ky-tuc-xa", "ho-tro-nha-o", "ho-tro-chuyen-nha"]);
  });
});
