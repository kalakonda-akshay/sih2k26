import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity, riskLevelFromScore, SEVERITY_RANK } from "./lib/helpers";
import { runRiskAssessmentNear } from "./riskEngine";
import {
  incidentStatus,
  incidentType,
  severity as severityValidator,
} from "./lib/validators";

export const listActiveIncidents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    incidents.sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return s !== 0 ? s : b.createdAt - a.createdAt;
    });

    return limit ? incidents.slice(0, limit) : incidents;
  },
});

/** All incidents regardless of status — used by the incident centre. */
export const listIncidents = query({
  args: {
    status: v.optional(incidentStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const incidents = status
      ? await ctx.db
          .query("incidents")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("incidents").collect();

    incidents.sort((a, b) => b.createdAt - a.createdAt);
    return limit ? incidents.slice(0, limit) : incidents;
  },
});

export const getIncident = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, { incidentId }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident) return null;

    // Resolve references so the detail panel needs a single round trip.
    const [reporter, road] = await Promise.all([
      ctx.db.get(incident.reportedBy),
      incident.roadId ? ctx.db.get(incident.roadId) : Promise.resolve(null),
    ]);

    const imageUrl = incident.imageStorageId
      ? await ctx.storage.getUrl(incident.imageStorageId)
      : null;

    return { ...incident, reporter, road, imageUrl };
  },
});

export const getIncidentsByDistrict = query({
  args: {
    district: v.string(),
    status: v.optional(incidentStatus),
  },
  handler: async (ctx, { district, status }) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_district", (q) => q.eq("district", district))
      .collect();

    const filtered = status
      ? incidents.filter((i) => i.status === status)
      : incidents;

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * File a field report.
 *
 * This is the head of the demo cascade. A high or critical report does three
 * things beyond inserting a row: it degrades the affected road, it raises an
 * alert, and it writes to the activity feed. Every dashboard panel subscribed
 * to those tables re-renders on its own — there is no push code anywhere.
 */
export const createIncident = mutation({
  args: {
    incidentType: incidentType,
    description: v.string(),
    severity: severityValidator,
    latitude: v.number(),
    longitude: v.number(),
    locationName: v.string(),
    state: v.string(),
    district: v.string(),
    reportedBy: v.id("users"),
    imageStorageId: v.optional(v.id("_storage")),
    roadId: v.optional(v.id("roads")),
    clientUuid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Offline-sync idempotency: a replayed report must not duplicate.
    if (args.clientUuid) {
      const existing = await ctx.db
        .query("incidents")
        .withIndex("by_clientUuid", (q) => q.eq("clientUuid", args.clientUuid))
        .unique();
      if (existing) return existing._id;
    }

    const now = Date.now();
    const incidentId = await ctx.db.insert("incidents", {
      ...args,
      status: "active",
      verified: false,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      eventType: "incident_reported",
      category: "incident",
      message: `${labelForIncident(args.incidentType)} reported at ${args.locationName}, ${args.district}.`,
      severity: args.severity,
      relatedIncidentId: incidentId,
      relatedRoadId: args.roadId,
    });

    const isSerious =
      args.severity === "high" || args.severity === "critical";

    if (isSerious && args.roadId) {
      const road = await ctx.db.get(args.roadId);
      if (road) {
        const nextScore = args.severity === "critical" ? 100 : 78;
        const nextAccess =
          args.severity === "critical" ? "blocked" : "restricted";

        await ctx.db.patch(args.roadId, {
          riskScore: nextScore,
          riskLevel: riskLevelFromScore(nextScore),
          accessibilityStatus: nextAccess,
          lastUpdated: now,
        });

        await logActivity(ctx, {
          eventType: "road_status_change",
          category: "risk",
          message: `${road.roadNumber} ${road.roadName} marked ${nextAccess} following a reported ${args.incidentType.replace("_", " ")}.`,
          severity: args.severity,
          relatedRoadId: args.roadId,
          relatedIncidentId: incidentId,
        });
      }
    }

    if (isSerious) {
      const alertId = await ctx.db.insert("alerts", {
        title: `${labelForIncident(args.incidentType)} — ${args.locationName}`,
        message: args.description,
        alertType: alertTypeForIncident(args.incidentType),
        severity: args.severity,
        status: "active",
        latitude: args.latitude,
        longitude: args.longitude,
        locationName: args.locationName,
        district: args.district,
        state: args.state,
        relatedIncidentId: incidentId,
        relatedRoadId: args.roadId,
        recommendedAction:
          args.severity === "critical"
            ? "Close the corridor to logistics traffic and dispatch the safest alternative route to affected vehicles."
            : "Restrict heavy vehicles and monitor the segment for further degradation.",
        createdAt: now,
      });

      await logActivity(ctx, {
        eventType: "alert_created",
        category: "alert",
        message: `${args.severity === "critical" ? "Critical" : "High"} alert raised for ${args.locationName}.`,
        severity: args.severity,
        relatedAlertId: alertId,
        relatedIncidentId: incidentId,
      });
    }

    // A confirmed incident changes the risk picture for everything around it.
    // Re-score the neighbourhood so predictions, road status and the risk
    // alerts all reflect the new reality in the same transaction.
    await runRiskAssessmentNear(ctx, args.latitude, args.longitude);

    return incidentId;
  },
});

export const updateIncidentStatus = mutation({
  args: {
    incidentId: v.id("incidents"),
    status: incidentStatus,
  },
  handler: async (ctx, { incidentId, status }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    await ctx.db.patch(incidentId, { status, updatedAt: Date.now() });

    // A resolved incident releases the road it was holding down.
    if (status === "resolved" && incident.roadId) {
      const road = await ctx.db.get(incident.roadId);
      if (road) {
        await ctx.db.patch(incident.roadId, {
          riskScore: 30,
          riskLevel: riskLevelFromScore(30),
          accessibilityStatus: "accessible",
          lastUpdated: Date.now(),
        });
        await logActivity(ctx, {
          eventType: "road_status_change",
          category: "risk",
          message: `${road.roadNumber} reopened after the incident at ${incident.locationName} was resolved.`,
          relatedRoadId: incident.roadId,
          relatedIncidentId: incidentId,
        });
      }
    }

    await logActivity(ctx, {
      eventType:
        status === "resolved" ? "incident_resolved" : "incident_reported",
      category: "incident",
      message: `Incident at ${incident.locationName} moved to ${status}.`,
      relatedIncidentId: incidentId,
    });

    // Resolving removes the incident from the engine's inputs, so risk falls
    // and the corridor can reopen. Recalculation is what makes that automatic.
    await runRiskAssessmentNear(ctx, incident.latitude, incident.longitude);

    return incidentId;
  },
});

/**
 * Verification is the hard-override trigger.
 *
 * A verified critical report forces the road to blocked with a risk score of
 * 100 regardless of any model output. Deterministic safety beats prediction —
 * a confirmed landslide is not a probability.
 */
export const verifyIncident = mutation({
  args: {
    incidentId: v.id("incidents"),
    verifiedBy: v.id("users"),
  },
  handler: async (ctx, { incidentId, verifiedBy }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const now = Date.now();
    await ctx.db.patch(incidentId, {
      verified: true,
      verifiedBy,
      verifiedAt: now,
      updatedAt: now,
    });

    if (incident.roadId && incident.severity === "critical") {
      const road = await ctx.db.get(incident.roadId);
      if (road) {
        await ctx.db.patch(incident.roadId, {
          riskScore: 100,
          riskLevel: "critical",
          accessibilityStatus: "blocked",
          lastUpdated: now,
        });

        // Any route across a blocked segment is no longer viable.
        const routes = await ctx.db.query("routes").collect();
        for (const route of routes) {
          if (
            route.status !== "blocked" &&
            route.roadIds?.includes(incident.roadId)
          ) {
            await ctx.db.patch(route._id, {
              status: "blocked",
              updatedAt: now,
            });
            await logActivity(ctx, {
              eventType: "route_generated",
              category: "logistics",
              message: `Route "${route.name}" invalidated — it crosses the blocked ${road.roadNumber}.`,
              severity: "high",
              relatedRoadId: incident.roadId,
            });
          }
        }
      }
    }

    await logActivity(ctx, {
      eventType: "incident_verified",
      category: "incident",
      message: `Incident at ${incident.locationName} verified by control room.`,
      severity: incident.severity,
      relatedIncidentId: incidentId,
      relatedRoadId: incident.roadId,
    });

    // Verification raises confidence in the report, which feeds the engine.
    await runRiskAssessmentNear(ctx, incident.latitude, incident.longitude);

    return incidentId;
  },
});

/* ------------------------------------------------------------- helpers -- */

function labelForIncident(type: string): string {
  const labels: Record<string, string> = {
    landslide: "Landslide",
    flood: "Flooding",
    road_damage: "Road damage",
    bridge_damage: "Bridge damage",
    accident: "Accident",
    traffic: "Traffic congestion",
    other: "Incident",
  };
  return labels[type] ?? "Incident";
}

function alertTypeForIncident(
  type: string,
): "road_blockage" | "landslide_risk" | "severe_weather" | "accessibility" {
  if (type === "landslide") return "landslide_risk";
  if (type === "flood") return "severe_weather";
  if (type === "bridge_damage" || type === "road_damage")
    return "road_blockage";
  return "accessibility";
}

/* --------------------------------------------------- field operations */

/**
 * Short-lived upload URL for incident photographs.
 *
 * Convex file storage is real here — the browser PUTs the file directly to
 * the returned URL and gets back a storage id, which is then written onto the
 * incident as `imageStorageId`. Nothing about this flow is simulated; if the
 * upload fails the form says so rather than pretending it succeeded.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/**
 * Incidents relevant to a field officer: their assigned district first, then
 * anything else still open, newest first.
 */
export const getFieldTasks = query({
  args: { district: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { district, limit = 20 }) => {
    const open = await ctx.db
      .query("incidents")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const investigating = await ctx.db
      .query("incidents")
      .withIndex("by_status", (q) => q.eq("status", "investigating"))
      .collect();

    const all = [...open, ...investigating];

    all.sort((a, b) => {
      // Assigned district first — that is what the officer can actually act on.
      const aMine = district && a.district === district ? 1 : 0;
      const bMine = district && b.district === district ? 1 : 0;
      if (aMine !== bMine) return bMine - aMine;
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return s !== 0 ? s : b.createdAt - a.createdAt;
    });

    return all.slice(0, limit).map((i) => ({
      _id: i._id,
      incidentType: i.incidentType,
      severity: i.severity,
      status: i.status,
      locationName: i.locationName,
      district: i.district,
      state: i.state,
      verified: i.verified,
      createdAt: i.createdAt,
      isAssignedDistrict: Boolean(district) && i.district === district,
    }));
  },
});
