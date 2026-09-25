import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import type { NextRequest } from "next/server";

/**
 * Route matchers for access control.
 *
 * Public routes: accessible without authentication.
 * Auth routes: redirect to /dashboard when already signed in.
 */
const isPublicRoute = createRouteMatcher([
  "/login",
  "/signup",
  "/forgot-password",
  "/api/auth(.*)",
]);

const isAuthRoute = createRouteMatcher([
  "/login",
  "/signup",
  "/forgot-password",
]);

export default convexAuthNextjsMiddleware(async (request: NextRequest) => {
  // Check both HTTPS production cookie (__Host- prefix) and localhost cookie
  const token =
    request.cookies.get("__Host-__convexAuthJWT")?.value ||
    request.cookies.get("__convexAuthJWT")?.value;
  const isAuthed = Boolean(token && token.trim().length > 20);

  const pathname = request.nextUrl.pathname;

  // Root path: redirect to dashboard if logged in, otherwise to login
  if (pathname === "/") {
    return nextjsMiddlewareRedirect(
      request,
      isAuthed ? "/dashboard" : "/login",
    );
  }

  // Redirect unauthenticated users away from protected pages.
  if (!isPublicRoute(request) && !isAuthed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  // Redirect already-authenticated users away from auth pages.
  if (isAuthRoute(request) && isAuthed) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});

export const config = {
  // Run on every route except static files, _next internals, and favicon.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

