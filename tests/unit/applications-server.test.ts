import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteDefaults } from "@/lib/site-defaults";
import type { ApplicationInput } from "@/lib/validate";

// Giả lập Supabase admin: 1 dòng applications + 1 object Storage.
type Row = { id: string; ref_code: string; status: string; cv_path: string | null; idempotency_key: string; cv_size?: number };
let row: Row | null;
let object: { size: number; bytes: Uint8Array } | null;
let onDownload = () => {};
let dirFiles: string[] = [];
const listed: string[] = [];
const rpc = vi.fn();
const remove = vi.fn(async (paths: string[]) => ({ data: paths, error: null }));
const createSignedUploadUrl = vi.fn(async (path: string) => ({ data: { path, token: "tok", signedUrl: `https://x/upload/${path}?token=tok` }, error: null }));
const fake = {
  rpc,
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row && { ...row, created_at: "2026-10-31T23:30:00+00:00" }, error: null }) }) }),
    update: (patch: Partial<Row>) => {
      const conds: [string, unknown][] = [];
      const q = {
        eq: (c: string, v: unknown) => (conds.push([c, v]), q),
        select: async () => {
          const hit = row && conds.every(([c, v]) => (row as Record<string, unknown>)[c] === v);
          if (hit) Object.assign(row!, patch);
          return { data: hit ? [{ ref_code: row!.ref_code }] : [], error: null };
        },
      };
      return q;
    },
  }),
  storage: {
    from: () => ({
      createSignedUploadUrl,
      remove: async (paths: string[]) => { if (row?.cv_path && paths.includes(row.cv_path)) object = null; return remove(paths); },
      list: async (dir: string, opts?: { search?: string; limit?: number; offset?: number }) => {
        listed.push(dir);
        if (!opts?.search) {
          const from = opts?.offset ?? 0;
          return { data: dirFiles.slice(from, from + (opts?.limit ?? 100)).map((name) => ({ name })), error: null };
        }
        return { data: object && row?.cv_path?.endsWith(opts.search) ? [{ name: opts.search, metadata: { size: object.size } }] : [], error: null };
      },
      download: async () => (onDownload(), object ? { data: new Blob([object.bytes as BlobPart]), error: null } : { data: null, error: { message: "not found" } }),
    }),
  },
};
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: () => fake }));
import { clientIp, completeApplication, removeApplicationObjects, startApplication } from "@/lib/applications/server";
import { POST as startPOST } from "@/app/api/applications/start/route";

const ID = "11111111-1111-4111-8111-111111111111";
const PATH = `cvs/2026/11/${ID}/abc.pdf`;
const pdf = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
const input: ApplicationInput = {
  kind: "apply", jobCode: "00412", fullName: "A", email: "", phone: "0901234567", facebook: "", jpLevel: "", note: "",
  consent: true, idempotencyKey: "k-1", consentVersion: "v1", file: { name: "cv.pdf", size: 15, type: "application/pdf" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.IP_HASH_SALT = "salt";
  row = { id: ID, ref_code: "HS-ABCDEF", status: "pending_upload", cv_path: PATH, idempotency_key: "k-1" };
  object = { size: pdf.length, bytes: pdf };
  onDownload = () => {};
  dirFiles = [];
  listed.length = 0;
});

describe("completeApplication", () => {
  it("magic bytes MZ → invalid_file, xóa object, vẫn pending_upload", async () => {
    object = { size: 2, bytes: new Uint8Array([0x4d, 0x5a]) };
    expect(await completeApplication(ID, "k-1")).toEqual({ error: "invalid_file" });
    expect(remove).toHaveBeenCalledWith([PATH]);
    expect(row!.status).toBe("pending_upload");
  });
  it("kích thước thật 15 MB → invalid_file", async () => {
    object = { size: 15 * 1024 * 1024, bytes: pdf };
    expect(await completeApplication(ID, "k-1")).toEqual({ error: "invalid_file" });
    expect(remove).toHaveBeenCalled();
    expect(row!.status).toBe("pending_upload");
  });
  it("chưa có object → invalid_file", async () => {
    object = null;
    expect(await completeApplication(ID, "k-1")).toEqual({ error: "invalid_file" });
    expect(row!.status).toBe("pending_upload");
  });
  it("docx không có [Content_Types].xml → invalid_file", async () => {
    row!.cv_path = PATH.replace(".pdf", ".docx");
    object = { size: 4, bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) };
    expect(await completeApplication(ID, "k-1")).toEqual({ error: "invalid_file" });
  });
  it("PDF hợp lệ → refCode, status new; gọi lần hai → cùng refCode", async () => {
    expect(await completeApplication(ID, "k-1")).toEqual({ refCode: "HS-ABCDEF" });
    expect(row).toMatchObject({ status: "new", cv_size: pdf.length });
    expect(await completeApplication(ID, "k-1")).toEqual({ refCode: "HS-ABCDEF" });
    expect(remove).not.toHaveBeenCalled();
  });
  it("complete song song đã xác nhận (new) → không xóa object, trả refCode", async () => {
    object = { size: 2, bytes: new Uint8Array([0x4d, 0x5a]) };
    onDownload = () => { row!.status = "new"; };
    expect(await completeApplication(ID, "k-1")).toEqual({ refCode: "HS-ABCDEF" });
    expect(remove).not.toHaveBeenCalled();
  });
  it("gửi lại song song đổi cv_path trong lúc kiểm tra → stale, không đánh dấu new, không xóa", async () => {
    onDownload = () => { row!.cv_path = `cvs/2026/11/${ID}/moi.pdf`; };
    expect(await completeApplication(ID, "k-1")).toEqual({ error: "stale" });
    expect(row!.status).toBe("pending_upload");
    expect(remove).not.toHaveBeenCalled();
  });
  it("complete song song khác đã new trước khi update → trả refCode", async () => {
    onDownload = () => { row!.status = "new"; };
    expect(await completeApplication(ID, "k-1")).toEqual({ refCode: "HS-ABCDEF" });
  });
  it("thành công → dọn object anh em trong thư mục <id>/, giữ object đã xác nhận", async () => {
    dirFiles = ["abc.pdf", "cu.docx", "cu2.pdf"];
    expect(await completeApplication(ID, "k-1")).toEqual({ refCode: "HS-ABCDEF" });
    expect(remove).toHaveBeenCalledWith([`cvs/2026/11/${ID}/cu.docx`, `cvs/2026/11/${ID}/cu2.pdf`]);
    expect(object).not.toBeNull();
  });
  it("dọn object lỗi → vẫn thành công", async () => {
    dirFiles = ["abc.pdf", "cu.docx"];
    remove.mockResolvedValueOnce({ data: null, error: { message: "boom" } } as never);
    expect(await completeApplication(ID, "k-1")).toEqual({ refCode: "HS-ABCDEF" });
  });
  it("sai idempotencyKey → not_found", async () => {
    expect(await completeApplication(ID, "khac")).toEqual({ error: "not_found" });
  });
});

describe("startApplication", () => {
  it("gửi ip_hash (không gửi IP), trả upload URL", async () => {
    rpc.mockResolvedValue({ data: { id: ID, refCode: "HS-ABCDEF", status: "pending_upload", cvPath: PATH, created: true }, error: null });
    const r = await startApplication(input, "1.2.3.4");
    const p = rpc.mock.calls[0][1].p;
    expect(rpc.mock.calls[0][0]).toBe("start_application");
    expect(p.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(p)).not.toContain("1.2.3.4");
    expect(p).toMatchObject({ cvExt: "pdf", cvMime: "application/pdf", consentVersion: siteDefaults.consentVersion });
    expect(r).toEqual({ id: ID, refCode: "HS-ABCDEF", upload: { path: PATH, token: "tok", signedUrl: `https://x/upload/${PATH}?token=tok` } });
    expect(remove).not.toHaveBeenCalled();
  });
  it("gửi lại hồ sơ đang pending_upload → xóa object cũ của thư mục TRƯỚC khi cấp URL mới (không upsert)", async () => {
    dirFiles = ["old1.pdf", "old2.pdf"];
    rpc.mockResolvedValue({ data: { id: ID, refCode: "HS-ABCDEF", status: "pending_upload", cvPath: PATH, created: false, createdAt: "2026-11-02T00:00:00.000Z" }, error: null });
    const r = await startApplication(input, "1.2.3.4");
    expect(remove).toHaveBeenCalledWith([`cvs/2026/11/${ID}/old1.pdf`, `cvs/2026/11/${ID}/old2.pdf`]);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(createSignedUploadUrl.mock.invocationCallOrder[0]);
    expect(createSignedUploadUrl).toHaveBeenCalledWith(PATH);
    expect(r).toMatchObject({ upload: { path: PATH } });
  });
  it("gửi lại pending_upload mà dọn Storage lỗi → server_error, không cấp URL", async () => {
    dirFiles = ["old1.pdf"];
    remove.mockResolvedValueOnce({ data: null, error: { message: "boom" } } as never);
    rpc.mockResolvedValue({ data: { id: ID, refCode: "HS-ABCDEF", status: "pending_upload", cvPath: PATH, created: false, createdAt: "2026-11-02T00:00:00.000Z" }, error: null });
    expect(await startApplication(input, "1.2.3.4")).toEqual({ error: "server_error" });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
  it("hồ sơ đã new → refCode, không upload", async () => {
    rpc.mockResolvedValue({ data: { id: ID, refCode: "HS-ABCDEF", status: "new", cvPath: PATH, created: false }, error: null });
    expect(await startApplication(input, "1.2.3.4")).toEqual({ id: ID, refCode: "HS-ABCDEF" });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
  it("lỗi từ SQL / RPC", async () => {
    rpc.mockResolvedValue({ data: { error: "rate_limited" }, error: null });
    expect(await startApplication(input, "1.2.3.4")).toEqual({ error: "rate_limited" });
    rpc.mockResolvedValue({ data: { error: "la" }, error: null });
    expect(await startApplication(input, "1.2.3.4")).toEqual({ error: "server_error" });
    rpc.mockResolvedValue({ data: null, error: { code: "X", message: "boom" } });
    expect(await startApplication(input, "1.2.3.4")).toEqual({ error: "server_error" });
  });
  it("thiếu IP_HASH_SALT → lỗi cấu hình", async () => {
    delete process.env.IP_HASH_SALT;
    await expect(startApplication(input, "1.2.3.4")).rejects.toThrow("IP_HASH_SALT");
  });
  it("clientIp", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1", "x-real-ip": "8.8.8.8" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("removeApplicationObjects", () => {
  it("liệt kê và xóa mọi object dưới thư mục <id>/ (theo tháng UTC của created_at)", async () => {
    dirFiles = ["a.pdf", "b.docx"];
    expect(await removeApplicationObjects(ID)).toEqual({ ok: true });
    expect(listed).toEqual([`cvs/2026/10/${ID}`]);
    expect(remove).toHaveBeenCalledWith([`cvs/2026/10/${ID}/a.pdf`, `cvs/2026/10/${ID}/b.docx`]);
  });
  it("phân trang: >100 object đều bị xóa", async () => {
    dirFiles = Array.from({ length: 150 }, (_, i) => `f${i}.pdf`);
    expect(await removeApplicationObjects(ID)).toEqual({ ok: true });
    expect(listed).toEqual([`cvs/2026/10/${ID}`, `cvs/2026/10/${ID}`]);
    expect(remove.mock.calls.flatMap((c) => c[0])).toHaveLength(150);
  });
  it("thư mục rỗng → không gọi remove", async () => {
    expect(await removeApplicationObjects(ID)).toEqual({ ok: true });
    expect(remove).not.toHaveBeenCalled();
  });
  it("không có hồ sơ → not_found", async () => {
    row = null;
    expect(await removeApplicationObjects(ID)).toEqual({ error: "not_found" });
  });
});

describe("route start", () => {
  const post = (body: string, type = "application/json") =>
    startPOST(new Request("http://x/api/applications/start", { method: "POST", body, headers: { "content-type": type } }));
  it("JSON quá 64 KB → 413", async () => expect((await post(JSON.stringify({ note: "x".repeat(70 * 1024) }))).status).toBe(413));
  it("multipart quá 64 KB → 413", async () => expect((await post("x".repeat(70 * 1024), "multipart/form-data; boundary=b")).status).toBe(413));
  it("tư vấn: jobCode không hợp lệ bị bỏ (null)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://sb";
    rpc.mockResolvedValue({ data: { id: ID, refCode: "HS-ABCDEF", status: "new", cvPath: null, created: true }, error: null });
    const res = await post(JSON.stringify({ ...input, kind: "consult", jobCode: "a-b", file: null, consent: true }));
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(await res.json()).toEqual({ ok: true, refCode: "HS-ABCDEF" });
    expect(rpc.mock.calls[0][1].p.jobCode).toBeNull();
  });
  it("JSON hỏng → 400", async () => expect((await post("{hong")).status).toBe(400));
});
