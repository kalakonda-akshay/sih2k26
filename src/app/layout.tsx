import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorker } from "@/components/pwa/service-worker";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NER-Vision AI — Logistics & Accessibility Command Centre",
  description:
    "Real-time accessibility, logistics and disruption intelligence across the eight North Eastern states of India. SIH26002 · MDoNER.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ServiceWorker />
        <ConvexClientProvider>
          <TooltipProvider delay={200}>{children}</TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
