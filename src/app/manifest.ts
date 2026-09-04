import type { MetadataRoute } from "next";

/**
 * Web App Manifest.
 *
 * Makes the platform installable on a field officer's phone and launches it
 * in standalone mode, so it opens like an app rather than a browser tab.
 *
 * `start_url` is `/field` deliberately: someone who installs this to a home
 * screen is almost certainly field staff, and the command centre is a
 * desktop surface. It remains one tap away from the field footer.
 *
 * Note on scope: this manifest provides installability and standalone
 * display. It does NOT register a service worker, so there is no offline
 * shell caching — see the offline note in `use-field-draft.ts` for what is
 * and is not preserved without connectivity.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NER-Vision AI — Logistics & Accessibility Intelligence",
    short_name: "NER-Vision",
    description:
      "Real-time road accessibility, logistics and disruption intelligence for the North Eastern Region of India.",
    start_url: "/field",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1216",
    theme_color: "#0b1216",
    categories: ["government", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
