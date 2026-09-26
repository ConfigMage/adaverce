import { NextResponse } from "next/server";
import { AUTH_COOKIE, cookieOptions } from "@/lib/auth";
import { isAuthenticated, unauthorized } from "@/lib/session";

export async function POST() {
  if (!(await isAuthenticated())) return unauthorized();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
