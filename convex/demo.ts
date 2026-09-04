import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { LOCATION_BY_NAME } from "./lib/constants";
import { runRiskAssessment } from "./riskEngine";
import { weatherAlertLevel } from "./lib/validators";
import {
  bearingDegrees,
  haversineKm,
  interpolate,
  logActivity,
  riskLevelFromScore,
  MINUTE,
} from "./lib/helpers";

/**
 * Demo simulation controls for the SIH presentation.
 *
 * Every control here writes to the real database through real mutations. The
 * dashboard updates because Convex re-runs the subscribed queries, not
 * because anything on the frontend is animating a local array. Pulling the
 * dashboard up in a second browser window shows the same changes at the same
 * time — which is the point worth demonstrating to judges.
 */

/* ------------------------------------------------------ vehicle movement */

/**
 * Advance every moving vehicle one step along the great-circle line toward
 * its destination. Called on a short interval while the simulation is armed.
 */
export const tickVehicles = mutation({
  args: { stepFraction: v.optional(v.number()) },
  handler: async (ctx, { stepFraction = 0.06 }) => {
    const vehicles = await ctx.db.query("vehicles").collect();
    const now = Date.now();
    let moved = 0;

    for (const vehicle of vehicles) {
      if (vehicle.status === "idle" || vehicle.status === "offline") continue;

      const dest = LOCATION_BY_NAME[vehicle.destination];
      if (!dest) continue;

      const remainingKm = haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        dest.lat,
        dest.lng,
      );

      // Arrived: hold position and mark idle rather than overshooting.
      if (remainingKm < 3) {
        await ctx.db.patch(vehicle._id, {
          status: "idle",
          speed: 0,
          lastUpdated: now,
        });
        continue;
      }

      const next = interpolate(
        vehicle.latitude,
        vehicle.longitude,
        dest.lat,
        dest.lng,
        stepFraction,
      );

      await ctx.db.patch(vehicle._id, {
        latitude: next.lat,
        longitude: next.lng,
        heading: Math.round(
          bearingDegrees(next.lat, next.lng, dest.lat, dest.lng),
        ),
        // Delayed vehicles crawl; everything else runs at a plausible speed.
        speed:
          vehicle.status === "delayed"
            ? Math.round(8 + (remainingKm % 5))
            : Math.round(34 + (remainingKm % 22)),
        lastUpdated: now,
      });
      moved++;
    }

    return { moved };
  },
});

/* ------------------------------------------------------- risk escalation */

/**
 * Raise a road's risk score and record the model's reasoning.
 *
 * Defaults to the NH-6 Nongpoh cutting, which is the corridor the seeded
 * scenario has been building pressure on.
 */
export const escalateRisk = mutation({
  args: {
    roadId: v.optional(v.id("roads")),
    increaseBy: v.optional(v.number()),
  },
  handler: async (ctx, { roadId, increaseBy = 14 }) => {
    const road = roadId
      ? await ctx.db.get(roadId)
      : (
          await ctx.db
            .query("roads")
            .withIndex("by_roadNumber", (q) => q.eq("roadNumber", "NH-6"))
            .collect()
        )[0];

    if (!road) throw new Error("No road available to escalate");

    const previousLevel = road.riskLevel;
    const nextScore = Math.min(100, road.riskScore + increaseBy);
    const nextLevel = riskLevelFromScore(nextScore);
    const now = Date.now();

    await ctx.db.patch(road._id, {
      riskScore: nextScore,
      riskLevel: nextLevel,
      accessibilityStatus:
        nextLevel === "critical" ? "blocked" : road.accessibilityStatus,
      lastUpdated: now,
    });

    await ctx.db.insert("riskPredictions", {
      locationName: road.roadName,
      latitude: road.startLatitude,
      longitude: road.startLongitude,
      state: road.state,
      district: road.district,
      riskScore: nextScore,
      riskLevel: nextLevel,
      predictedIssue:
        nextLevel === "critical"
          ? "Imminent slope failure"
          : "Rising landslide probability",
      confidence: Math.min(95, 68 + Math.round(nextScore / 6)),
      contributingFactors: [
        { factor: "Rainfall intensity rising", weight: 32 },
        { factor: "Soil saturation index elevated", weight: 27 },
        { factor: "Slope gradient above threshold", weight: 21 },
        { factor: "Recent field reports on segment", weight: 20 },
      ],
      recommendedAction:
        nextLevel === "critical"
          ? `Close ${road.roadNumber} and divert all traffic to the safest alternative.`
          : `Restrict heavy vehicles on ${road.roadNumber} and pre-position clearing equipment.`,
      roadId: road._id,
      horizonHours: 24,
      modelVersion: "heuristic-v0.1",
      createdAt: now,
    });

    await logActivity(ctx, {
      eventType: "road_risk_change",
      category: "risk",
      message: `${road.roadNumber} risk rose from ${Math.round(road.riskScore)} to ${Math.round(nextScore)} — now ${nextLevel}.`,
      severity: nextLevel === "critical" ? "critical" : "high",
      relatedRoadId: road._id,
    });

    // Only raise an alert when the band actually changes, so repeated ticks
    // do not spam the alert centre.
    if (previousLevel !== nextLevel && (nextLevel === "high" || nextLevel === "critical")) {
      const alertId = await ctx.db.insert("alerts", {
        title: `${road.roadNumber} risk escalated to ${nextLevel}`,
        message: `Risk model has raised ${road.roadName} to ${Math.round(nextScore)}/100 on rising rainfall and slope saturation.`,
        alertType: "landslide_risk",
        severity: nextLevel === "critical" ? "critical" : "high",
        status: "active",
        latitude: road.startLatitude,
        longitude: road.startLongitude,
        locationName: road.roadName,
        district: road.district,
        state: road.state,
        relatedRoadId: road._id,
        recommendedAction:
          nextLevel === "critical"
            ? "Close the corridor and activate the alternative route."
            : "Restrict heavy vehicles and monitor for further degradation.",
        createdAt: now,
      });

      await logActivity(ctx, {
        eventType: "alert_created",
        category: "alert",
        message: `Predictive alert raised for ${road.roadName}.`,
        severity: nextLevel === "critical" ? "critical" : "high",
        relatedAlertId: alertId,
        relatedRoadId: road._id,
      });
    }

    return {
      roadNumber: road.roadNumber,
      previousScore: road.riskScore,
      nextScore,
      previousLevel,
      nextLevel,
    };
  },
});

/* ----------------------------------------------------- incident trigger */

/**
 * File a critical field report and run the full cascade: the road blocks,
 * routes crossing it are invalidated, affected vehicles are flagged, and an
 * alert is raised. This is the centrepiece of the live demonstration.
 */
export const triggerIncident = mutation({
  args: {
    locationName: v.optional(v.string()),
    roadNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const locationName = args.locationName ?? "Nongpoh";
    const roadNumber = args.roadNumber ?? "NH-6";
    const location = LOCATION_BY_NAME[locationName];
    if (!location) throw new Error(`Unknown location: ${locationName}`);

    const reporter = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "field_officer"))
      .first();
    if (!reporter) {
      throw new Error("No field officer found — run the seed first.");
    }

    const roads = await ctx.db
      .query("roads")
      .withIndex("by_roadNumber", (q) => q.eq("roadNumber", roadNumber))
      .collect();
    const road = roads[0];

    const now = Date.now();

    const incidentId = await ctx.db.insert("incidents", {
      incidentType: "landslide",
      description:
        "Slope failure across the carriageway following sustained rainfall. Debris over a 40 m stretch; road impassable to heavy vehicles. Clearing team requested.",
      severity: "critical",
      status: "active",
      latitude: location.lat + 0.015,
      longitude: location.lng + 0.015,
      locationName,
      state: location.state,
      district: location.district,
      reportedBy: reporter._id,
      roadId: road?._id,
      verified: true,
      verifiedBy: reporter._id,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      eventType: "incident_reported",
      category: "incident",
      message: `Landslide reported at ${locationName}, ${location.district}.`,
      severity: "critical",
      relatedIncidentId: incidentId,
      relatedRoadId: road?._id,
    });

    await logActivity(ctx, {
      eventType: "incident_verified",
      category: "incident",
      message: `Incident at ${locationName} verified by control room.`,
      severity: "critical",
      relatedIncidentId: incidentId,
    });

    let vehiclesAffected = 0;
    let routesInvalidated = 0;

    if (road) {
      // Hard override — a confirmed landslide is not a probability.
      await ctx.db.patch(road._id, {
        riskScore: 100,
        riskLevel: "critical",
        accessibilityStatus: "blocked",
        lastUpdated: now,
      });

      await logActivity(ctx, {
        eventType: "road_status_change",
        category: "risk",
        message: `${road.roadNumber} ${road.roadName} marked blocked following a reported landslide.`,
        severity: "critical",
        relatedRoadId: road._id,
        relatedIncidentId: incidentId,
      });

      // Any route crossing the blocked segment is no longer viable.
      const routes = await ctx.db.query("routes").collect();
      for (const route of routes) {
        if (route.status !== "blocked" && route.roadIds?.includes(road._id)) {
          await ctx.db.patch(route._id, { status: "blocked", updatedAt: now });
          routesInvalidated++;

          await logActivity(ctx, {
            eventType: "route_generated",
            category: "logistics",
            message: `Route "${route.name}" invalidated — it crosses the blocked ${road.roadNumber}.`,
            severity: "high",
            relatedRoadId: road._id,
          });

          // Promote an alternative for the same corridor, if one exists.
          const alternative = routes.find(
            (r) =>
              r._id !== route._id &&
              r.origin === route.origin &&
              r.destination === route.destination &&
              r.status === "alternative",
          );
          if (alternative) {
            await ctx.db.patch(alternative._id, {
              status: "active",
              updatedAt: now,
            });
            await logActivity(ctx, {
              eventType: "route_generated",
              category: "logistics",
              message: `Alternative route activated: ${alternative.name} (${Math.round(alternative.distance)} km, risk ${Math.round(alternative.riskScore)}).`,
              relatedRoadId: road._id,
            });
          }
        }
      }

      // Flag vehicles within ~40 km of the failure.
      const vehicles = await ctx.db.query("vehicles").collect();
      for (const vehicle of vehicles) {
        const distance = haversineKm(
          vehicle.latitude,
          vehicle.longitude,
          location.lat,
          location.lng,
        );
        if (distance <= 40 && vehicle.riskLevel !== "critical") {
          await ctx.db.patch(vehicle._id, {
            riskLevel: "critical",
            status: vehicle.status === "idle" ? "idle" : "delayed",
            speed: 0,
            lastUpdated: now,
          });
          vehiclesAffected++;

          await logActivity(ctx, {
            eventType: "vehicle_movement",
            category: "logistics",
            message: `Vehicle ${vehicle.vehicleNumber} halted — ${Math.round(distance)} km from the ${locationName} blockage.`,
            severity: "critical",
            relatedVehicleId: vehicle._id,
          });
        }
      }
    }

    const alertId = await ctx.db.insert("alerts", {
      title: `Landslide — ${roadNumber} blocked at ${locationName}`,
      message: `Confirmed landslide has closed ${roadNumber} at ${locationName}. ${vehiclesAffected} vehicle(s) affected, ${routesInvalidated} route(s) invalidated.`,
      alertType: "road_blockage",
      severity: "critical",
      status: "active",
      latitude: location.lat,
      longitude: location.lng,
      locationName,
      district: location.district,
      state: location.state,
      relatedIncidentId: incidentId,
      relatedRoadId: road?._id,
      recommendedAction:
        "Divert all affected consignments to the activated alternative route and request clearance ETA.",
      createdAt: now,
    });

    await logActivity(ctx, {
      eventType: "alert_created",
      category: "alert",
      message: `Critical alert raised for ${locationName}.`,
      severity: "critical",
      relatedAlertId: alertId,
      relatedIncidentId: incidentId,
    });

    return {
      incidentId,
      alertId,
      roadNumber,
      locationName,
      vehiclesAffected,
      routesInvalidated,
    };
  },
});

/* -------------------------------------------------------------- restore */

/**
 * Return the scenario corridors and vehicles to their pre-demo state so the
 * presentation can be run again without re-seeding the whole database.
 */
export const resetScenario = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - 30 * MINUTE;

    // Remove only what the simulation itself created in the last 30 minutes.
    const recentIncidents = await ctx.db.query("incidents").collect();
    let removedIncidents = 0;
    for (const incident of recentIncidents) {
      if (incident.createdAt > cutoff) {
        await ctx.db.delete(incident._id);
        removedIncidents++;
      }
    }

    const recentAlerts = await ctx.db.query("alerts").collect();
    let removedAlerts = 0;
    for (const alert of recentAlerts) {
      if (alert.createdAt > cutoff) {
        await ctx.db.delete(alert._id);
        removedAlerts++;
      }
    }

    const recentPredictions = await ctx.db.query("riskPredictions").collect();
    for (const prediction of recentPredictions) {
      if (prediction.createdAt > cutoff) await ctx.db.delete(prediction._id);
    }

    const recentActivity = await ctx.db.query("activityLog").collect();
    for (const entry of recentActivity) {
      if (entry.createdAt > cutoff) await ctx.db.delete(entry._id);
    }

    // Restore the NH-6 corridor to its seeded baseline.
    const nh6 = (
      await ctx.db
        .query("roads")
        .withIndex("by_roadNumber", (q) => q.eq("roadNumber", "NH-6"))
        .collect()
    )[0];
    if (nh6) {
      await ctx.db.patch(nh6._id, {
        riskScore: 68,
        riskLevel: riskLevelFromScore(68),
        accessibilityStatus: "restricted",
        lastUpdated: now,
      });
    }

    // Reactivate the primary Guwahati → Shillong route, demote its backup.
    const routes = await ctx.db.query("routes").collect();
    for (const route of routes) {
      if (route.name === "Guwahati → Shillong (Fastest)") {
        await ctx.db.patch(route._id, { status: "active", updatedAt: now });
      }
      if (route.name === "Guwahati → Shillong via Nongpoh (Safest)") {
        await ctx.db.patch(route._id, { status: "alternative", updatedAt: now });
      }
    }

    await logActivity(ctx, {
      eventType: "system",
      category: "system",
      message: "Demo scenario reset to baseline.",
      createdAt: now,
    });

    return { removedIncidents, removedAlerts };
  },
});

/* ------------------------------------------------- risk-engine scenario */

/**
 * Raise rainfall at a location and let the risk engine react.
 *
 * This is steps 1-7 of the Phase 5 demonstration in one call: a new weather
 * observation lands, the engine re-scores the location, the road may change
 * accessibility, and an alert is raised if the band crosses into high or
 * critical. Nothing is faked — the mutation writes a real observation and the
 * engine reads it back through its normal path.
 */
export const simulateRainfall = mutation({
  args: {
    locationName: v.optional(v.string()),
    rainfallMm: v.optional(v.number()),
    alertLevel: v.optional(weatherAlertLevel),
  },
  handler: async (ctx, args) => {
    const locationName = args.locationName ?? "Nongpoh";
    const location = LOCATION_BY_NAME[locationName];
    if (!location) throw new Error(`Unknown location: ${locationName}`);

    const previous = (
      await ctx.db
        .query("riskPredictions")
        .withIndex("by_district", (q) => q.eq("district", location.district))
        .collect()
    )
      .filter((p) => p.locationName === locationName)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    const rainfallMm = args.rainfallMm ?? 165;
    const alertLevel =
      args.alertLevel ?? (rainfallMm >= 150 ? "red" : rainfallMm >= 100 ? "orange" : "yellow");

    const now = Date.now();
    await ctx.db.insert("weatherData", {
      locationName,
      latitude: location.lat,
      longitude: location.lng,
      temperature: 21,
      rainfall: rainfallMm,
      humidity: 95,
      weatherCondition: rainfallMm >= 100 ? "heavy_rain" : "rain",
      windSpeed: 24,
      alertLevel,
      district: location.district,
      state: location.state,
      recordedAt: now,
    });

    await logActivity(ctx, {
      eventType: "system",
      category: "risk",
      message: `Rainfall at ${locationName} rose to ${Math.round(rainfallMm)} mm/24h (${alertLevel} warning).`,
      severity: alertLevel === "red" ? "critical" : "high",
      createdAt: now,
    });

    const [assessment] = await runRiskAssessment(ctx, {
      locationNames: [locationName],
    });

    return {
      locationName,
      rainfallMm,
      alertLevel,
      previousScore: previous?.riskScore ?? null,
      previousLevel: previous?.riskLevel ?? null,
      nextScore: assessment?.riskScore ?? null,
      nextLevel: assessment?.riskLevel ?? null,
      predictedIssue: assessment?.predictedIssue ?? null,
      confidence: assessment?.confidence ?? null,
      roadNumber: assessment?.roadNumber ?? null,
      accessibilityChanged: assessment?.accessibilityChanged ?? false,
      alertRaised: assessment?.alertRaised ?? false,
    };
  },
});

/* ------------------------------------------------- GPS simulation reset */

/**
 * Return every vehicle to the origin of its active consignment.
 *
 * A genuine reset for repeated rehearsals: positions come from the delivery's
 * `origin` resolved through the location table, so vehicles restart where
 * their journey actually began rather than at an arbitrary point. Vehicles
 * with no active consignment are left where they are.
 */
export const resetVehiclePositions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [vehicles, deliveries] = await Promise.all([
      ctx.db.query("vehicles").collect(),
      ctx.db.query("deliveries").collect(),
    ]);

    let moved = 0;
    for (const vehicle of vehicles) {
      const delivery = deliveries.find(
        (d) =>
          d.vehicleId === vehicle._id &&
          d.status !== "delivered" &&
          d.status !== "cancelled",
      );
      const origin = delivery ? LOCATION_BY_NAME[delivery.origin] : undefined;
      const dest = LOCATION_BY_NAME[vehicle.destination];
      if (!origin) continue;

      // Small deterministic offset so markers do not stack at the depot.
      const jitter = (vehicles.indexOf(vehicle) % 7) * 0.012 - 0.036;

      await ctx.db.patch(vehicle._id, {
        latitude: origin.lat + jitter,
        longitude: origin.lng + jitter,
        speed: 0,
        heading: dest
          ? Math.round(
              bearingDegrees(origin.lat, origin.lng, dest.lat, dest.lng),
            )
          : vehicle.heading,
        status: vehicle.status === "offline" ? "offline" : "active",
        lastUpdated: now,
      });
      moved += 1;
    }

    await logActivity(ctx, {
      eventType: "system",
      category: "system",
      message: `GPS simulation reset — ${moved} vehicle(s) returned to origin.`,
      createdAt: now,
    });

    return { moved };
  },
});
