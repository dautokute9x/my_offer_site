import { beforeEach, describe, expect, it, vi } from "vitest";

let user: { id: string; email: string } | null;
let isAdmin: boolean;
const signOut = vi.fn(async () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: { getUser: async () => ({ data: { user } }), signOut },
    rpc: async () => ({ data: isAdmin, error: null }),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));
import { requireAdmin, safeNext } from "@/lib/auth";

beforeEach(() => { user = null; isAdmin = false; signOut.mockClear(); });

describe("requireAdmin", () => {
  it("không phiên → redirect login kèm next", async () => {
    await expect(requireAdmin("/admin/ho-so")).rejects.toThrow("REDIRECT:/admin/login?next=%2Fadmin%2Fho-so");
  });
  it("không phải admin → signOut rồi redirect error=forbidden", async () => {
    user = { id: "u1", email: "a@b.c" };
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login?error=forbidden");
    expect(signOut).toHaveBeenCalled();
  });
  it("admin → trả user", async () => {
    user = { id: "u1", email: "a@b.c" };
    isAdmin = true;
    expect(await requireAdmin()).toEqual({ userId: "u1", email: "a@b.c" });
  });
});

describe("safeNext", () => {
  it.each([
    ["//evil.com", "/admin"], ["https://evil.com", "/admin"], ["/adminx", "/admin"], ["/admin//x", "/admin"],
    [undefined, "/admin"], ["/admin/ho-so", "/admin/ho-so"], ["/admin", "/admin"], ["/admin?a=1", "/admin?a=1"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});
