import { beforeEach, describe, expect, it, vi } from "vitest";

const ID = "11111111-1111-4111-8111-111111111111";
type Res = { data?: unknown; error?: { code: string; message: string } | null };
const calls: { op: string; args: unknown[] }[] = [];
let results: ((op: string, ctx: string[]) => Res)[] = [];
const requireAdmin = vi.fn();
const createSignedUrl = vi.fn();
const adminCreated = vi.fn();
const removeObjects = vi.fn();
let demo = false;

// Builder chainable: mọi method ghi lại và trả chính nó; await → kết quả do test cấu hình theo thao tác (select/update/delete).
function builder(table: string) {
  const ctx: string[] = [table];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "update", "delete", "insert", "eq", "neq", "gt", "lt", "or", "order", "limit", "ilike"]) {
    b[m] = (...args: unknown[]) => { calls.push({ op: `${table}.${m}`, args }); ctx.push(m); return b; };
  }
  b.maybeSingle = () => Promise.resolve(results[0]("maybeSingle", ctx));
  b.then = (ok: (v: Res) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(results[0]("await", ctx)).then(ok, ko);
  return b;
}
vi.mock("@/lib/auth", () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));
vi.mock("@/lib/data", () => ({ isDemoMode: () => demo }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => ({ from: builder }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: () => { adminCreated(); return { storage: { from: () => ({ createSignedUrl }) } }; },
}));
vi.mock("@/lib/applications/server", () => ({ removeApplicationObjects: (...a: unknown[]) => removeObjects(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT ${u}`); } }));

const fd = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const ctxParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  calls.length = 0; demo = false; results = [];
  for (const m of [requireAdmin, createSignedUrl, adminCreated, removeObjects]) m.mockReset();
  requireAdmin.mockResolvedValue({ userId: "u1", email: "a@b" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /admin/ho-so/[id]/cv", () => {
  const load = async () => (await import("@/app/admin/(protected)/ho-so/[id]/cv/route")).GET;
  const app = (o: object) => { results = [() => ({ data: { ref_code: "HS-ABCDEF", status: "new", cv_path: "cvs/2026/11/x/a.pdf", ...o }, error: null })]; };

  it("requireAdmin lỗi → không tạo service client", async () => {
    requireAdmin.mockRejectedValue(new Error("REDIRECT"));
    await expect((await load())(new Request("http://x"), ctxParams(ID))).rejects.toThrow("REDIRECT");
    expect(adminCreated).not.toHaveBeenCalled();
  });
  it("demo → 404, không gọi requireAdmin", async () => {
    demo = true;
    const r = await (await load())(new Request("http://x"), ctxParams(ID));
    expect(r.status).toBe(404);
    expect(requireAdmin).not.toHaveBeenCalled();
  });
  it.each([
    ["id sai", "abc", {}], ["không có cv_path", ID, { cv_path: null }], ["pending_upload", ID, { status: "pending_upload" }],
  ])("%s → 404 no-store", async (_n, id, o) => {
    app(o);
    const r = await (await load())(new Request("http://x"), ctxParams(id));
    expect(r.status).toBe(404);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(adminCreated).not.toHaveBeenCalled();
  });
  it("thành công → 302 tới signed URL 60 giây", async () => {
    app({});
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://s.test/signed?t=1" }, error: null });
    const r = await (await load())(new Request("http://x"), ctxParams(ID));
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://s.test/signed?t=1");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(createSignedUrl).toHaveBeenCalledWith("cvs/2026/11/x/a.pdf", 60, { download: "HS-ABCDEF.pdf" });
  });
});

describe("actions", () => {
  const load = () => import("@/app/admin/(protected)/ho-so/actions");

  it("changeStatus từ chối pending_upload, không chạm DB", async () => {
    const r = await (await load()).changeStatus({}, fd({ id: ID, status: "pending_upload" }));
    expect(r.error).toBeTruthy();
    expect(calls).toEqual([]);
  });
  it("changeStatus chỉ cập nhật hàng chưa pending_upload", async () => {
    results = [() => ({ data: [{ id: ID }], error: null })];
    const r = await (await load()).changeStatus({}, fd({ id: ID, status: "hired" }));
    expect(r.ok).toBeTruthy();
    expect(calls.find((c) => c.op === "applications.neq")?.args).toEqual(["status", "pending_upload"]);
  });

  it("delete: xác nhận sai → không đụng storage", async () => {
    results = [() => ({ data: { ref_code: "HS-ABCDEF" }, error: null })];
    const r = await (await load()).deleteApplication({}, fd({ id: ID, confirm: "HS-ZZZZZZ" }));
    expect(r.error).toBeTruthy();
    expect(removeObjects).not.toHaveBeenCalled();
    expect(calls.some((c) => c.op === "applications.delete")).toBe(false);
  });
  it("delete: storage lỗi → không xóa dòng", async () => {
    results = [() => ({ data: { ref_code: "HS-ABCDEF" }, error: null })];
    removeObjects.mockResolvedValue({ error: "server_error" });
    const r = await (await load()).deleteApplication({}, fd({ id: ID, confirm: "hs-abcdef" }));
    expect(r.error).toBeTruthy();
    expect(calls.some((c) => c.op === "applications.delete")).toBe(false);
  });
  it("delete: thành công → xóa CV rồi xóa dòng, chuyển hướng", async () => {
    results = [(op, ctx) => (ctx.includes("delete") ? { data: [{ id: ID }], error: null } : { data: { ref_code: "HS-ABCDEF" }, error: null })];
    removeObjects.mockResolvedValue({ ok: true });
    await expect((await load()).deleteApplication({}, fd({ id: ID, confirm: "HS-ABCDEF" }))).rejects.toThrow("REDIRECT /admin/ho-so");
    expect(calls.some((c) => c.op === "applications.delete")).toBe(true);
  });

  it("purge: bộ lọc JST + 24h, bước xóa lặp lại điều kiện, tiến qua id lỗi rồi dừng", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-16T16:00:00Z")); // = 2026-11-17 01:00 JST
    const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b";
    let listed = 0;
    results = [(op, ctx) => {
      if (ctx.includes("delete")) return { data: [{ id: "x" }], error: null };
      if (ctx.includes("gt") || !ctx.includes("order")) return ctx.includes("order") ? { data: [], error: null } : { data: [{ id: "x" }], error: null }; // precheck còn đủ điều kiện
      return { data: listed++ === 0 ? [{ id: A }, { id: B }] : [], error: null };
    }];
    removeObjects.mockImplementation(async (id: string) => (id === A ? { error: "server_error" } : { ok: true }));
    const r = await (await load()).purgeExpired();
    vi.useRealTimers();
    const filters = calls.filter((c) => c.op === "applications.or").map((c) => String(c.args[0]));
    expect(filters[0]).toBe("delete_after.lt.2026-11-17,and(status.eq.pending_upload,created_at.lt.2026-11-15T16:00:00.000Z)");
    expect(filters.every((f) => f === filters[0])).toBe(true);
    expect(filters.length).toBeGreaterThan(3); // list + precheck/delete cho từng id
    expect(removeObjects.mock.calls.map((c) => c[0])).toEqual([A, B]);
    expect(calls.filter((c) => c.op === "applications.delete")).toHaveLength(1); // chỉ B; A lỗi storage → không xóa dòng
    expect(r.error).toMatch(/1 hồ sơ lỗi/);
  });

  it("purge: hồ sơ không còn đủ điều kiện → giữ nguyên CV", async () => {
    let listed = 0;
    results = [(op, ctx) => {
      if (ctx.includes("order")) return { data: listed++ === 0 ? [{ id: ID }] : [], error: null };
      return { data: [], error: null }; // precheck rỗng
    }];
    const r = await (await load()).purgeExpired();
    expect(removeObjects).not.toHaveBeenCalled();
    expect(r.ok).toMatch(/0 hồ sơ/);
  });
});
