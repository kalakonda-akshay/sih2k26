export interface ConvoyWaypoint {
  lat: number;
  lng: number;
  name: string;
  elevationMeters: number;
}

export interface ConvoyDefinition {
  id: string;
  name: string;
  agency: string;
  cargo: string;
  weightTons: number;
  vehicleType: string;
  primaryPath: ConvoyWaypoint[];
  alternatePath?: ConvoyWaypoint[];
  hazardZone: {
    lat: number;
    lng: number;
    radiusMeters: number;
    name: string;
    hazardType: string;
  };
}

export const SIMULATED_CONVOYS: ConvoyDefinition[] = [
  {
    id: "convoy-alpha",
    name: "Convoy Alpha (Medical & Oxygen Relief)",
    agency: "MDoNER · NDRF Logistics",
    cargo: "Medical Oxygen & Critical Surgical Kits",
    weightTons: 14.5,
    vehicleType: "Heavy All-Terrain Ashok Leyland 4x4",
    hazardZone: {
      lat: 25.18,
      lng: 92.35,
      radiusMeters: 14000,
      name: "Sonapur Mudslide Defile (NH-6 Sector)",
      hazardType: "Active Monsoon Flash Mudflow",
    },
    primaryPath: [
      { lat: 26.185, lng: 91.75, name: "Guwahati Central Depot", elevationMeters: 55 },
      { lat: 26.14, lng: 91.8, name: "Dispur Regional Command", elevationMeters: 62 },
      { lat: 26.06, lng: 91.88, name: "Jorabat Strategic Junction", elevationMeters: 110 },
      { lat: 25.9, lng: 91.88, name: "Nongpoh Valley Post", elevationMeters: 590 },
      { lat: 25.68, lng: 91.9, name: "Umiam Lake Pass", elevationMeters: 1020 },
      { lat: 25.578, lng: 91.893, name: "Shillong Civil Hospital", elevationMeters: 1520 },
      { lat: 25.44, lng: 92.2, name: "Jowai Ridge Corridor", elevationMeters: 1380 },
      { lat: 25.18, lng: 92.35, name: "Sonapur Hazard Sector", elevationMeters: 420 },
      { lat: 24.95, lng: 92.6, name: "Badarpur Railhead", elevationMeters: 45 },
      { lat: 24.833, lng: 92.779, name: "Silchar Valley Disaster Camp", elevationMeters: 28 },
    ],
    alternatePath: [
      { lat: 25.578, lng: 91.893, name: "Shillong Civil Hospital", elevationMeters: 1520 },
      { lat: 25.48, lng: 92.55, name: "Umrangso Hydro Bypass", elevationMeters: 840 },
      { lat: 25.17, lng: 92.75, name: "Haflong Valley Ridge", elevationMeters: 680 },
      { lat: 24.833, lng: 92.779, name: "Silchar Valley Disaster Camp", elevationMeters: 28 },
    ],
  },
  {
    id: "convoy-bravo",
    name: "Convoy Bravo (BRO Heavy Excavator Column)",
    agency: "Border Roads Organisation (BRO)",
    cargo: "Hydraulic Breakers & Caterpillar Bulldozer",
    weightTons: 38.0,
    vehicleType: "BEML Tatra 8x8 Recovery Column",
    hazardZone: {
      lat: 27.505,
      lng: 92.103,
      radiusMeters: 12000,
      name: "Sela Pass North Wall (Elevation 4,170m)",
      hazardType: "Catastrophic Rockfall & Permafrost Slip",
    },
    primaryPath: [
      { lat: 26.65, lng: 92.79, name: "Tezpur BRO Main Base", elevationMeters: 75 },
      { lat: 27.01, lng: 92.65, name: "Bhalukpong Inner Line Gate", elevationMeters: 213 },
      { lat: 27.18, lng: 92.52, name: "Tenga Valley Military Station", elevationMeters: 1260 },
      { lat: 27.264, lng: 92.423, name: "Bomdila Pass Peak", elevationMeters: 2415 },
      { lat: 27.35, lng: 92.24, name: "Dirang Hydro Basin", elevationMeters: 1560 },
      { lat: 27.45, lng: 92.15, name: "Baisakhi High Camp", elevationMeters: 3100 },
      { lat: 27.505, lng: 92.103, name: "Sela Pass Ridge (High Risk)", elevationMeters: 4170 },
      { lat: 27.58, lng: 91.86, name: "Tawang Forward Logistics Depot", elevationMeters: 3048 },
    ],
  },
  {
    id: "convoy-charlie",
    name: "Convoy Charlie (NDRF Emergency Ration Fleet)",
    agency: "National Disaster Response Force (NDRF)",
    cargo: "Ready-To-Eat Rations & Water Purification Units",
    weightTons: 22.0,
    vehicleType: "Tata LPTA 715 4x4 Quick-Response Fleet",
    hazardZone: {
      lat: 25.5,
      lng: 94.15,
      radiusMeters: 15000,
      name: "Mao Gate Inter-State Mountain Slump",
      hazardType: "Torrential Debris Flow Blockage",
    },
    primaryPath: [
      { lat: 25.906, lng: 93.727, name: "Dimapur Railway Supply Yard", elevationMeters: 145 },
      { lat: 25.79, lng: 93.77, name: "Chumukedima Defile Checkpost", elevationMeters: 240 },
      { lat: 25.67, lng: 94.108, name: "Kohima Highland Command", elevationMeters: 1444 },
      { lat: 25.5, lng: 94.15, name: "Mao Border Pass", elevationMeters: 1820 },
      { lat: 25.26, lng: 94.02, name: "Senapati Relief Center", elevationMeters: 1040 },
      { lat: 25.01, lng: 93.95, name: "Kangpokpi Medical Post", elevationMeters: 920 },
      { lat: 24.817, lng: 93.936, name: "Imphal Kangla Command Camp", elevationMeters: 786 },
    ],
  },
];

/** Calculate distance in meters between two lat/lng pairs */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/** Interpolate position along waypoint array based on progress 0..1 */
export function interpolateConvoyPosition(
  waypoints: ConvoyWaypoint[],
  progress: number,
): { lat: number; lng: number; heading: number; currentWaypoint: string; elevation: number } {
  if (!waypoints || waypoints.length === 0) {
    return { lat: 0, lng: 0, heading: 0, currentWaypoint: "Unknown", elevation: 0 };
  }
  if (waypoints.length === 1 || progress <= 0) {
    return {
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      heading: 0,
      currentWaypoint: waypoints[0].name,
      elevation: waypoints[0].elevationMeters,
    };
  }
  if (progress >= 1) {
    const last = waypoints[waypoints.length - 1];
    return {
      lat: last.lat,
      lng: last.lng,
      heading: 0,
      currentWaypoint: last.name,
      elevation: last.elevationMeters,
    };
  }

  // Calculate total path distance
  const segmentDistances: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = getDistanceMeters(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng,
    );
    segmentDistances.push(d);
    totalDist += d;
  }

  const targetDist = progress * totalDist;
  let accumulated = 0;

  for (let i = 0; i < segmentDistances.length; i++) {
    const nextAcc = accumulated + segmentDistances[i];
    if (targetDist <= nextAcc || i === segmentDistances.length - 1) {
      const segRatio = (targetDist - accumulated) / (segmentDistances[i] || 1);
      const clampedRatio = Math.max(0, Math.min(1, segRatio));

      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];

      const lat = p1.lat + (p2.lat - p1.lat) * clampedRatio;
      const lng = p1.lng + (p2.lng - p1.lng) * clampedRatio;
      const elevation = Math.round(
        p1.elevationMeters + (p2.elevationMeters - p1.elevationMeters) * clampedRatio,
      );

      // Calculate heading angle
      const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
      const y = Math.sin(dLng) * Math.cos((p2.lat * Math.PI) / 180);
      const x =
        Math.cos((p1.lat * Math.PI) / 180) * Math.sin((p2.lat * Math.PI) / 180) -
        Math.sin((p1.lat * Math.PI) / 180) *
          Math.cos((p2.lat * Math.PI) / 180) *
          Math.cos(dLng);
      const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

      return {
        lat,
        lng,
        heading,
        currentWaypoint: `${p1.name} ➔ ${p2.name}`,
        elevation,
      };
    }
    accumulated = nextAcc;
  }

  const fallback = waypoints[waypoints.length - 1];
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    heading: 0,
    currentWaypoint: fallback.name,
    elevation: fallback.elevationMeters,
  };
}
