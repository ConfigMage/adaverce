import { NextResponse } from "next/server";
import { AUTH_COOKIE, cookieOptions, createToken, safeEqual } from "@/lib/auth";

const MAX_PASSCODE_LENGTH = 200;

export async function POST(request: Request) {
  const passcode = process.env.APP_PASSCODE;
  const secret = process.env.AUTH_SECRET;
  if (!passcode || !secret) {
    return NextResponse.json(
      { error: "The front desk isn't set up yet. APP_PASSCODE and AUTH_SECRET are missing." },
      { status: 500 },
    );
  }

  let submitted: unknown;
  try {
    const body = (await request.json()) as { passcode?: unknown };
    submitted = body?.passcode;
  } catch {
    return NextResponse.json({ error: "That form was filled out wrong." }, { status: 400 });
  }

  if (typeof submitted !== "string" || submitted.length === 0 || submitted.length > MAX_PASSCODE_LENGTH) {
    return NextResponse.json({ error: "That form was filled out wrong." }, { status: 400 });
  }

  if (!safeEqual(submitted, passcode)) {
    // Small fixed delay to slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { error: "Employee ID not recognized. HR has been notified (they have not)." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, createToken(), cookieOptions());
  return response;
}
