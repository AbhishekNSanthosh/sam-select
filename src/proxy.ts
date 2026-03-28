import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/api/auth/login", "/g/", "/api/auth/invite/", "/api/auth/event-login"];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, Next.js internals, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Parse session cookie
  const sessionCookie = req.cookies.get("ss_session");
  let session: any = null;

  if (sessionCookie?.value) {
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf-8"));
      if (session.expiresAt < Date.now()) {
        session = null;
      }
    } catch {
      session = null;
    }
  }

  // If visiting /login but already logged in as admin → redirect to /admin
  if (pathname === "/login") {
    if (session && session.eventId === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // Allow other public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No session → redirect to login
  if (!session) {
    if (pathname.startsWith("/event/")) {
      const parts = pathname.split("/");
      if (parts.length >= 3) {
        return NextResponse.redirect(new URL(`/api/auth/event-login?eventId=${parts[2]}`, req.url));
      }
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin guard for /admin routes
  if (pathname.startsWith("/admin") && session.eventId !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Client guard — prevent admin session from accessing event routes
  if (pathname.startsWith("/event/") && session.eventId === "admin") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
