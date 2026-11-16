import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/data";
import { validateApplication, type ApplicationInput } from "@/lib/validate";

const bad = (body: object, status = 400) => NextResponse.json({ ok: false, ...body }, { status });
const s = (v: unknown) => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  let file: ApplicationInput["file"] = null;
  try {
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      raw = await request.json();
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("shape");
      const f = raw.file as Record<string, unknown> | null | undefined;
      if (f && typeof f === "object") file = { name: s(f.name), size: Number(f.size), type: s(f.type) };
    } else {
      const fd = await request.formData();
      raw = Object.fromEntries(fd.entries());
      const cv = fd.get("cv");
      if (cv instanceof File && (cv.size > 0 || cv.name)) file = { name: cv.name, size: cv.size, type: cv.type };
    }
  } catch {
    return bad({ message: "Dữ liệu gửi lên không hợp lệ." });
  }
  const input: ApplicationInput = {
    kind: s(raw.kind) as ApplicationInput["kind"],
    jobCode: s(raw.jobCode) || null,
    fullName: s(raw.fullName),
    email: s(raw.email),
    phone: s(raw.phone),
    facebook: s(raw.facebook),
    jpLevel: s(raw.jpLevel) as ApplicationInput["jpLevel"],
    note: s(raw.note),
    consent: raw.consent === true || raw.consent === "true" || raw.consent === "on",
    idempotencyKey: s(raw.idempotencyKey),
    file,
  };
  const errors = validateApplication(input);
  if (Object.keys(errors).length) return bad({ errors });
  if (isDemoMode())
    return bad({ demo: true, message: "Website đang ở chế độ minh họa — hồ sơ CHƯA được gửi. Vui lòng liên hệ qua Zalo/Facebook." }, 503);
  // Giai đoạn 2 thay bằng luồng Supabase; không bao giờ trả 200 trước đó.
  return bad({ message: "Chức năng lưu hồ sơ chưa được kết nối." }, 501);
}
