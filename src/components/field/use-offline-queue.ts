"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  getPendingCount,
  getServerPendingCount,
  isNetworkFailure,
  isQueueAvailable,
  listPending,
  markAttempt,
  refreshPendingCount,
  removePending,
  subscribePendingCount,
} from "@/lib/offline-queue";

export type DrainState =
  | { state: "idle" }
  | { state: "draining"; total: number; done: number }
  | { state: "done"; delivered: number }
  | { state: "error"; message: string };

/**
 * Delivers queued reports when the connection returns.
 *
 * Draining runs in the page rather than a service worker: replaying a write
 * from a worker would need a public HTTP write endpoint, and there is no
 * authentication to put in front of one. The practical cost is that reports
 * are delivered when the officer next opens the app in coverage, not while
 * it is closed — which matches how the app is actually used in the field.
 *
 * Delivery is safe to repeat. Every report carries a `clientUuid`, and
 * `incidents.createIncident` looks it up before inserting, so a report that
 * was actually received but whose response was lost resolves to the existing
 * record instead of a duplicate.
 */
export function useOfflineQueue() {
  // Subscribed rather than copied into state: the queue lives in IndexedDB,
  // and every mounted indicator should agree without prop drilling.
  const pending = useSyncExternalStore(
    subscribePendingCount,
    getPendingCount,
    getServerPendingCount,
  );
  const [drain, setDrain] = useState<DrainState>({ state: "idle" });

  const createIncident = useMutation(api.incidents.createIncident);
  const generateUploadUrl = useMutation(api.incidents.generateUploadUrl);

  const refresh = useCallback(async () => {
    await refreshPendingCount();
  }, []);

  const deliver = useCallback(async () => {
    if (!isQueueAvailable()) return;

    let reports;
    try {
      reports = await listPending();
    } catch {
      return;
    }
    if (reports.length === 0) return;

    setDrain({ state: "draining", total: reports.length, done: 0 });
    let delivered = 0;

    for (const [index, report] of reports.entries()) {
      try {
        let imageStorageId: Id<"_storage"> | undefined;

        // The upload URL is short-lived, so it is fetched at delivery time
        // rather than stored with the queued report.
        if (report.photo) {
          const uploadUrl = await generateUploadUrl({});
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": report.photoType ?? "application/octet-stream",
            },
            body: report.photo,
          });
          if (!res.ok) throw new Error(`Photo upload failed (${res.status}).`);
          const body = (await res.json()) as { storageId: Id<"_storage"> };
          imageStorageId = body.storageId;
        }

        await createIncident({
          incidentType: report.payload.incidentType as "landslide",
          description: report.payload.description,
          severity: report.payload.severity as "high",
          latitude: report.payload.latitude,
          longitude: report.payload.longitude,
          locationName: report.payload.locationName,
          state: report.payload.state,
          district: report.payload.district,
          reportedBy: report.payload.reportedBy as Id<"users">,
          imageStorageId,
          clientUuid: report.clientUuid,
        });

        await removePending(report.clientUuid);
        delivered += 1;
        setDrain({
          state: "draining",
          total: reports.length,
          done: index + 1,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Delivery failed.";
        await markAttempt(report.clientUuid, message);

        // Lost the connection again — stop and keep the rest queued.
        if (isNetworkFailure(error)) {
          setDrain({
            state: "error",
            message: "Connection lost. Remaining reports stay queued.",
          });
          await refresh();
          return;
        }
        // A rejected report is a data problem, not a transport one. Leave it
        // queued with its error recorded rather than silently dropping it.
      }
    }

    await refresh();
    setDrain({ state: "done", delivered });
  }, [createIncident, generateUploadUrl, refresh]);

  useEffect(() => {
    void refresh();

    const onOnline = () => {
      void deliver();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh, deliver]);

  return { pending, drain, deliver, refresh };
}
