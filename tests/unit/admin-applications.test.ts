import { beforeEach, describe, expect, it, vi } from "vitest";

const ID = "11111111-1111-4111-8111-111111111111";
type Res = { data?: unknown; error?: { code: string; message: string } | null };
const calls: { op: string; args: unknown[] }[] = [];
let results: ((op: string, ctx: string[]) => Res)[] = [];
const requireAdmin = vi.fn();
const createSignedUrl = vi.fn();
const adminCreated = vi.fn();
const removeObjects = vi.fn();
const removeAt = vi.fn();
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
vi.mock("@/lib/applications/server", () => ({ removeApplicationObjects: (...a: unknown[]) => removeObjects(...a), removeObjectsAt: (...a: unknown[]) => removeAt(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT ${u}`); } }));

const fd = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const ctxParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  calls.length = 0; demo = false; results = [];
  for (const m of [requireAdmin, createSignedUrl, adminCreated, removeObjects, removeAt]) m.mockReset();
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

  const purge = async (rows: { id: string; created_at: string }[][], deleteRows: (id: string) => unknown[]) => {
    let listed = 0;
    results = [(op, ctx) => {
      if (ctx.includes("delete")) return { data: deleteRows(ctx.join(",")), error: null };
      return { data: listed++ === 0 ? rows[0] : [], error: null };
    }];
    return (await load()).purgeExpired();
  };
  const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b";
  const T = "2026-11-01T00:00:00Z";

  it("purge: bộ lọc JST + 24h giống nhau ở truy vấn và bước xóa; xóa dòng trước, rồi CV theo created_at", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-16T16:00:00Z")); // = 2026-11-17 01:00 JST
    removeAt.mockImplementation(async (id: string) => (id === A ? { error: "server_error" } : { ok: true }));
    let n = 0;
    const r = await purge([[{ id: A, created_at: T }, { id: B, created_at: T }]], () => [{ id: n++ === 0 ? A : B, created_at: T }]);
    vi.useRealTimers();
    const filters = calls.filter((c) => c.op === "applications.or").map((c) => String(c.args[0]));
    expect(filters[0]).toBe("delete_after.lt.2026-11-17,and(status.eq.pending_upload,created_at.lt.2026-11-15T16:00:00.000Z)");
    expect(filters.every((f) => f === filters[0])).toBe(true);
    expect(removeObjects).not.toHaveBeenCalled(); // không có bước xóa storage trước khi xóa dòng
    expect(removeAt.mock.calls).toEqual([[A, T], [B, T]]);
    expect(r.error).toMatch(/Đã xóa 1 hồ sơ, 1 hồ sơ lỗi/); // A: storage lỗi → failed; B: deleted
  });
  it("purge: xóa dòng không trả hàng → không đụng storage", async () => {
    const r = await purge([[{ id: A, created_at: T }]], () => []);
    expect(removeAt).not.toHaveBeenCalled();
    expect(r.ok).toMatch(/0 hồ sơ/);
  });
  it("purge: tối đa 200 dòng mỗi lần bấm → more + nhắc bấm lại", async () => {
    removeAt.mockResolvedValue({ ok: true });
    let next = 0;
    const uuid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    results = [(op, ctx) => ctx.includes("delete") ? { data: [{ id: uuid(next), created_at: T }], error: null }
      : { data: Array.from({ length: 50 }, () => ({ id: uuid(++next) })), error: null }];
    const r = await (await load()).purgeExpired();
    expect(removeAt).toHaveBeenCalledTimes(200);
    expect(r).toMatchObject({ deleted: 200, failed: 0, more: true });
    expect(r.ok).toMatch(/Còn hồ sơ cần dọn — bấm lại để tiếp tục\./);
  });
  it("purge: quá ~20 giây → dừng, more", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-16T00:00:00Z"));
    removeAt.mockImplementation(async () => { vi.setSystemTime(Date.now() + 6_000); return { ok: true }; });
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, created_at: T }));
    let k = 0;
    const r = await purge([rows], () => [rows[k++]]);
    vi.useRealTimers();
    expect(removeAt.mock.calls.length).toBeLessThan(10);
    expect(r).toMatchObject({ more: true });
  });
  it("purge: dòng xóa + storage ok → tính deleted", async () => {
    removeAt.mockResolvedValue({ ok: true });
    const r = await purge([[{ id: A, created_at: T }]], () => [{ id: A, created_at: T }]);
    expect(r.ok).toMatch(/Đã xóa 1 hồ sơ/);
    expect(r).toMatchObject({ deleted: 1, failed: 0 });
    expect(r.more).toBeUndefined();
  });
});
