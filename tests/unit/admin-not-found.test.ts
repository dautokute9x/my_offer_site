import { beforeEach, describe, expect, it, vi } from "vitest";

type Res = { data?: unknown; error?: { code: string; message: string } | null };
const calls: string[] = [];
let result: (ctx: string[]) => Res = () => ({ data: [], error: null });
let rpcResult: Res = { data: null, error: null };

// Builder chainable như admin-applications.test.ts: await → kết quả theo chuỗi thao tác.
function builder(table: string) {
  const ctx: string[] = [table];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "update", "delete", "insert", "eq", "neq"]) {
    b[m] = () => { calls.push(`${table}.${m}`); ctx.push(m); return b; };
  }
  b.maybeSingle = () => Promise.resolve(result([...ctx, "maybeSingle"]));
  b.then = (ok: (v: Res) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(result(ctx)).then(ok, ko);
  return b;
}
vi.mock("@/lib/auth", () => ({ requireAdmin: async () => ({ userId: "u1" }) }));
vi.mock("@/lib/data", () => ({ getCatalog: async () => ({}) }));
vi.mock("@/lib/admin/job-input", () => ({ formToRaw: () => ({ code: "A1" }), normalizeJobInput: () => ({ job: { slug: "s", code: "A1" } }) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => ({ from: builder, rpc: async () => rpcResult }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT ${u}`); } }));

const fd = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const NOT_FOUND = /Không tìm thấy bản ghi/;

beforeEach(() => {
  calls.length = 0;
  result = () => ({ data: [], error: null }); // 0 dòng bị ảnh hưởng
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("danh mục: 0 dòng → báo lỗi", () => {
  const load = () => import("@/app/admin/(protected)/danh-muc/actions");
  it("saveCatalog sửa id không tồn tại", async () => {
    const r = await (await load()).saveCatalog({}, fd({ kind: "skill", id: "999", name: "Hàn" }));
    expect(r.errors?.form).toMatch(NOT_FOUND);
    expect(calls).toContain("skills.select");
  });
  it("deleteCatalog id không tồn tại", async () => {
    result = (ctx) => (ctx.includes("delete") ? { data: [], error: null } : { data: null, error: null }); // count = 0
    const r = await (await load()).deleteCatalog({}, fd({ kind: "skill", id: "999" }));
    expect(r.errors?.form).toMatch(NOT_FOUND);
  });
  it("deleteCatalog thành công khi có dòng bị xóa", async () => {
    result = (ctx) => (ctx.includes("delete") ? { data: [{ id: 1 }], error: null } : { data: null, error: null });
    expect((await (await load()).deleteCatalog({}, fd({ kind: "skill", id: "1" }))).ok).toBe(true);
  });
});

describe("tin: 0 dòng → báo lỗi", () => {
  const load = () => import("@/app/admin/(protected)/tin/actions");
  it("saveJob: RPC báo P0002 → không tìm thấy", async () => {
    rpcResult = { data: null, error: { code: "P0002", message: "Tin không tồn tại" } };
    const r = await (await load()).saveJob({}, fd({ id: "999" }));
    expect(r.errors?.form).toMatch(NOT_FOUND);
    expect(r.values).toEqual({ code: "A1" });
  });
  it("setJobStatus: update 0 dòng → ném lỗi, không chuyển hướng", async () => {
    result = (ctx) => (ctx.includes("maybeSingle") ? { data: { slug: "s", code: "A1", published_at: null }, error: null } : { data: [], error: null });
    await expect((await load()).setJobStatus(1, "closed")).rejects.toThrow(NOT_FOUND);
  });
  it.each(["cancelInterview", "deleteInterview"] as const)("%s: 0 dòng → chuyển hướng kèm lỗi", async (fn) => {
    result = (ctx) => (ctx.includes("maybeSingle") ? { data: { slug: "s", code: "A1" }, error: null } : { data: [], error: null });
    await expect((await load())[fn](1, 5)).rejects.toThrow("REDIRECT /admin/tin/1?loi=lich-mat");
  });
  it("saveInterview: ngày sai → trả lỗi kèm giá trị đã nhập, không ghi DB", async () => {
    const r = await (await load()).saveInterview(1, {}, fd({ date: "2026-13-45", time: "10:00", format: "online", publicNote: "Zoom" }));
    expect(r.error).toBeTruthy();
    expect(r.values).toEqual({ date: "2026-13-45", time: "10:00", format: "online", publicNote: "Zoom" });
    expect(calls).not.toContain("interview_events.insert");
  });
  it("saveInterview: insert lỗi → giữ giá trị đã nhập", async () => {
    result = (ctx) => (ctx.includes("insert") ? { data: null, error: { code: "23503", message: "fk" } } : { data: { slug: "s", code: "A1" }, error: null });
    const r = await (await load()).saveInterview(1, {}, fd({ date: "2026-12-01", time: "10:00", format: "onsite", publicNote: "" }));
    expect(r.error).toBeTruthy();
    expect(r.values?.date).toBe("2026-12-01");
  });
});
