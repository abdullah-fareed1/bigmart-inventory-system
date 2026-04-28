// Location: middleware.ts (project root)

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { canAccessRoute } from "./lib/permissions";

// Protected routes that require role-based access control
const PROTECTED_ROUTES = [
  "/dashboard",
  "/pos",
  "/transactions",
  "/products",
  "/stocks",
  "/suppliers",
  "/supplier-bills",
  "/customers",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow login page without authentication
  if (pathname === "/login") {
    const session = await auth();
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Check if accessing any protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtectedRoute) {
    // Get the session
    const session = await auth();

    // Require authentication for protected routes
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check role-based access for protected routes
    const hasAccess = canAccessRoute(session as any, pathname);

    if (!hasAccess) {
      // User doesn't have permission to access this route
      // Redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } else if (!pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    // Skip auth check for public assets (images, fonts, etc)
    if (
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".jpeg") ||
      pathname.endsWith(".gif") ||
      pathname.endsWith(".webp") ||
      pathname.endsWith(".svg") ||
      pathname.endsWith(".woff") ||
      pathname.endsWith(".woff2") ||
      pathname.endsWith(".ttf") ||
      pathname.endsWith(".eot")
    ) {
      return NextResponse.next();
    }
    // For non-protected routes, still require authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets (images, logos, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|images).*)",
  ],
};