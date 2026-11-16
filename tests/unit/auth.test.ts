import { beforeEach, describe, expect, it, vi } from "vitest";

let user: { id: string; email: string } | null;
let isAdmin: boolean;
let rpcError: { code: string; message: string } | null = null;
const signOut = vi.fn(async () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: { getUser: async () => ({ data: { user } }), signOut },
    rpc: async () => (rpcError ? { data: null, error: rpcError } : { data: isAdmin, error: null }),
  }),
}));
vi.mock("@/lib/data", () => ({ isDemoMode: () => false }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(f: T) => f }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));
import { requireAdmin, safeNext } from "@/lib/auth";

beforeEach(() => { user = null; isAdmin = false; rpcError = null; signOut.mockClear(); });

describe("requireAdmin", () => {
  it("không phiên → redirect login kèm next", async () => {
    await expect(requireAdmin("/admin/ho-so")).rejects.toThrow("REDIRECT:/admin/login?next=%2Fadmin%2Fho-so");
  });
  it("không phải admin → signOut rồi redirect error=forbidden", async () => {
    user = { id: "u1", email: "a@b.c" };
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login?error=forbidden");
    expect(signOut).toHaveBeenCalled();
  });
  it("lỗi RPC is_admin → throw, không signOut", async () => {
    user = { id: "u1", email: "a@b.c" };
    rpcError = { code: "500", message: "boom" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(requireAdmin()).rejects.toThrow("Không kiểm tra được quyền quản trị");
    expect(signOut).not.toHaveBeenCalled();
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
    ["/admin@evil.com", "/admin"], ["/\\evil.com", "/admin"], ["/admin/..//evil.com", "/admin"], ["/admin/../..", "/admin"],
    ["/admin%2F%2Fevil", "/admin"], ["/admin\r\nx", "/admin"], [undefined, "/admin"],
    ["/admin\\evil", "/admin/evil"], ["/admin//x", "/admin//x"], ["/admin/ho-so", "/admin/ho-so"], ["/admin", "/admin"], ["/admin/ho-so?x=1", "/admin/ho-so?x=1"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});
