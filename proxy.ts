import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, hasLocale } from "@/lib/i18n/config";

// Ngôn ngữ: tiếng Việt không có tiền tố (/viec-lam được rewrite nội bộ sang /vi/viec-lam), /vi/... chuyển về bản không tiền tố;
// /en, /zh, /ja, /fil, /hi đi thẳng vào app/[lang]. /admin giữ nguyên và làm mới phiên Supabase như trước.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return adminProxy(request);
  const seg = path.split("/")[1];
  if (seg === DEFAULT_LOCALE) {
    const to = request.nextUrl.clone();
    to.pathname = path.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(to, 308);
  }
  if (hasLocale(seg)) return NextResponse.next();
  const to = request.nextUrl.clone();
  to.pathname = `/${DEFAULT_LOCALE}${path === "/" ? "" : path}`;
  return NextResponse.rewrite(to);
}

// Làm mới phiên Supabase cho /admin. Demo (không có Supabase env) thì cho qua.
async function adminProxy(request: NextRequest) {
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
  const { data: { user } } = await supabase.auth.getUser(); // kích hoạt làm mới token
  const { pathname, search } = request.nextUrl;
  if (!user && !/^\/admin\/(login|logout)\/?$/.test(pathname)) {
    const to = new URL("/admin/login", request.url);
    to.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response.headers.forEach((v, k) => { if (k.startsWith("cache-control") || k === "expires" || k === "pragma") redirect.headers.set(k, v); });
    return redirect;
  }
  return response;
}

// Bỏ qua API, tài nguyên tĩnh và tệp có phần mở rộng (ảnh, CSV mẫu, sitemap.xml, robots.txt...).
export const config = { matcher: ["/((?!api/|_next/|.*\\..*).*)"] };
