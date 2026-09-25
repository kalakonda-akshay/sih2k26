"use client";

import { useEffect, useState } from "react";
import { TileLayer } from "react-leaflet";

interface RadarApiResponse {
  host: string;
  radar?: {
    past?: Array<{ time: number; path: string }>;
    nowcast?: Array<{ time: number; path: string }>;
  };
}

export function RadarLayer({ opacity = 0.65 }: { opacity?: number }) {
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRadar() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: RadarApiResponse = await res.json();
        const frames = data.radar?.past ?? [];
        if (frames.length > 0 && data.host) {
          const latest = frames[frames.length - 1];
          const url = `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
          if (!cancelled) {
            setTileUrl(url);
          }
        }
      } catch {
        // RainViewer unavailable, silently skip
      }
    }

    fetchRadar();
    const interval = setInterval(fetchRadar, 5 * 60 * 1000); // 5 min refresh
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!tileUrl) return null;

  return (
    <TileLayer
      key={tileUrl}
      url={tileUrl}
      opacity={opacity}
      zIndex={350}
      attribution='&copy; <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'
      maxZoom={14}
    />
  );
}
