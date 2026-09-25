import type { ReactNode } from "react";

/**
 * Layout for unauthenticated auth pages (login, signup, forgot-password).
 * Renders children centred vertically and horizontally on the screen,
 * inheriting the dark background from the root layout.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
