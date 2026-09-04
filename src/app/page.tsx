import { redirect } from "next/navigation";

/**
 * The command dashboard is the product's front door for this phase. A public
 * landing page is a later-phase deliverable.
 */
export default function RootPage() {
  redirect("/dashboard");
}
