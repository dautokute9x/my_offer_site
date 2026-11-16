import { describe, expect, it } from "vitest";
import { isSuccess } from "@/lib/application-response";

describe("isSuccess", () => {
  it("accepts ok + string refCode", () => expect(isSuccess(true, { ok: true, refCode: "HS-1" })).toBe(true));
  it.each([{}, 1, "", "  ", undefined])("rejects refCode %j", (refCode) => expect(isSuccess(true, { ok: true, refCode })).toBe(false));
  it("rejects ok:false, http failure, null", () => {
    expect(isSuccess(true, { ok: false, refCode: "HS-1" })).toBe(false);
    expect(isSuccess(false, { ok: true, refCode: "HS-1" })).toBe(false);
    expect(isSuccess(true, null)).toBe(false);
  });
});
