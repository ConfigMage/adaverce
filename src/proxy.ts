import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/login") return NextResponse.next();

  const authed = verifyToken(request.cookies.get(AUTH_COOKIE)?.value);

  if (authed) {
    if (pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Employee ID required." }, { status: 401 });
  }

  if (pathname === "/login") return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
