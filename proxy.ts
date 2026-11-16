import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Làm mới phiên Supabase cho /admin. Demo (không có Supabase env) thì cho qua.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) return NextResponse.next();
  if (!anon) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY (đã đặt NEXT_PUBLIC_SUPABASE_URL)");

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v)); // chặn CDN cache cookie phiên
      },
    },
  });
  await supabase.auth.getUser(); // kích hoạt làm mới token
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
