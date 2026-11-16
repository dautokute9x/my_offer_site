import { describe, expect, it } from "vitest";
import { codeFromSlugParam } from "@/lib/filters";

describe("codeFromSlugParam", () => {
  it("takes the part after the last dash", () => {
    expect(codeFromSlugParam("thiet-ke-dien-plc-00412")).toBe("00412");
    expect(codeFromSlugParam("00412")).toBe("00412");
  });
});
