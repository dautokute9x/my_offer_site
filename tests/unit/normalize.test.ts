import { describe, expect, it } from "vitest";
import { normCode, normText } from "@/lib/normalize";

describe("normalize", () => {
  it("normText", () => {
    expect(normText("  Kỹ   Sư ĐIỆN ")).toBe("ky su dien");
    expect(normText("ＡｕｔｏＣＡＤ")).toBe("autocad");
    expect(normText("東京都")).toBe("東京都");
  });
  it("normCode", () => {
    expect(normCode("＃００４１２ ")).toBe("00412");
    expect(normCode("#00412")).toBe("00412");
  });
});
