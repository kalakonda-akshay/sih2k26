/**
 * Grid clustering for map point layers.
 *
 * Deliberately dependency-free. `leaflet.markercluster` has no maintained
 * React 19 / react-leaflet v5 binding, and at NER working-set size (tens of
 * points, not thousands) a fixed-grid pass is both sufficient and cheaper
 * than a quadtree. Points are bucketed by a cell size that grows as you zoom
 * out, so markers stop overlapping at region level and separate again as you
 * zoom in.
 *
 * If the dataset later grows past a few thousand points, replace the body of
 * `clusterPoints` with a supercluster index — the call signature is designed
 * to survive that swap.
 */

export interface Clusterable {
  latitude: number;
  longitude: number;
}

export interface Cluster<T extends Clusterable> {
  /** Stable key for React reconciliation. */
  key: string;
  lat: number;
  lng: number;
  items: T[];
}

/**
 * Degrees per grid cell at a given zoom. Roughly halves per zoom level, so a
 * cell stays about the same size on screen.
 */
function cellSizeForZoom(zoom: number): number {
  return 6 / Math.pow(2, Math.max(zoom - 4, 0));
}

/** Below this zoom the map is showing the whole region and clustering helps. */
export const CLUSTER_MAX_ZOOM = 8;

export function clusterPoints<T extends Clusterable>(
  points: T[],
  zoom: number,
): Cluster<T>[] {
  // Zoomed in far enough that every point can stand on its own.
  if (zoom >= CLUSTER_MAX_ZOOM) {
    return points.map((p, i) => ({
      key: `p-${i}-${p.latitude.toFixed(4)}-${p.longitude.toFixed(4)}`,
      lat: p.latitude,
      lng: p.longitude,
      items: [p],
    }));
  }

  const size = cellSizeForZoom(zoom);
  const buckets = new Map<string, T[]>();

  for (const point of points) {
    const row = Math.floor(point.latitude / size);
    const col = Math.floor(point.longitude / size);
    const key = `${row}:${col}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }

  return [...buckets.entries()].map(([key, items]) => {
    // Place the cluster at the centroid of its members, not the cell centre,
    // so a two-point cluster does not visibly jump away from either point.
    const lat = items.reduce((sum, p) => sum + p.latitude, 0) / items.length;
    const lng = items.reduce((sum, p) => sum + p.longitude, 0) / items.length;
    return { key: `c-${key}`, lat, lng, items };
  });
}
