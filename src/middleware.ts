import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files, Next.js internals, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = req.cookies.get("ss_session");
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf-8"));
    if (session.expiresAt < Date.now()) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admin guard for /admin routes
    if (pathname.startsWith("/admin") && session.eventId !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Client guard — prevent client from accessing admin routes or wrong event
    if (pathname.startsWith("/event/") && session.eventId === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
