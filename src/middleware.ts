import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, safeEqual, sha256Hex } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Auth + CORS middleware.
//
// Two ways in, both driven by the RELIST_API_KEY env var:
//   1. Extension / API clients send the key in an `X-ReList-Key` header.
//   2. Browsers log in at /login, which sets an HttpOnly cookie holding a
//      SHA-256 hash of the key.
//
// If RELIST_API_KEY is not set (local dev, tests), everything is allowed.
//
// CORS is only granted to chrome-extension:// origins — regular websites
// never get cross-origin access to the API.
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !origin.startsWith("chrome-extension://")) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-ReList-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  // Preflight never carries credentials — answer it before auth.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const apiKey = process.env.RELIST_API_KEY;
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  let authorized = !apiKey || PUBLIC_PATHS.includes(pathname);

  if (!authorized && apiKey) {
    const headerKey = request.headers.get("x-relist-key");
    if (headerKey && safeEqual(headerKey, apiKey)) {
      authorized = true;
    } else {
      const cookie = request.cookies.get(AUTH_COOKIE)?.value;
      if (cookie && safeEqual(cookie, await sha256Hex(apiKey))) {
        authorized = true;
      }
    }
  }

  let response: NextResponse;
  if (authorized) {
    response = NextResponse.next();
  } else if (isApi) {
    response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else {
    const loginUrl = new URL("/login", request.url);
    response = NextResponse.redirect(loginUrl);
  }

  for (const [key, value] of Object.entries(cors)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Everything except Next.js internals and static assets. The extension
  // zip stays public so it can be downloaded before logging in.
  matcher: ["/((?!_next/|favicon\\.ico|icons/|relist-extension-).*)"],
};
