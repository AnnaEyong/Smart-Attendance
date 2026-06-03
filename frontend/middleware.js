import { NextResponse } from "next/server";

const AUTH_COOKIE = "smart_attendance_admin_token";
const PUBLIC_PATHS = ["/login", "/unauthorized"];
const PROTECTED_PREFIXES = ["/dashboard", "/students", "/reports", "/register-student"];

const isPublicPath = (pathname) => {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
};

const isProtectedPath = (pathname) => {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

export function middleware(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedPath(pathname) && !token) {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    unauthorizedUrl.searchParams.set("next", `${pathname}${search || ""}`);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
