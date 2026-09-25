import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari, Noto_Sans_Bengali } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { I18nProvider } from "@/components/providers/i18n-provider";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
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
      className={`dark ${geistSans.variable} ${geistMono.variable} ${notoSansDevanagari.variable} ${notoSansBengali.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ServiceWorker />
        <I18nProvider>
          <ConvexClientProvider>
            <TooltipProvider delay={200}>{children}</TooltipProvider>
          </ConvexClientProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
