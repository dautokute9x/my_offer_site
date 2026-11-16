import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/data";
import { clientIp, errorResponse, startApplication } from "@/lib/applications/server";
import { validateApplication, type ApplicationInput } from "@/lib/validate";

const MAX_BODY = 64 * 1024; // CV đi thẳng lên Storage, thân request chỉ là JSON nhỏ.
const bad = (body: object, status = 400) => NextResponse.json({ ok: false, ...body }, { status });
const s = (v: unknown) => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  const tooBig = bad({ message: "Dữ liệu gửi lên quá lớn." }, 413);
  if (Number(request.headers.get("content-length")) > MAX_BODY) return tooBig;
  // shortcut: đọc hết thân rồi mới đo khi thiếu content-length; đổi sang đọc stream có giới hạn nếu bị lạm dụng.
  const buf = await request.arrayBuffer().catch(() => null);
  if (buf && buf.byteLength > MAX_BODY) return tooBig;
  let raw: Record<string, unknown>;
  let file: ApplicationInput["file"] = null;
  try {
    const type = request.headers.get("content-type") ?? "";
    if (!buf) throw new Error("body");
    if (type.includes("application/json")) {
      raw = JSON.parse(new TextDecoder().decode(buf));
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("shape");
      const f = raw.file as Record<string, unknown> | null | undefined;
      if (f && typeof f === "object") file = { name: s(f.name), size: Number(f.size), type: s(f.type) };
    } else {
      const fd = await new Response(buf, { headers: { "content-type": type } }).formData();
      raw = Object.fromEntries(fd.entries());
      const cv = fd.get("cv");
      if (cv instanceof File && (cv.size > 0 || cv.name)) file = { name: cv.name, size: cv.size, type: cv.type };
    }
  } catch {
    return bad({ message: "Dữ liệu gửi lên không hợp lệ." });
  }
  const input: ApplicationInput = {
    kind: s(raw.kind) as ApplicationInput["kind"],
    // Tư vấn không bắt buộc mã tin: mã sai định dạng thì bỏ, không báo lỗi.
    jobCode: s(raw.kind) === "apply" || /^[A-Za-z0-9]{1,20}$/.test(s(raw.jobCode)) ? s(raw.jobCode) || null : null,
    fullName: s(raw.fullName),
    email: s(raw.email),
    phone: s(raw.phone),
    facebook: s(raw.facebook),
    jpLevel: s(raw.jpLevel) as ApplicationInput["jpLevel"],
    note: s(raw.note),
    consent: raw.consent === true || raw.consent === "true" || raw.consent === "on",
    idempotencyKey: s(raw.idempotencyKey),
    consentVersion: s(raw.consentVersion),
    file,
  };
  const errors = validateApplication(input);
  if (Object.keys(errors).length) return bad({ errors });
  if (isDemoMode())
    return bad({ demo: true, message: "Website đang ở chế độ minh họa — hồ sơ CHƯA được gửi. Vui lòng liên hệ qua Zalo/Facebook." }, 503);
  const r = await startApplication(input, clientIp(request.headers)).catch((e: Error) => {
    console.error("[applications] start", e.message);
    return { error: "server_error" as const };
  });
  if ("error" in r) return errorResponse(r.error);
  // Còn CV phải tải: KHÔNG trả ok/refCode — thành công chỉ sau bước complete.
  if (r.upload) return NextResponse.json({ id: r.id, upload: r.upload });
  return NextResponse.json({ ok: true, refCode: r.refCode });
}
