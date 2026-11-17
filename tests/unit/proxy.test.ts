import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

let user: { id: string } | null = null;
const created = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => { created(); return { auth: { getUser: async () => ({ data: { user } }) } }; },
}));

const { proxy } = await import("@/proxy");
const run = (path: string) => proxy(new NextRequest(new URL(path, "http://x.test")));

beforeEach(() => {
  user = null; created.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});
afterEach(() => vi.unstubAllEnvs());

describe("proxy /admin", () => {
  it("chưa đăng nhập → /admin/login?next=<đường dẫn + query>", async () => {
    const r = await run("/admin/tin/5?xem=truoc");
    expect(r.status).toBe(307);
    const to = new URL(r.headers.get("location")!);
    expect(to.pathname).toBe("/admin/login");
    expect(to.searchParams.get("next")).toBe("/admin/tin/5?xem=truoc");
  });
  it.each(["/admin/login", "/admin/logout", "/admin/login/"])("%s không bị chuyển hướng", async (p) => {
    const r = await run(p);
    expect(r.headers.get("location")).toBeNull();
  });
  it("đã đăng nhập → cho qua", async () => {
    user = { id: "u1" };
    expect((await run("/admin")).headers.get("location")).toBeNull();
  });
  it("demo (không có NEXT_PUBLIC_SUPABASE_URL) → bỏ qua, không tạo client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const r = await run("/admin/tin");
    expect(r.headers.get("location")).toBeNull();
    expect(created).not.toHaveBeenCalled();
  });
});

describe("proxy ngôn ngữ", () => {
  it("URL tiếng Việt không tiền tố → rewrite nội bộ sang /vi", async () => {
    const r = await run("/viec-lam?q=00412");
    expect(r.headers.get("location")).toBeNull();
    expect(new URL(r.headers.get("x-middleware-rewrite")!).pathname).toBe("/vi/viec-lam");
    expect(new URL(r.headers.get("x-middleware-rewrite")!).search).toBe("?q=00412");
  });
  it("/ → /vi", async () => {
    expect(new URL((await run("/")).headers.get("x-middleware-rewrite")!).pathname).toBe("/vi");
  });
  it.each([["/vi/viec-lam", "/viec-lam"], ["/vi", "/"]])("%s → 308 về %s (không trùng URL)", async (from, to) => {
    const r = await run(from);
    expect(r.status).toBe(308);
    expect(new URL(r.headers.get("location")!).pathname).toBe(to);
  });
  it.each(["/en/viec-lam", "/ja", "/fil/lien-he", "/hi", "/zh/lich-phong-van"])("%s đi thẳng, không rewrite", async (p) => {
    const r = await run(p);
    expect(r.headers.get("location")).toBeNull();
    expect(r.headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("/admin không bị thêm tiền tố ngôn ngữ", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await run("/admin")).headers.get("x-middleware-rewrite")).toBeNull();
  });
});
