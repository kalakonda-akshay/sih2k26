/** Formatting helpers shared across the dashboard. */

/** "4m ago", "2h ago", "3d ago" — compact relative time for feeds. */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/** "in 1h 35m" / "overdue by 20m" for delivery ETAs. */
export function timeUntil(timestamp: number, now = Date.now()): string {
  const diff = timestamp - now;
  const overdue = diff < 0;
  const minutes = Math.floor(Math.abs(diff) / 60000);
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;

  const body =
    hours > 0 ? `${hours}h ${rem}m` : `${Math.max(minutes, 1)}m`;

  return overdue ? `overdue by ${body}` : `in ${body}`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Indian digit grouping (1,00,000) via the locale. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
}

/** "road_damage" → "Road damage" for any enum without an explicit label. */
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
