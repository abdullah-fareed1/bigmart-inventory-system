// Location: middleware.ts (project root)

export const runtime = "nodejs";

export { auth as middleware } from "./auth";

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