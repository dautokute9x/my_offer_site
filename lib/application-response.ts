// Chỉ coi là thành công khi máy chủ trả { ok: true, refCode: chuỗi không rỗng }.
export function isSuccess(httpOk: boolean, data: unknown): data is { ok: true; refCode: string } {
  const d = data as { ok?: unknown; refCode?: unknown } | null;
  return httpOk && d?.ok === true && typeof d.refCode === "string" && d.refCode.trim() !== "";
}
