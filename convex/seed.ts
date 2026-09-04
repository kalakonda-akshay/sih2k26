import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { LOCATION_BY_NAME, SEED_KEY, SEED_VERSION } from "./lib/constants";
import {
  curvedLine,
  HOUR,
  MINUTE,
  riskLevelFromScore,
  seededRandom,
} from "./lib/helpers";
import type {
  AccessibilityStatus,
  CargoType,
  DeliveryPriority,
  DeliveryStatus,
  IncidentType,
  RoadClass,
  Severity,
  UserRole,
  VehicleStatus,
  VehicleType,
  WeatherAlertLevel,
  WeatherCondition,
} from "./lib/validators";

/**
 * Demonstration seed for NER-Vision AI.
 *
 * The scenario is a monsoon build-up over the Meghalaya and Arunachal hills:
 * rainfall rising in Ri-Bhoi and East Kameng, the risk model escalating, a
 * confirmed landslide closing NH-13 near Seppa, and logistics traffic
 * carrying medical and food loads through the affected corridors.
 *
 * Idempotency: a `seedMeta` row keyed on SEED_KEY records that the payload
 * has been applied. Running the mutation again is a no-op until SEED_VERSION
 * changes or `clearAll` is called, so it is safe to click twice.
 */

/* --------------------------------------------------------------- payload */

const USERS: Array<{
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  phone: string;
  district?: string;
  state?: string;
}> = [
  {
    name: "Dr. Anjali Bora",
    email: "admin@nervision.gov.in",
    role: "admin",
    organization: "MDoNER — Regional Command",
    phone: "+91 98640 11201",
    state: "Assam",
    district: "Kamrup Metropolitan",
  },
  {
    name: "Rakesh Deka",
    email: "operator@nervision.gov.in",
    role: "logistics_operator",
    organization: "NE Logistics Corporation",
    phone: "+91 98640 11202",
    state: "Assam",
    district: "Kamrup Metropolitan",
  },
  {
    name: "Tenzin Wangchuk",
    email: "field.eastkameng@nervision.gov.in",
    role: "field_officer",
    organization: "Arunachal PWD — East Kameng",
    phone: "+91 98640 11203",
    state: "Arunachal Pradesh",
    district: "East Kameng",
  },
  {
    name: "Ibalari Nongrum",
    email: "field.ribhoi@nervision.gov.in",
    role: "field_officer",
    organization: "Meghalaya PWD — Ri-Bhoi",
    phone: "+91 98640 11204",
    state: "Meghalaya",
    district: "Ri-Bhoi",
  },
  {
    name: "Maj. Sanjay Thapa",
    email: "emergency@nervision.gov.in",
    role: "emergency_authority",
    organization: "State Disaster Management Authority",
    phone: "+91 98640 11205",
    state: "Sikkim",
    district: "Gangtok",
  },
  {
    name: "Lalrinpuii Sailo",
    email: "operator.mizoram@nervision.gov.in",
    role: "logistics_operator",
    organization: "Mizoram State Transport",
    phone: "+91 98640 11206",
    state: "Mizoram",
    district: "Aizawl",
  },
];

const ROADS: Array<{
  roadName: string;
  roadNumber: string;
  from: string;
  to: string;
  state: string;
  district: string;
  accessibilityStatus: AccessibilityStatus;
  riskScore: number;
  roadClass: RoadClass;
}> = [
  { roadName: "Guwahati – Nagaon Corridor", roadNumber: "NH-27", from: "Guwahati", to: "Nagaon", state: "Assam", district: "Kamrup Metropolitan", accessibilityStatus: "accessible", riskScore: 22, roadClass: "NH" },
  { roadName: "Nagaon – Jorhat Corridor", roadNumber: "NH-715", from: "Nagaon", to: "Jorhat", state: "Assam", district: "Nagaon", accessibilityStatus: "accessible", riskScore: 30, roadClass: "NH" },
  { roadName: "Jorhat – Dibrugarh Corridor", roadNumber: "NH-37", from: "Jorhat", to: "Dibrugarh", state: "Assam", district: "Jorhat", accessibilityStatus: "accessible", riskScore: 28, roadClass: "NH" },
  { roadName: "Tezpur – Nagaon Link", roadNumber: "NH-715A", from: "Tezpur", to: "Nagaon", state: "Assam", district: "Sonitpur", accessibilityStatus: "accessible", riskScore: 27, roadClass: "NH" },
  { roadName: "Jorabat – Shillong Highway", roadNumber: "NH-6", from: "Guwahati", to: "Shillong", state: "Meghalaya", district: "Ri-Bhoi", accessibilityStatus: "restricted", riskScore: 68, roadClass: "NH" },
  { roadName: "Shillong – Silchar Highway", roadNumber: "NH-6E", from: "Shillong", to: "Silchar", state: "Meghalaya", district: "West Jaintia Hills", accessibilityStatus: "restricted", riskScore: 61, roadClass: "NH" },
  { roadName: "Tura – Guwahati Link", roadNumber: "NH-127B", from: "Tura", to: "Guwahati", state: "Meghalaya", district: "West Garo Hills", accessibilityStatus: "accessible", riskScore: 33, roadClass: "NH" },
  { roadName: "Dimapur – Kohima Highway", roadNumber: "NH-2", from: "Dimapur", to: "Kohima", state: "Nagaland", district: "Dimapur", accessibilityStatus: "accessible", riskScore: 41, roadClass: "NH" },
  { roadName: "Kohima – Mokokchung Road", roadNumber: "NH-61", from: "Kohima", to: "Mokokchung", state: "Nagaland", district: "Kohima", accessibilityStatus: "accessible", riskScore: 38, roadClass: "NH" },
  { roadName: "Kohima – Imphal Highway", roadNumber: "NH-2A", from: "Kohima", to: "Imphal", state: "Manipur", district: "Imphal West", accessibilityStatus: "restricted", riskScore: 66, roadClass: "NH" },
  { roadName: "Imphal – Ukhrul Road", roadNumber: "NH-102", from: "Imphal", to: "Ukhrul", state: "Manipur", district: "Ukhrul", accessibilityStatus: "restricted", riskScore: 58, roadClass: "NH" },
  { roadName: "Imphal – Churachandpur Road", roadNumber: "NH-2C", from: "Imphal", to: "Churachandpur", state: "Manipur", district: "Churachandpur", accessibilityStatus: "accessible", riskScore: 43, roadClass: "NH" },
  { roadName: "Aizawl – Champhai Highway", roadNumber: "NH-306", from: "Aizawl", to: "Champhai", state: "Mizoram", district: "Champhai", accessibilityStatus: "accessible", riskScore: 44, roadClass: "NH" },
  { roadName: "Aizawl – Lunglei Highway", roadNumber: "NH-54", from: "Aizawl", to: "Lunglei", state: "Mizoram", district: "Lunglei", accessibilityStatus: "accessible", riskScore: 36, roadClass: "NH" },
  { roadName: "Gangtok – Siliguri Lifeline", roadNumber: "NH-10", from: "Gangtok", to: "Namchi", state: "Sikkim", district: "Gangtok", accessibilityStatus: "restricted", riskScore: 72, roadClass: "NH" },
  { roadName: "Gangtok – Mangan Road", roadNumber: "NH-310", from: "Gangtok", to: "Mangan", state: "Sikkim", district: "Mangan", accessibilityStatus: "restricted", riskScore: 64, roadClass: "NH" },
  { roadName: "Tezpur – Itanagar Highway", roadNumber: "NH-15", from: "Tezpur", to: "Itanagar", state: "Arunachal Pradesh", district: "Papum Pare", accessibilityStatus: "accessible", riskScore: 39, roadClass: "NH" },
  { roadName: "Itanagar – Seppa Road", roadNumber: "NH-13", from: "Itanagar", to: "Seppa", state: "Arunachal Pradesh", district: "East Kameng", accessibilityStatus: "blocked", riskScore: 92, roadClass: "NH" },
  { roadName: "Bomdila – Tawang Road", roadNumber: "NH-13A", from: "Bomdila", to: "Tawang", state: "Arunachal Pradesh", district: "Tawang", accessibilityStatus: "restricted", riskScore: 71, roadClass: "NH" },
  { roadName: "Agartala – Dharmanagar Highway", roadNumber: "NH-8", from: "Agartala", to: "Dharmanagar", state: "Tripura", district: "West Tripura", accessibilityStatus: "accessible", riskScore: 25, roadClass: "NH" },
  { roadName: "Agartala – Udaipur Road", roadNumber: "NH-208", from: "Agartala", to: "Udaipur", state: "Tripura", district: "Gomati", accessibilityStatus: "accessible", riskScore: 20, roadClass: "NH" },

  { roadName: "Jorabat – Nongpoh Section", roadNumber: "NH-6N", from: "Guwahati", to: "Nongpoh", state: "Meghalaya", district: "Ri-Bhoi", accessibilityStatus: "accessible", riskScore: 38, roadClass: "NH" },
  { roadName: "Nongpoh – Shillong Section", roadNumber: "NH-6S", from: "Nongpoh", to: "Shillong", state: "Meghalaya", district: "Ri-Bhoi", accessibilityStatus: "accessible", riskScore: 44, roadClass: "NH" },
  { roadName: "Guwahati – Tezpur Highway", roadNumber: "NH-15G", from: "Guwahati", to: "Tezpur", state: "Assam", district: "Sonitpur", accessibilityStatus: "accessible", riskScore: 24, roadClass: "NH" },
  { roadName: "Tezpur – Jorhat Link", roadNumber: "NH-715J", from: "Tezpur", to: "Jorhat", state: "Assam", district: "Sonitpur", accessibilityStatus: "accessible", riskScore: 29, roadClass: "NH" },
  { roadName: "Nagaon – Dimapur Corridor", roadNumber: "NH-29", from: "Nagaon", to: "Dimapur", state: "Assam", district: "Nagaon", accessibilityStatus: "accessible", riskScore: 35, roadClass: "NH" },
  { roadName: "Silchar – Imphal Highway", roadNumber: "NH-37S", from: "Silchar", to: "Imphal", state: "Assam", district: "Cachar", accessibilityStatus: "restricted", riskScore: 63, roadClass: "NH" },
  { roadName: "Silchar – Aizawl Highway", roadNumber: "NH-306A", from: "Silchar", to: "Aizawl", state: "Mizoram", district: "Aizawl", accessibilityStatus: "accessible", riskScore: 47, roadClass: "NH" },
  { roadName: "Agartala – Silchar Corridor", roadNumber: "NH-8S", from: "Agartala", to: "Silchar", state: "Tripura", district: "North Tripura", accessibilityStatus: "accessible", riskScore: 31, roadClass: "NH" },
  { roadName: "Tezpur – Bomdila Road", roadNumber: "NH-13T", from: "Tezpur", to: "Bomdila", state: "Arunachal Pradesh", district: "West Kameng", accessibilityStatus: "accessible", riskScore: 52, roadClass: "NH" },
];

const VEHICLES: Array<{
  vehicleNumber: string;
  vehicleType: VehicleType;
  cargoType: CargoType;
  driverName: string;
  driverPhone: string;
  status: VehicleStatus;
  at: string;
  destination: string;
  speed: number;
  riskScore: number;
}> = [
  { vehicleNumber: "AS-01-NC-4412", vehicleType: "truck", cargoType: "medicine", driverName: "Bhaskar Sarma", driverPhone: "+91 90850 22101", status: "active", at: "Guwahati", destination: "Shillong", speed: 42, riskScore: 68 },
  { vehicleNumber: "AS-02-KC-1187", vehicleType: "truck", cargoType: "food", driverName: "Jitu Kalita", driverPhone: "+91 90850 22102", status: "active", at: "Nagaon", destination: "Jorhat", speed: 55, riskScore: 30 },
  { vehicleNumber: "AS-03-BB-7734", vehicleType: "tanker", cargoType: "fuel", driverName: "Ranjit Nath", driverPhone: "+91 90850 22103", status: "active", at: "Jorhat", destination: "Dibrugarh", speed: 48, riskScore: 28 },
  { vehicleNumber: "AS-04-DC-2290", vehicleType: "reefer", cargoType: "medicine", driverName: "Pranab Gogoi", driverPhone: "+91 90850 22104", status: "delayed", at: "Tezpur", destination: "Itanagar", speed: 0, riskScore: 39 },
  { vehicleNumber: "ML-05-AC-3321", vehicleType: "truck", cargoType: "construction", driverName: "Wanbok Lyngdoh", driverPhone: "+91 90850 22105", status: "delayed", at: "Shillong", destination: "Silchar", speed: 0, riskScore: 61 },
  { vehicleNumber: "ML-07-BA-8890", vehicleType: "pickup", cargoType: "agricultural", driverName: "Donbok Marak", driverPhone: "+91 90850 22106", status: "active", at: "Tura", destination: "Guwahati", speed: 51, riskScore: 33 },
  { vehicleNumber: "AR-01-AB-5567", vehicleType: "ambulance", cargoType: "emergency", driverName: "Techi Tara", driverPhone: "+91 90850 22107", status: "emergency", at: "Itanagar", destination: "Seppa", speed: 34, riskScore: 92 },
  { vehicleNumber: "AR-02-CC-9012", vehicleType: "truck", cargoType: "food", driverName: "Nabam Doni", driverPhone: "+91 90850 22108", status: "delayed", at: "Bomdila", destination: "Tawang", speed: 0, riskScore: 71 },
  { vehicleNumber: "NL-01-AC-6654", vehicleType: "truck", cargoType: "food", driverName: "Imkong Ao", driverPhone: "+91 90850 22109", status: "active", at: "Dimapur", destination: "Kohima", speed: 46, riskScore: 41 },
  { vehicleNumber: "NL-02-BB-1129", vehicleType: "reefer", cargoType: "medicine", driverName: "Kevi Zhimo", driverPhone: "+91 90850 22110", status: "active", at: "Kohima", destination: "Mokokchung", speed: 39, riskScore: 38 },
  { vehicleNumber: "MN-01-AA-3345", vehicleType: "truck", cargoType: "medicine", driverName: "Thoiba Singh", driverPhone: "+91 90850 22111", status: "active", at: "Kohima", destination: "Imphal", speed: 37, riskScore: 66 },
  { vehicleNumber: "MN-02-CB-7781", vehicleType: "pickup", cargoType: "agricultural", driverName: "Ningthou Meitei", driverPhone: "+91 90850 22112", status: "active", at: "Imphal", destination: "Churachandpur", speed: 44, riskScore: 43 },
  { vehicleNumber: "MZ-01-AB-2214", vehicleType: "truck", cargoType: "food", driverName: "Lalthanmawia", driverPhone: "+91 90850 22113", status: "active", at: "Aizawl", destination: "Champhai", speed: 41, riskScore: 44 },
  { vehicleNumber: "MZ-02-BC-5590", vehicleType: "tanker", cargoType: "fuel", driverName: "Zoramthanga H", driverPhone: "+91 90850 22114", status: "idle", at: "Lunglei", destination: "Aizawl", speed: 0, riskScore: 36 },
  { vehicleNumber: "SK-01-AA-8823", vehicleType: "truck", cargoType: "emergency", driverName: "Pemba Sherpa", driverPhone: "+91 90850 22115", status: "emergency", at: "Gangtok", destination: "Mangan", speed: 28, riskScore: 72 },
  { vehicleNumber: "SK-02-AB-4471", vehicleType: "reefer", cargoType: "medicine", driverName: "Karma Bhutia", driverPhone: "+91 90850 22116", status: "active", at: "Namchi", destination: "Gangtok", speed: 33, riskScore: 64 },
  { vehicleNumber: "TR-01-AC-9938", vehicleType: "truck", cargoType: "food", driverName: "Subrata Debbarma", driverPhone: "+91 90850 22117", status: "active", at: "Agartala", destination: "Dharmanagar", speed: 58, riskScore: 25 },
  { vehicleNumber: "TR-02-BA-1102", vehicleType: "pickup", cargoType: "construction", driverName: "Manik Sarkar", driverPhone: "+91 90850 22118", status: "idle", at: "Udaipur", destination: "Agartala", speed: 0, riskScore: 20 },
];

/* ------------------------------------------------------------- mutation */

export const seedDemoData = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const existing = await ctx.db
      .query("seedMeta")
      .withIndex("by_key", (q) => q.eq("key", SEED_KEY))
      .unique();

    /**
     * The bookkeeping row alone is not proof the data is still there — rows
     * can be deleted from the Convex dashboard while `seedMeta` survives.
     * Verify the two tables every demo mutation depends on (roads for
     * `escalateRisk`, users for `triggerIncident`) and re-seed if either is
     * empty, so the seed heals a partially-wiped database instead of
     * reporting success over missing data.
     */
    const [anyRoad, anyUser] = await Promise.all([
      ctx.db.query("roads").first(),
      ctx.db.query("users").first(),
    ]);
    const dataPresent = anyRoad !== null && anyUser !== null;

    if (existing && existing.version === SEED_VERSION && dataPresent && !force) {
      return {
        status: "already-seeded" as const,
        message:
          "Demo data is already present. Pass force: true (or run clearAll first) to re-seed.",
        seededAt: existing.seededAt,
        counts: existing.counts,
      };
    }

    const now = Date.now();

    /* ---------------------------------------------------------- users -- */
    const userIds: Record<string, Id<"users">> = {};
    for (const u of USERS) {
      const found = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", u.email))
        .unique();
      userIds[u.email] =
        found?._id ??
        (await ctx.db.insert("users", {
          ...u,
          isActive: true,
          createdAt: now - 30 * 24 * HOUR,
          updatedAt: now,
        }));
    }

    const adminId = userIds["admin@nervision.gov.in"];
    const operatorId = userIds["operator@nervision.gov.in"];
    const fieldKamengId = userIds["field.eastkameng@nervision.gov.in"];
    const fieldRiBhoiId = userIds["field.ribhoi@nervision.gov.in"];

    /* ---------------------------------------------------------- roads -- */
    const roadIds: Record<string, Id<"roads">> = {};
    for (const r of ROADS) {
      const from = LOCATION_BY_NAME[r.from];
      const to = LOCATION_BY_NAME[r.to];
      if (!from || !to) continue;

      const key = `${r.roadNumber}:${r.from}-${r.to}`;
      const found = await ctx.db
        .query("roads")
        .withIndex("by_roadNumber", (q) => q.eq("roadNumber", r.roadNumber))
        .collect();
      const match = found.find(
        (x) => x.roadName === r.roadName && x.district === r.district,
      );

      if (match) {
        roadIds[key] = match._id;
        continue;
      }

      const lengthKm = Math.round(
        Math.hypot(
          (to.lat - from.lat) * 111,
          (to.lng - from.lng) * 101,
        ),
      );

      roadIds[key] = await ctx.db.insert("roads", {
        roadName: r.roadName,
        roadNumber: r.roadNumber,
        state: r.state,
        district: r.district,
        startLatitude: from.lat,
        startLongitude: from.lng,
        endLatitude: to.lat,
        endLongitude: to.lng,
        accessibilityStatus: r.accessibilityStatus,
        riskScore: r.riskScore,
        riskLevel: riskLevelFromScore(r.riskScore),
        geometry: curvedLine(from.lat, from.lng, to.lat, to.lng),
        roadClass: r.roadClass,
        lengthKm,
        startNode: r.from,
        endNode: r.to,
        lastUpdated: now - 20 * MINUTE,
        createdAt: now - 30 * 24 * HOUR,
      });
    }

    const roadKey = (num: string, from: string, to: string) =>
      roadIds[`${num}:${from}-${to}`];

    /* --------------------------------------------------------- routes -- */
    const routeSpecs: Array<{
      name: string;
      from: string;
      to: string;
      distance: number;
      estimatedTime: number;
      riskScore: number;
      routeType: "fastest" | "safest" | "emergency";
      status: "active" | "blocked" | "alternative";
      roads: Array<Id<"roads"> | undefined>;
    }> = [
      { name: "Guwahati → Shillong (Fastest)", from: "Guwahati", to: "Shillong", distance: 100, estimatedTime: 165, riskScore: 68, routeType: "fastest", status: "active", roads: [roadKey("NH-6", "Guwahati", "Shillong")] },
      { name: "Guwahati → Shillong via Nongpoh (Safest)", from: "Guwahati", to: "Shillong", distance: 118, estimatedTime: 200, riskScore: 41, routeType: "safest", status: "alternative", roads: [roadKey("NH-6", "Guwahati", "Shillong")] },
      { name: "Itanagar → Seppa (Fastest)", from: "Itanagar", to: "Seppa", distance: 92, estimatedTime: 210, riskScore: 92, routeType: "fastest", status: "blocked", roads: [roadKey("NH-13", "Itanagar", "Seppa")] },
      { name: "Itanagar → Seppa via Tezpur (Emergency)", from: "Itanagar", to: "Seppa", distance: 176, estimatedTime: 330, riskScore: 47, routeType: "emergency", status: "alternative", roads: [roadKey("NH-15", "Tezpur", "Itanagar")] },
      { name: "Dimapur → Imphal (Fastest)", from: "Dimapur", to: "Imphal", distance: 215, estimatedTime: 330, riskScore: 66, routeType: "fastest", status: "active", roads: [roadKey("NH-2", "Dimapur", "Kohima"), roadKey("NH-2A", "Kohima", "Imphal")] },
      { name: "Gangtok → Mangan (Emergency)", from: "Gangtok", to: "Mangan", distance: 66, estimatedTime: 150, riskScore: 64, routeType: "emergency", status: "active", roads: [roadKey("NH-310", "Gangtok", "Mangan")] },
      { name: "Aizawl → Champhai (Safest)", from: "Aizawl", to: "Champhai", distance: 192, estimatedTime: 300, riskScore: 44, routeType: "safest", status: "active", roads: [roadKey("NH-306", "Aizawl", "Champhai")] },
    ];

    const routeIds: Record<string, Id<"routes">> = {};
    for (const spec of routeSpecs) {
      const from = LOCATION_BY_NAME[spec.from];
      const to = LOCATION_BY_NAME[spec.to];
      if (!from || !to) continue;

      routeIds[spec.name] = await ctx.db.insert("routes", {
        name: spec.name,
        origin: spec.from,
        destination: spec.to,
        distance: spec.distance,
        estimatedTime: spec.estimatedTime,
        riskScore: spec.riskScore,
        routeType: spec.routeType,
        status: spec.status,
        geometry: curvedLine(from.lat, from.lng, to.lat, to.lng),
        roadIds: spec.roads.filter((r): r is Id<"roads"> => r !== undefined),
        createdAt: now - 6 * HOUR,
        updatedAt: now - 30 * MINUTE,
      });
    }

    /* -------------------------------------------------------- vehicles -- */
    const vehicleIds: Record<string, Id<"vehicles">> = {};
    for (const veh of VEHICLES) {
      const loc = LOCATION_BY_NAME[veh.at];
      const dest = LOCATION_BY_NAME[veh.destination];
      if (!loc) continue;

      const found = await ctx.db
        .query("vehicles")
        .withIndex("by_vehicleNumber", (q) =>
          q.eq("vehicleNumber", veh.vehicleNumber),
        )
        .unique();
      if (found) {
        vehicleIds[veh.vehicleNumber] = found._id;
        continue;
      }

      // Nudge the vehicle a little off its origin so markers do not stack.
      const jitter = (n: number) => (n % 7) * 0.012 - 0.036;
      const idx = VEHICLES.indexOf(veh);

      vehicleIds[veh.vehicleNumber] = await ctx.db.insert("vehicles", {
        vehicleNumber: veh.vehicleNumber,
        vehicleType: veh.vehicleType,
        cargoType: veh.cargoType,
        driverName: veh.driverName,
        driverPhone: veh.driverPhone,
        status: veh.status,
        latitude: loc.lat + jitter(idx),
        longitude: loc.lng + jitter(idx + 3),
        speed: veh.speed,
        heading: dest
          ? Math.round(
              (Math.atan2(dest.lng - loc.lng, dest.lat - loc.lat) * 180) /
                Math.PI +
                360,
            ) % 360
          : 0,
        destination: veh.destination,
        riskLevel: riskLevelFromScore(veh.riskScore),
        operatorId,
        capacityTonnes: veh.vehicleType === "pickup" ? 2 : 16,
        lastUpdated: now - 2 * MINUTE,
        createdAt: now - 20 * 24 * HOUR,
      });
    }

    /* ------------------------------------------------------ deliveries -- */
    const deliverySpecs: Array<{
      vehicle: string;
      cargoType: CargoType;
      priority: DeliveryPriority;
      origin: string;
      destination: string;
      status: DeliveryStatus;
      etaMinutes: number;
      progress: number;
      route?: string;
    }> = [
      { vehicle: "AS-01-NC-4412", cargoType: "medicine", priority: "critical", origin: "Guwahati", destination: "Shillong", status: "in_transit", etaMinutes: 95, progress: 42, route: "Guwahati → Shillong (Fastest)" },
      { vehicle: "AS-02-KC-1187", cargoType: "food", priority: "normal", origin: "Nagaon", destination: "Jorhat", status: "in_transit", etaMinutes: 140, progress: 31 },
      { vehicle: "AS-03-BB-7734", cargoType: "fuel", priority: "high", origin: "Jorhat", destination: "Dibrugarh", status: "in_transit", etaMinutes: 110, progress: 55 },
      { vehicle: "AS-04-DC-2290", cargoType: "medicine", priority: "critical", origin: "Tezpur", destination: "Itanagar", status: "delayed", etaMinutes: 240, progress: 18 },
      { vehicle: "ML-05-AC-3321", cargoType: "construction", priority: "normal", origin: "Shillong", destination: "Silchar", status: "delayed", etaMinutes: 320, progress: 12 },
      { vehicle: "AR-01-AB-5567", cargoType: "emergency", priority: "emergency", origin: "Itanagar", destination: "Seppa", status: "delayed", etaMinutes: 280, progress: 22, route: "Itanagar → Seppa via Tezpur (Emergency)" },
      { vehicle: "NL-01-AC-6654", cargoType: "food", priority: "normal", origin: "Dimapur", destination: "Kohima", status: "in_transit", etaMinutes: 75, progress: 61 },
      { vehicle: "MN-01-AA-3345", cargoType: "medicine", priority: "high", origin: "Kohima", destination: "Imphal", status: "in_transit", etaMinutes: 190, progress: 28, route: "Dimapur → Imphal (Fastest)" },
      { vehicle: "MZ-01-AB-2214", cargoType: "food", priority: "normal", origin: "Aizawl", destination: "Champhai", status: "in_transit", etaMinutes: 205, progress: 35, route: "Aizawl → Champhai (Safest)" },
      { vehicle: "SK-01-AA-8823", cargoType: "emergency", priority: "emergency", origin: "Gangtok", destination: "Mangan", status: "in_transit", etaMinutes: 88, progress: 47, route: "Gangtok → Mangan (Emergency)" },
      { vehicle: "TR-01-AC-9938", cargoType: "food", priority: "normal", origin: "Agartala", destination: "Dharmanagar", status: "in_transit", etaMinutes: 165, progress: 40 },
      { vehicle: "SK-02-AB-4471", cargoType: "medicine", priority: "high", origin: "Namchi", destination: "Gangtok", status: "in_transit", etaMinutes: 70, progress: 58 },
    ];

    let deliveryCount = 0;
    for (const d of deliverySpecs) {
      const vehicleId = vehicleIds[d.vehicle];
      if (!vehicleId) continue;

      await ctx.db.insert("deliveries", {
        vehicleId,
        cargoType: d.cargoType,
        priority: d.priority,
        origin: d.origin,
        destination: d.destination,
        status: d.status,
        estimatedArrival: now + d.etaMinutes * MINUTE,
        currentRouteId: d.route ? routeIds[d.route] : undefined,
        progress: d.progress,
        createdAt: now - 5 * HOUR,
        updatedAt: now - 10 * MINUTE,
      });
      deliveryCount++;
    }

    /* ------------------------------------------------------- incidents -- */
    const incidentSpecs: Array<{
      incidentType: IncidentType;
      description: string;
      severity: Severity;
      at: string;
      reportedBy: Id<"users">;
      road?: Id<"roads">;
      verified: boolean;
      status: "active" | "investigating" | "resolved";
      minutesAgo: number;
    }> = [
      {
        incidentType: "landslide",
        description:
          "Major slope failure across both carriageways approximately 14 km from Seppa. Debris depth 3-4 m over a 60 m stretch. Road impassable to all traffic; BRO clearing team requested.",
        severity: "critical",
        at: "Seppa",
        reportedBy: fieldKamengId,
        road: roadKey("NH-13", "Itanagar", "Seppa"),
        verified: true,
        status: "active",
        minutesAgo: 95,
      },
      {
        incidentType: "flood",
        description:
          "Waterlogging up to 0.6 m near the Umtrew bridge approach after 118 mm of overnight rainfall. Light vehicles turning back; heavy vehicles proceeding with caution.",
        severity: "high",
        at: "Nongpoh",
        reportedBy: fieldRiBhoiId,
        road: roadKey("NH-6", "Guwahati", "Shillong"),
        verified: true,
        status: "active",
        minutesAgo: 160,
      },
      {
        incidentType: "road_damage",
        description:
          "Shoulder collapse over a 25 m section on the Gangtok-bound carriageway. Single-lane alternating traffic in force.",
        severity: "high",
        at: "Mangan",
        reportedBy: adminId,
        road: roadKey("NH-310", "Gangtok", "Mangan"),
        verified: true,
        status: "active",
        minutesAgo: 240,
      },
      {
        incidentType: "traffic",
        description:
          "Convoy movement causing 45-minute delays between Kohima and Mao Gate. Expected to clear by evening.",
        severity: "medium",
        at: "Kohima",
        reportedBy: adminId,
        road: roadKey("NH-2A", "Kohima", "Imphal"),
        verified: false,
        status: "active",
        minutesAgo: 55,
      },
      {
        incidentType: "bridge_damage",
        description:
          "Bailey bridge approach showing settlement on the eastern abutment. Load restricted to 12 tonnes pending inspection.",
        severity: "high",
        at: "Tawang",
        reportedBy: fieldKamengId,
        road: roadKey("NH-13A", "Bomdila", "Tawang"),
        verified: true,
        status: "investigating",
        minutesAgo: 420,
      },
      {
        incidentType: "accident",
        description:
          "Two-vehicle collision near the Ukhrul turning. One lane obstructed, recovery vehicle en route.",
        severity: "medium",
        at: "Ukhrul",
        reportedBy: adminId,
        road: roadKey("NH-102", "Imphal", "Ukhrul"),
        verified: false,
        status: "active",
        minutesAgo: 35,
      },
      {
        incidentType: "landslide",
        description:
          "Minor debris slide cleared by state PWD. Both lanes restored to normal traffic.",
        severity: "low",
        at: "Aizawl",
        reportedBy: adminId,
        road: roadKey("NH-54", "Aizawl", "Lunglei"),
        verified: true,
        status: "resolved",
        minutesAgo: 1500,
      },
    ];

    const incidentIds: Id<"incidents">[] = [];
    for (const inc of incidentSpecs) {
      const loc = LOCATION_BY_NAME[inc.at];
      if (!loc) continue;
      const ts = now - inc.minutesAgo * MINUTE;

      const id = await ctx.db.insert("incidents", {
        incidentType: inc.incidentType,
        description: inc.description,
        severity: inc.severity,
        status: inc.status,
        latitude: loc.lat + 0.02,
        longitude: loc.lng + 0.02,
        locationName: inc.at,
        state: loc.state,
        district: loc.district,
        reportedBy: inc.reportedBy,
        roadId: inc.road,
        verified: inc.verified,
        verifiedBy: inc.verified ? adminId : undefined,
        verifiedAt: inc.verified ? ts + 12 * MINUTE : undefined,
        createdAt: ts,
        updatedAt: ts,
      });
      incidentIds.push(id);
    }

    /* ---------------------------------------------------------- alerts -- */
    const alertSpecs: Array<{
      title: string;
      message: string;
      alertType:
        | "road_blockage"
        | "severe_weather"
        | "landslide_risk"
        | "vehicle_delay"
        | "emergency"
        | "accessibility";
      severity: Severity;
      status: "active" | "acknowledged" | "resolved";
      at: string;
      recommendedAction: string;
      minutesAgo: number;
      incidentIndex?: number;
      road?: Id<"roads">;
      vehicle?: string;
    }> = [
      { title: "NH-13 blocked at Seppa approach", message: "Confirmed landslide has closed NH-13 between Itanagar and Seppa. East Kameng district is cut off from the Itanagar supply corridor.", alertType: "road_blockage", severity: "critical", status: "active", at: "Seppa", recommendedAction: "Divert all Seppa-bound consignments via Tezpur (Emergency Route). Notify BRO for clearance ETA.", minutesAgo: 92, incidentIndex: 0, road: roadKey("NH-13", "Itanagar", "Seppa") },
      { title: "Emergency medical convoy delayed", message: "Ambulance AR-01-AB-5567 carrying emergency medical supplies to Seppa is halted by the NH-13 closure.", alertType: "emergency", severity: "critical", status: "active", at: "Itanagar", recommendedAction: "Re-route via Tezpur immediately; consider air-lift if clearance exceeds six hours.", minutesAgo: 88, vehicle: "AR-01-AB-5567" },
      { title: "Red rainfall warning — East Kameng", message: "IMD red warning in force. 172 mm recorded in the last 24 hours with a further 90-120 mm forecast.", alertType: "severe_weather", severity: "critical", status: "active", at: "Seppa", recommendedAction: "Suspend non-essential movement in East Kameng until the warning is downgraded.", minutesAgo: 210 },
      { title: "Elevated landslide risk — Ri-Bhoi", message: "Risk model has raised NH-6 near Nongpoh to 68/100 on sustained rainfall and saturated slopes.", alertType: "landslide_risk", severity: "high", status: "active", at: "Nongpoh", recommendedAction: "Restrict heavy vehicles overnight; pre-position clearing equipment at Nongpoh.", minutesAgo: 155, road: roadKey("NH-6", "Guwahati", "Shillong") },
      { title: "NH-10 restricted — Gangtok corridor", message: "Single-lane alternating traffic on the Sikkim lifeline corridor following shoulder collapse near Mangan.", alertType: "accessibility", severity: "high", status: "active", at: "Gangtok", recommendedAction: "Advise operators of a 90-minute additional transit allowance.", minutesAgo: 235, road: roadKey("NH-310", "Gangtok", "Mangan") },
      { title: "Consignment ML-05 held at Shillong", message: "Construction consignment to Silchar delayed by restricted status on NH-6E.", alertType: "vehicle_delay", severity: "medium", status: "acknowledged", at: "Shillong", recommendedAction: "Hold until the Jaintia Hills stretch is downgraded to accessible.", minutesAgo: 300, vehicle: "ML-05-AC-3321" },
      { title: "Bridge load restriction — Tawang road", message: "Abutment settlement has forced a 12-tonne load cap on the Bomdila-Tawang bailey bridge.", alertType: "accessibility", severity: "high", status: "active", at: "Tawang", recommendedAction: "Reschedule loads above 12 t; inspection team due within 24 hours.", minutesAgo: 410, road: roadKey("NH-13A", "Bomdila", "Tawang") },
      { title: "Traffic congestion — Kohima", message: "Convoy movement adding 45 minutes to Kohima-Imphal transits.", alertType: "vehicle_delay", severity: "low", status: "acknowledged", at: "Kohima", recommendedAction: "No action required; monitor for escalation.", minutesAgo: 50 },
    ];

    let alertCount = 0;
    for (const a of alertSpecs) {
      const loc = LOCATION_BY_NAME[a.at];
      const ts = now - a.minutesAgo * MINUTE;

      await ctx.db.insert("alerts", {
        title: a.title,
        message: a.message,
        alertType: a.alertType,
        severity: a.severity,
        status: a.status,
        latitude: loc?.lat,
        longitude: loc?.lng,
        locationName: a.at,
        district: loc?.district,
        state: loc?.state,
        relatedIncidentId:
          a.incidentIndex !== undefined
            ? incidentIds[a.incidentIndex]
            : undefined,
        relatedVehicleId: a.vehicle ? vehicleIds[a.vehicle] : undefined,
        relatedRoadId: a.road,
        recommendedAction: a.recommendedAction,
        acknowledgedBy: a.status === "acknowledged" ? adminId : undefined,
        acknowledgedAt:
          a.status === "acknowledged" ? ts + 20 * MINUTE : undefined,
        createdAt: ts,
      });
      alertCount++;
    }

    /* ------------------------------------------------ risk predictions -- */
    const predictionSpecs: Array<{
      at: string;
      riskScore: number;
      predictedIssue: string;
      confidence: number;
      factors: Array<{ factor: string; weight: number }>;
      recommendedAction: string;
      road?: Id<"roads">;
      horizonHours: number;
    }> = [
      {
        at: "Seppa",
        riskScore: 91,
        predictedIssue: "Further slope failure on the Seppa approach",
        confidence: 88,
        factors: [
          { factor: "72h antecedent rainfall (172 mm)", weight: 34 },
          { factor: "Slope gradient above 38°", weight: 24 },
          { factor: "High landslide susceptibility zone", weight: 18 },
          { factor: "Three recorded failures in five years", weight: 12 },
          { factor: "Verified active incident on segment", weight: 12 },
        ],
        recommendedAction:
          "Keep NH-13 closed. Route all East Kameng consignments via Tezpur until rainfall drops below 20 mm/24h.",
        road: roadKey("NH-13", "Itanagar", "Seppa"),
        horizonHours: 24,
      },
      {
        at: "Nongpoh",
        riskScore: 74,
        predictedIssue: "Landslide risk on the Nongpoh cutting",
        confidence: 82,
        factors: [
          { factor: "Sustained rainfall (118 mm/24h)", weight: 31 },
          { factor: "Soil saturation index elevated", weight: 26 },
          { factor: "Cut-slope height above 12 m", weight: 19 },
          { factor: "Drainage condition rated poor", weight: 14 },
          { factor: "Active flooding incident nearby", weight: 10 },
        ],
        recommendedAction:
          "Restrict heavy vehicles on NH-6 overnight and pre-position clearing equipment at Nongpoh.",
        road: roadKey("NH-6", "Guwahati", "Shillong"),
        horizonHours: 24,
      },
      {
        at: "Gangtok",
        riskScore: 78,
        predictedIssue: "Debris flow onto the NH-10 lifeline corridor",
        confidence: 79,
        factors: [
          { factor: "Teesta valley rainfall (96 mm/24h)", weight: 29 },
          { factor: "Riverbank erosion proximity", weight: 25 },
          { factor: "Existing shoulder collapse on segment", weight: 22 },
          { factor: "Seasonal hazard rate peak (June-Sept)", weight: 15 },
        ],
        recommendedAction:
          "Maintain single-lane restriction and stage relief stock at Gangtok depot.",
        road: roadKey("NH-310", "Gangtok", "Mangan"),
        horizonHours: 72,
      },
      {
        at: "Tawang",
        riskScore: 69,
        predictedIssue: "Bridge approach settlement worsening",
        confidence: 74,
        factors: [
          { factor: "Abutment settlement observed", weight: 33 },
          { factor: "Freeze-thaw cycling at altitude", weight: 24 },
          { factor: "Load history above design threshold", weight: 21 },
          { factor: "Inspection overdue by 90 days", weight: 12 },
        ],
        recommendedAction:
          "Hold the 12 t cap and expedite structural inspection within 24 hours.",
        road: roadKey("NH-13A", "Bomdila", "Tawang"),
        horizonHours: 72,
      },
      {
        at: "Ukhrul",
        riskScore: 57,
        predictedIssue: "Surface washout on the Ukhrul road",
        confidence: 71,
        factors: [
          { factor: "Moderate rainfall (64 mm/24h)", weight: 28 },
          { factor: "Unsealed shoulder sections", weight: 23 },
          { factor: "Drainage capacity marginal", weight: 20 },
        ],
        recommendedAction:
          "Monitor. Advise operators to allow an additional 40 minutes of transit time.",
        road: roadKey("NH-102", "Imphal", "Ukhrul"),
        horizonHours: 72,
      },
      {
        at: "Champhai",
        riskScore: 43,
        predictedIssue: "Localised rockfall",
        confidence: 68,
        factors: [
          { factor: "Light rainfall accumulation", weight: 22 },
          { factor: "Weathered rock face on approach", weight: 21 },
        ],
        recommendedAction: "No restriction required. Continue routine monitoring.",
        road: roadKey("NH-306", "Aizawl", "Champhai"),
        horizonHours: 72,
      },
      {
        at: "Silchar",
        riskScore: 61,
        predictedIssue: "Barak valley flooding affecting approaches",
        confidence: 76,
        factors: [
          { factor: "River level above warning mark", weight: 30 },
          { factor: "Catchment rainfall (88 mm/24h)", weight: 26 },
          { factor: "Low elevation above drainage", weight: 20 },
        ],
        recommendedAction:
          "Pre-position food and medical stock at Silchar depot ahead of possible isolation.",
        road: roadKey("NH-6E", "Shillong", "Silchar"),
        horizonHours: 72,
      },
      {
        at: "Imphal",
        riskScore: 38,
        predictedIssue: "Traffic-driven delay on the Kohima corridor",
        confidence: 65,
        factors: [
          { factor: "Convoy scheduling overlap", weight: 24 },
          { factor: "Single-carriageway sections", weight: 18 },
        ],
        recommendedAction: "Stagger departures from Dimapur by 90 minutes.",
        road: roadKey("NH-2A", "Kohima", "Imphal"),
        horizonHours: 24,
      },
    ];

    let predictionCount = 0;
    for (const p of predictionSpecs) {
      const loc = LOCATION_BY_NAME[p.at];
      if (!loc) continue;

      await ctx.db.insert("riskPredictions", {
        locationName: p.at,
        latitude: loc.lat,
        longitude: loc.lng,
        state: loc.state,
        district: loc.district,
        riskScore: p.riskScore,
        riskLevel: riskLevelFromScore(p.riskScore),
        predictedIssue: p.predictedIssue,
        confidence: p.confidence,
        contributingFactors: p.factors,
        recommendedAction: p.recommendedAction,
        roadId: p.road,
        horizonHours: p.horizonHours,
        modelVersion: "heuristic-v0.1",
        createdAt: now - 45 * MINUTE,
      });
      predictionCount++;
    }

    /* --------------------------------------------------------- weather -- */
    const weatherSpecs: Array<{
      at: string;
      temperature: number;
      rainfall: number;
      humidity: number;
      condition: WeatherCondition;
      windSpeed: number;
      alertLevel: WeatherAlertLevel;
    }> = [
      { at: "Seppa", temperature: 21, rainfall: 172, humidity: 96, condition: "heavy_rain", windSpeed: 26, alertLevel: "red" },
      { at: "Nongpoh", temperature: 23, rainfall: 118, humidity: 93, condition: "heavy_rain", windSpeed: 19, alertLevel: "orange" },
      { at: "Gangtok", temperature: 17, rainfall: 96, humidity: 91, condition: "rain", windSpeed: 22, alertLevel: "orange" },
      { at: "Shillong", temperature: 20, rainfall: 74, humidity: 89, condition: "rain", windSpeed: 17, alertLevel: "yellow" },
      { at: "Silchar", temperature: 27, rainfall: 88, humidity: 92, condition: "thunderstorm", windSpeed: 24, alertLevel: "orange" },
      { at: "Itanagar", temperature: 24, rainfall: 61, humidity: 88, condition: "rain", windSpeed: 15, alertLevel: "yellow" },
      { at: "Tawang", temperature: 9, rainfall: 28, humidity: 78, condition: "fog", windSpeed: 31, alertLevel: "yellow" },
      { at: "Guwahati", temperature: 29, rainfall: 34, humidity: 81, condition: "cloudy", windSpeed: 12, alertLevel: "none" },
      { at: "Imphal", temperature: 25, rainfall: 42, humidity: 84, condition: "rain", windSpeed: 14, alertLevel: "yellow" },
      { at: "Aizawl", temperature: 22, rainfall: 39, humidity: 86, condition: "cloudy", windSpeed: 16, alertLevel: "none" },
      { at: "Kohima", temperature: 19, rainfall: 47, humidity: 87, condition: "rain", windSpeed: 18, alertLevel: "yellow" },
      { at: "Agartala", temperature: 31, rainfall: 12, humidity: 72, condition: "clear", windSpeed: 9, alertLevel: "none" },
      { at: "Ukhrul", temperature: 18, rainfall: 64, humidity: 90, condition: "rain", windSpeed: 20, alertLevel: "yellow" },
      { at: "Dibrugarh", temperature: 28, rainfall: 26, humidity: 79, condition: "cloudy", windSpeed: 11, alertLevel: "none" },
    ];

    let weatherCount = 0;
    for (const w of weatherSpecs) {
      const loc = LOCATION_BY_NAME[w.at];
      if (!loc) continue;

      // Two observations each so the table is a genuine time series.
      for (const [i, offset] of [3 * HOUR, 0].entries()) {
        await ctx.db.insert("weatherData", {
          locationName: w.at,
          latitude: loc.lat,
          longitude: loc.lng,
          temperature: w.temperature - (i === 0 ? 1 : 0),
          rainfall: i === 0 ? Math.round(w.rainfall * 0.72) : w.rainfall,
          humidity: w.humidity - (i === 0 ? 3 : 0),
          weatherCondition: w.condition,
          windSpeed: w.windSpeed,
          alertLevel: w.alertLevel,
          district: loc.district,
          state: loc.state,
          recordedAt: now - offset,
        });
        weatherCount++;
      }
    }

    /* ---------------------------------------------------- activity log -- */
    const activitySpecs: Array<{
      eventType:
        | "incident_reported"
        | "incident_verified"
        | "road_status_change"
        | "route_generated"
        | "alert_created"
        | "alert_acknowledged"
        | "risk_prediction"
        | "vehicle_movement"
        | "delivery_update"
        | "system";
      category: "logistics" | "incident" | "risk" | "alert" | "system";
      message: string;
      severity?: Severity;
      minutesAgo: number;
    }> = [
      { eventType: "system", category: "system", message: "NER Intelligence Network online — monitoring 8 states.", minutesAgo: 720 },
      { eventType: "risk_prediction", category: "risk", message: "Risk model flagged Tawang at 69/100 — bridge approach settlement worsening.", severity: "high", minutesAgo: 415 },
      { eventType: "incident_reported", category: "incident", message: "Bridge damage reported at Tawang, Tawang district.", severity: "high", minutesAgo: 420 },
      { eventType: "alert_created", category: "alert", message: "Bridge load restriction issued for the Bomdila–Tawang corridor.", severity: "high", minutesAgo: 410 },
      { eventType: "alert_acknowledged", category: "alert", message: "Alert acknowledged: Consignment ML-05 held at Shillong.", minutesAgo: 280 },
      { eventType: "road_status_change", category: "risk", message: "NH-310 Gangtok – Mangan Road marked restricted.", severity: "high", minutesAgo: 236 },
      { eventType: "system", category: "risk", message: "Red weather warning at Seppa — 172 mm rainfall in 24h.", severity: "critical", minutesAgo: 212 },
      { eventType: "incident_reported", category: "incident", message: "Flooding reported at Nongpoh, Ri-Bhoi.", severity: "high", minutesAgo: 160 },
      { eventType: "road_status_change", category: "risk", message: "NH-6 Jorabat – Shillong Highway marked restricted following reported flooding.", severity: "high", minutesAgo: 158 },
      { eventType: "risk_prediction", category: "risk", message: "Risk model flagged Nongpoh, Ri-Bhoi at 74/100 — landslide risk on the Nongpoh cutting.", severity: "high", minutesAgo: 150 },
      { eventType: "incident_reported", category: "incident", message: "Landslide reported at Seppa, East Kameng.", severity: "critical", minutesAgo: 95 },
      { eventType: "incident_verified", category: "incident", message: "Incident at Seppa verified by control room.", severity: "critical", minutesAgo: 93 },
      { eventType: "road_status_change", category: "risk", message: "NH-13 Itanagar – Seppa Road marked blocked following a reported landslide.", severity: "critical", minutesAgo: 92 },
      { eventType: "alert_created", category: "alert", message: "Critical alert raised for Seppa.", severity: "critical", minutesAgo: 92 },
      { eventType: "route_generated", category: "logistics", message: 'Route "Itanagar → Seppa (Fastest)" invalidated — it crosses the blocked NH-13.', severity: "high", minutesAgo: 90 },
      { eventType: "route_generated", category: "logistics", message: "Emergency route generated: Itanagar → Seppa via Tezpur (176 km, risk 47).", minutesAgo: 88 },
      { eventType: "vehicle_movement", category: "logistics", message: "Vehicle AR-01-AB-5567 entered a critical-risk zone.", severity: "critical", minutesAgo: 86 },
      { eventType: "delivery_update", category: "logistics", message: "Consignment to Seppa is now delayed.", severity: "high", minutesAgo: 84 },
      { eventType: "incident_reported", category: "incident", message: "Accident reported at Ukhrul, Ukhrul district.", severity: "medium", minutesAgo: 35 },
      { eventType: "vehicle_movement", category: "logistics", message: "Vehicle AS-01-NC-4412 entered a high-risk zone.", severity: "high", minutesAgo: 18 },
    ];

    for (const a of activitySpecs) {
      await ctx.db.insert("activityLog", {
        eventType: a.eventType,
        category: a.category,
        message: a.message,
        severity: a.severity,
        createdAt: now - a.minutesAgo * MINUTE,
      });
    }

    /* ------------------------------------------------ historical backfill */
    /**
     * Thirty days of prior operational history.
     *
     * Without this the time-range control has nothing to distinguish: every
     * seeded row lands inside the last day, so 24h / 7d / 30d all return the
     * same figures and the trend charts are a flat line. These are resolved
     * incidents and their matching log entries and risk snapshots, spread
     * deterministically across the month so the analytics have real shape.
     *
     * Generation is seeded from the day index, not `Math.random`, so a
     * re-seed reproduces the same history.
     */
    const HISTORY_DAYS = 30;
    const historyLocations = [
      "Nongpoh", "Seppa", "Gangtok", "Tawang", "Ukhrul",
      "Silchar", "Champhai", "Mangan", "Kohima", "Imphal",
    ];
    const historyTypes: IncidentType[] = [
      "landslide", "flood", "road_damage", "traffic", "accident",
    ];
    const historySeverities: Severity[] = ["low", "medium", "high", "critical"];

    let historicalIncidents = 0;

    for (let day = HISTORY_DAYS; day >= 2; day--) {
      const dayStart = now - day * 24 * HOUR;
      // 0-2 incidents per day, weighted so the monsoon peak sits mid-window.
      const monsoonWeight = 1 - Math.abs(day - 15) / 15;
      const rolls = Math.floor(seededRandom(day * 7) * 2.2 + monsoonWeight);

      for (let n = 0; n < rolls; n++) {
        const pick = seededRandom(day * 31 + n * 13);
        const loc =
          LOCATION_BY_NAME[
            historyLocations[Math.floor(pick * historyLocations.length)]
          ];
        if (!loc) continue;

        const type =
          historyTypes[Math.floor(seededRandom(day * 17 + n) * historyTypes.length)];
        const severity =
          historySeverities[
            Math.floor(seededRandom(day * 23 + n * 5) * historySeverities.length)
          ];
        const ts = dayStart + Math.floor(seededRandom(day + n) * 20 * HOUR);

        await ctx.db.insert("incidents", {
          incidentType: type,
          description: `Historical ${type.replace(/_/g, " ")} recorded near ${loc.name}. Cleared by state PWD; retained for pattern analysis.`,
          severity,
          status: "resolved",
          latitude: loc.lat + 0.01,
          longitude: loc.lng + 0.01,
          locationName: loc.name,
          state: loc.state,
          district: loc.district,
          reportedBy: adminId,
          verified: true,
          verifiedBy: adminId,
          verifiedAt: ts + 30 * MINUTE,
          createdAt: ts,
          updatedAt: ts + 6 * HOUR,
        });
        historicalIncidents++;

        await ctx.db.insert("activityLog", {
          eventType: "incident_resolved",
          category: "incident",
          message: `${type.replace(/_/g, " ")} at ${loc.name} resolved.`,
          severity,
          createdAt: ts + 6 * HOUR,
        });
      }

      // A daily risk snapshot for two corridors, so the average-risk trend
      // has a real series rather than one point.
      for (const name of ["Nongpoh", "Seppa"]) {
        const loc = LOCATION_BY_NAME[name];
        if (!loc) continue;
        const base = name === "Seppa" ? 55 : 40;
        const score = Math.round(
          Math.min(95, base + monsoonWeight * 30 + seededRandom(day * 3) * 12),
        );
        await ctx.db.insert("riskPredictions", {
          locationName: loc.name,
          latitude: loc.lat,
          longitude: loc.lng,
          state: loc.state,
          district: loc.district,
          riskScore: score,
          riskLevel: riskLevelFromScore(score),
          predictedIssue: "Historical daily risk snapshot",
          confidence: 70,
          contributingFactors: [
            { factor: "Seasonal rainfall pattern", weight: 20 },
            { factor: "Terrain susceptibility", weight: 12 },
          ],
          recommendedAction: "Archived snapshot retained for trend analysis.",
          horizonHours: 24,
          modelVersion: "historical-backfill",
          createdAt: dayStart + 6 * HOUR,
        });
      }
    }

    /* -------------------------------------------------------- bookkeeping */
    const counts = {
      users: USERS.length,
      roads: Object.keys(roadIds).length,
      routes: Object.keys(routeIds).length,
      vehicles: Object.keys(vehicleIds).length,
      incidents: incidentIds.length,
      alerts: alertCount,
      deliveries: deliveryCount,
      riskPredictions: predictionCount,
      weatherData: weatherCount,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        version: SEED_VERSION,
        seededAt: now,
        counts,
      });
    } else {
      await ctx.db.insert("seedMeta", {
        key: SEED_KEY,
        version: SEED_VERSION,
        seededAt: now,
        counts,
      });
    }

    return {
      status: "seeded" as const,
      message: `Demo data created, including ${historicalIncidents} historical incident(s) spread across the last 30 days.`,
      seededAt: now,
      counts,
      historicalIncidents,
    };
  },
});

/**
 * Wipe every application table. Development convenience only — it exists so
 * the seed can be re-run cleanly before a rehearsal.
 */
export const clearAll = mutation({
  args: { confirm: v.literal("DELETE_ALL_DATA") },
  handler: async (ctx) => {
    const tables = [
      "activityLog",
      "weatherData",
      "riskPredictions",
      "deliveries",
      "alerts",
      "incidents",
      "routes",
      "vehicles",
      "roads",
      "users",
      "seedMeta",
    ] as const;

    const deleted: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) await ctx.db.delete(row._id);
      deleted[table] = rows.length;
    }

    return { status: "cleared" as const, deleted };
  },
});

/**
 * Live readiness of the demo dataset.
 *
 * A query, not a mutation, so the demo console subscribes to it and enables
 * or disables the simulation controls reactively — the controls that depend
 * on seeded data are never clickable against an empty database.
 */
export const seedStatus = query({
  args: {},
  handler: async (ctx) => {
    const meta = await ctx.db
      .query("seedMeta")
      .withIndex("by_key", (q) => q.eq("key", SEED_KEY))
      .unique();

    const [anyRoad, anyUser, anyVehicle, fieldOfficer, nh6] = await Promise.all(
      [
        ctx.db.query("roads").first(),
        ctx.db.query("users").first(),
        ctx.db.query("vehicles").first(),
        ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "field_officer"))
          .first(),
        ctx.db
          .query("roads")
          .withIndex("by_roadNumber", (q) => q.eq("roadNumber", "NH-6"))
          .first(),
      ],
    );

    return {
      seededAt: meta?.seededAt ?? null,
      version: meta?.version ?? null,
      counts: meta?.counts ?? null,
      hasRoads: anyRoad !== null,
      hasUsers: anyUser !== null,
      hasVehicles: anyVehicle !== null,
      /** `triggerIncident` needs a field officer to attribute the report to. */
      canTriggerIncident: fieldOfficer !== null,
      /** `escalateRisk` defaults to the NH-6 corridor. */
      canEscalateRisk: nh6 !== null,
      /** Everything the demo console needs is in place. */
      ready:
        anyRoad !== null &&
        anyUser !== null &&
        anyVehicle !== null &&
        fieldOfficer !== null &&
        nh6 !== null,
    };
  },
});
