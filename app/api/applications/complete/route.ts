import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/data";
import { completeApplication, errorResponse } from "@/lib/applications/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = () => NextResponse.json({ ok: false, message: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 1024) return bad();
  const body = await request.json().catch(() => null);
  const id = body?.id, key = body?.idempotencyKey;
  if (typeof id !== "string" || !UUID.test(id) || typeof key !== "string" || !key || key.length > 100) return bad();
  if (isDemoMode()) return NextResponse.json({ ok: false, demo: true, message: "Website đang ở chế độ minh họa — hồ sơ CHƯA được gửi." }, { status: 503 });
  const r = await completeApplication(id, key).catch((e: Error) => {
    console.error("[applications] complete", e.message);
    return { error: "server_error" as const };
  });
  return "error" in r ? errorResponse(r.error) : NextResponse.json({ ok: true, refCode: r.refCode });
}
