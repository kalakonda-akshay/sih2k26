import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Shell for every authenticated operations route. Kept in a route group so
 * the landing and future auth pages can opt out of the chrome.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
