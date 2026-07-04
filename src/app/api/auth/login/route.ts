import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, safeEqual, sha256Hex } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const apiKey = process.env.RELIST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Login is not configured (RELIST_API_KEY is unset)" },
      { status: 500 },
    );
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // fall through to the check below
  }

  if (!password || !safeEqual(password, apiKey)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await sha256Hex(apiKey), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
