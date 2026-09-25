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

export default convexAuthNextjsMiddleware(
  async (
    request: NextRequest,
    { convexAuth }: { convexAuth: { isAuthenticated: () => Promise<boolean> } },
  ) => {
    const isAuthed = await convexAuth.isAuthenticated();

    // Redirect unauthenticated users away from protected pages.
    if (!isPublicRoute(request) && !isAuthed) {
      return nextjsMiddlewareRedirect(request, "/login");
    }

    // Redirect already-authenticated users away from auth pages.
    if (isAuthRoute(request) && isAuthed) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
  },
);

export const config = {
  // Run on every route except static files, _next internals, and favicon.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
