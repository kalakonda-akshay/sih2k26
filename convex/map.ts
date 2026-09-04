import { query } from "./_generated/server";
import { RISK_RANK, SEVERITY_RANK } from "./lib/helpers";

/**
 * Everything the Live Intelligence Map renders, in a single reactive query.
 *
 * One subscription rather than five means one websocket channel and one
 * consistent snapshot — the vehicle layer can never be showing a world the
 * road layer disagrees with. Convex re-runs this whenever any table it
 * touched changes, which is the whole of the map's real-time behaviour: there
 * is no polling and no refetch anywhere on the client.
 *
 * Filtering is deliberately left to the client. The whole NER working set is
 * a few hundred documents, so shipping it once and filtering in memory is
 * faster and more responsive than a round trip per filter change.
 */
export const getIntelligence = query({
  args: {},
  handler: async (ctx) => {
    const [vehicles, incidents, roads, predictions, weather] =
      await Promise.all([
        ctx.db.query("vehicles").collect(),
        ctx.db
          .query("incidents")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db
          .query("weatherData")
          .withIndex("by_recordedAt")
          .order("desc")
          .take(200),
      ]);

    /** Guard against a bad telemetry write putting a marker in the ocean. */
    const validPoint = (lat: number, lng: number) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    // Predictions are append-only; the map shows the newest per location.
    const latestPrediction = new Map<string, (typeof predictions)[number]>();
    for (const p of predictions) {
      const existing = latestPrediction.get(p.locationName);
      if (!existing || p.createdAt > existing.createdAt) {
        latestPrediction.set(p.locationName, p);
      }
    }

    // Weather is a time series; the map shows the newest per location.
    const latestWeather = new Map<string, (typeof weather)[number]>();
    for (const w of weather) {
      if (!latestWeather.has(w.locationName)) latestWeather.set(w.locationName, w);
    }

    const states = new Set<string>();
    const districtsByState = new Map<string, Set<string>>();
    const addFacet = (state?: string, district?: string) => {
      if (!state) return;
      states.add(state);
      if (!districtsByState.has(state)) districtsByState.set(state, new Set());
      if (district) districtsByState.get(state)!.add(district);
    };

    for (const r of roads) addFacet(r.state, r.district);
    for (const i of incidents) addFacet(i.state, i.district);
    for (const p of predictions) addFacet(p.state, p.district);

    return {
      vehicles: vehicles
        .filter((v) => validPoint(v.latitude, v.longitude))
        .map((v) => ({
          _id: v._id,
          vehicleNumber: v.vehicleNumber,
          vehicleType: v.vehicleType,
          cargoType: v.cargoType,
          status: v.status,
          latitude: v.latitude,
          longitude: v.longitude,
          speed: v.speed,
          heading: v.heading,
          destination: v.destination,
          riskLevel: v.riskLevel,
          driverName: v.driverName,
          driverPhone: v.driverPhone,
          lastUpdated: v.lastUpdated,
        })),

      incidents: incidents
        .filter((i) => validPoint(i.latitude, i.longitude))
        .map((i) => ({
          _id: i._id,
          incidentType: i.incidentType,
          description: i.description,
          severity: i.severity,
          status: i.status,
          latitude: i.latitude,
          longitude: i.longitude,
          locationName: i.locationName,
          district: i.district,
          state: i.state,
          verified: i.verified,
          createdAt: i.createdAt,
        }))
        .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),

      roads: roads.map((r) => ({
        _id: r._id,
        roadName: r.roadName,
        roadNumber: r.roadNumber,
        state: r.state,
        district: r.district,
        accessibilityStatus: r.accessibilityStatus,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
        startLatitude: r.startLatitude,
        startLongitude: r.startLongitude,
        endLatitude: r.endLatitude,
        endLongitude: r.endLongitude,
        geometry: r.geometry,
        lengthKm: r.lengthKm,
        lastUpdated: r.lastUpdated,
      })),

      predictions: [...latestPrediction.values()]
        .filter((p) => validPoint(p.latitude, p.longitude))
        .map((p) => ({
          _id: p._id,
          locationName: p.locationName,
          latitude: p.latitude,
          longitude: p.longitude,
          state: p.state,
          district: p.district,
          riskScore: p.riskScore,
          riskLevel: p.riskLevel,
          predictedIssue: p.predictedIssue,
          confidence: p.confidence,
          contributingFactors: p.contributingFactors,
          recommendedAction: p.recommendedAction,
          horizonHours: p.horizonHours,
          createdAt: p.createdAt,
        }))
        .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]),

      weather: [...latestWeather.values()]
        .filter((w) => validPoint(w.latitude, w.longitude))
        .map((w) => ({
          _id: w._id,
          locationName: w.locationName,
          latitude: w.latitude,
          longitude: w.longitude,
          temperature: w.temperature,
          rainfall: w.rainfall,
          humidity: w.humidity,
          weatherCondition: w.weatherCondition,
          windSpeed: w.windSpeed,
          alertLevel: w.alertLevel,
          district: w.district,
          state: w.state,
          recordedAt: w.recordedAt,
        })),

      facets: {
        states: [...states].sort(),
        districtsByState: Object.fromEntries(
          [...districtsByState.entries()].map(([s, d]) => [s, [...d].sort()]),
        ),
      },
    };
  },
});
