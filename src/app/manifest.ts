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
 * Installability on Android Chrome needs all three of: HTTPS, raster icons
 * at 192 and 512, and a registered service worker with a fetch handler. All
 * three are now in place, so the browser offers a genuine "Install app".
 *
 * The maskable icon is separate because Android crops launcher icons to the
 * device's shape; the maskable variant carries the safe-zone padding that
 * crop needs.
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
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
