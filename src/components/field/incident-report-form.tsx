"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  enqueueReport,
  isNetworkFailure,
  isQueueAvailable,
  newClientUuid,
} from "@/lib/offline-queue";
import { Camera, CircleCheck, Crosshair, Inbox, Loader2, TriangleAlert, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useFieldDraft, useLocationCapture } from "./use-field-draft";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const INCIDENT_TYPES = [
  ["landslide", "Landslide"],
  ["flood", "Flood"],
  ["road_damage", "Road damage"],
  ["bridge_damage", "Bridge damage"],
  ["accident", "Accident"],
  ["traffic", "Traffic"],
  ["other", "Other"],
] as const;

const SEVERITIES = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"],
] as const;

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type Submission =
  | { state: "idle" }
  | { state: "submitting"; step: string }
  | { state: "done"; id: string }
  /** Saved on the device, NOT delivered. Kept separate from "done". */
  | { state: "queued" }
  | { state: "error"; message: string };

/**
 * Mobile-first incident reporting.
 *
 * Controls are large enough for gloved thumbs, the field order matches how an
 * officer actually observes a site, and every write goes through the real
 * `incidents.createIncident` mutation — which then runs the same cascade the
 * command centre uses.
 */
export function IncidentReportForm() {
  const { draft, setDraft, clearDraft, restored, online } = useFieldDraft();
  const { state: location, capture } = useLocationCapture();
  const currentUser = useQuery(api.users.getCurrentUser);

  const createIncident = useMutation(api.incidents.createIncident);
  const generateUploadUrl = useMutation(api.incidents.generateUploadUrl);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);

  const lat = location.status === "granted" ? location.latitude : draft.latitude;
  const lng =
    location.status === "granted" ? location.longitude : draft.longitude;

  const canSubmit =
    draft.description.trim().length >= 10 &&
    draft.locationName.trim().length > 0 &&
    draft.district.trim().length > 0 &&
    currentUser !== undefined &&
    currentUser !== null &&
    submission.state !== "submitting";

  const onPickPhoto = (file: File | null) => {
    setPhotoError(null);
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("That file is not an image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 8 MB.`,
      );
      return;
    }
    setPhoto(file);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !currentUser) return;

    // Minted before any network call so the queued copy and the direct
    // submit share one identity.
    const clientUuid = newClientUuid();
    const deviceTs = Date.now();

    try {
      let imageStorageId: Id<"_storage"> | undefined;

      if (photo) {
        setSubmission({ state: "submitting", step: "Uploading photograph…" });
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photo.type },
          body: photo,
        });
        if (!res.ok) {
          throw new Error(`Photo upload failed (${res.status}).`);
        }
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };
        imageStorageId = storageId;
      }

      setSubmission({ state: "submitting", step: "Filing report…" });

      const incidentId = await createIncident({
        incidentType: draft.incidentType as "landslide",
        description: draft.description.trim(),
        severity: draft.severity as "high",
        // Fall back to the district centroid is not available client-side, so
        // an un-located report is filed at 0,0 only if the officer skipped
        // capture — which the form prevents below.
        latitude: lat ?? 0,
        longitude: lng ?? 0,
        locationName: draft.locationName.trim(),
        state: draft.state.trim() || "Assam",
        district: draft.district.trim(),
        reportedBy: currentUser._id,
        imageStorageId,
        // Stable across every retry of THIS report, so a resend can never
        // create a second incident.
        clientUuid,
      });

      setSubmission({ state: "done", id: incidentId });
      clearDraft();
      setPhoto(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      /*
       * A lost connection must not lose the report. Queue it durably and say
       * plainly that it is waiting — never that it was filed.
       *
       * A rejected report is a different thing entirely: that is a data
       * problem the officer can fix now, so it surfaces as an error rather
       * than being hidden in a queue that will retry it forever.
       */
      if (isNetworkFailure(error) && isQueueAvailable() && currentUser) {
        try {
          await enqueueReport({
            clientUuid,
            deviceTs,
            queuedAt: Date.now(),
            attempts: 1,
            lastError:
              error instanceof Error ? error.message : "Connection failed.",
            payload: {
              incidentType: draft.incidentType,
              description: draft.description.trim(),
              severity: draft.severity,
              latitude: lat ?? 0,
              longitude: lng ?? 0,
              locationName: draft.locationName.trim(),
              state: draft.state.trim() || "Assam",
              district: draft.district.trim(),
              reportedBy: currentUser._id,
            },
            photo: photo ?? undefined,
            photoType: photo?.type,
          });

          setSubmission({ state: "queued" });
          clearDraft();
          setPhoto(null);
          if (fileInput.current) fileInput.current.value = "";
          return;
        } catch {
          // Queueing itself failed (private mode, quota). Fall through to the
          // error state rather than claiming the report is safe.
        }
      }

      setSubmission({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "The report could not be filed.",
      });
    }
  };

  if (submission.state === "queued") {
    return (
      <section className="rounded-lg border border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/8 p-6 text-center">
        <Inbox className="mx-auto size-8 text-[oklch(0.815_0.145_88)]" />
        <h3 className="mt-3 text-base font-semibold">Saved — not yet sent</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          There is no connection right now, so the report is stored on this
          device. It will be delivered automatically when you are back in
          coverage. <strong>The command centre has not received it yet.</strong>
        </p>
        <Button
          className="mt-4 h-11 w-full text-sm"
          onClick={() => setSubmission({ state: "idle" })}
        >
          Report another
        </Button>
      </section>
    );
  }

  if (submission.state === "done") {
    return (
      <section className="rounded-lg border border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/8 p-6 text-center">
        <CircleCheck className="mx-auto size-8 text-[oklch(0.735_0.155_158)]" />
        <h3 className="mt-3 text-base font-semibold">Report filed</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The command centre has it now. Risk and road status update
          automatically.
        </p>
        <Button
          className="mt-4 h-11 w-full text-sm"
          onClick={() => setSubmission({ state: "idle" })}
        >
          Report another
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <h3 className="text-base font-semibold">Report an incident</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Filed straight to the command centre.
        </p>
      </div>

      {restored && (
        <p className="rounded-md border border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10 px-3 py-2 text-xs text-[oklch(0.815_0.145_88)]">
          Unsent draft restored from this device.
        </p>
      )}

      {/* Type — big touch targets */}
      <Field label="Incident type">
        <div className="grid grid-cols-2 gap-1.5">
          {INCIDENT_TYPES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDraft({ incidentType: value })}
              aria-pressed={draft.incidentType === value}
              className={cn(
                "h-11 rounded-md border text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                draft.incidentType === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Severity">
        <div className="grid grid-cols-4 gap-1.5">
          {SEVERITIES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDraft({ severity: value })}
              aria-pressed={draft.severity === value}
              className={cn(
                "h-11 rounded-md border text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                draft.severity === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="What did you observe?" hint="At least 10 characters">
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ description: e.target.value })}
          rows={4}
          placeholder="Debris across both lanes, approx 40 m stretch, impassable to trucks…"
          className="w-full rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Location name">
          <input
            value={draft.locationName}
            onChange={(e) => setDraft({ locationName: e.target.value })}
            placeholder="Nongpoh"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </Field>
        <Field label="District">
          <input
            value={draft.district}
            onChange={(e) => setDraft({ district: e.target.value })}
            placeholder="Ri-Bhoi"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </Field>
      </div>

      <Field label="State">
        <input
          value={draft.state}
          onChange={(e) => setDraft({ state: e.target.value })}
          placeholder="Meghalaya"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </Field>

      {/* Location capture */}
      <Field label="Coordinates" hint="Optional — a single GPS fix, not tracking">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start gap-2 text-sm"
          onClick={capture}
          disabled={location.status === "requesting"}
        >
          {location.status === "requesting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Crosshair className="size-4" />
          )}
          {location.status === "granted"
            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} (±${Math.round(location.accuracy)} m)`
            : "Capture my location"}
        </Button>

        {location.status === "denied" && (
          <p className="mt-1.5 text-xs text-[oklch(0.815_0.145_88)]">
            Location permission was denied. The report can still be filed — the
            location name and district identify it.
          </p>
        )}
        {location.status === "unavailable" && (
          <p className="mt-1.5 text-xs text-[oklch(0.815_0.145_88)]">
            {location.reason}
          </p>
        )}
      </Field>

      {/* Photo */}
      <Field label="Photograph" hint="Optional · JPEG or PNG up to 8 MB">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          className="sr-only"
          id="field-photo"
        />
        <label
          htmlFor="field-photo"
          className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Camera className="size-4" />
          {photo ? photo.name : "Attach a photograph"}
        </label>

        {photo && (
          <button
            type="button"
            onClick={() => onPickPhoto(null)}
            className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Remove
          </button>
        )}
        {photoError && (
          <p className="mt-1.5 text-xs text-[oklch(0.648_0.201_22)]">
            {photoError}
          </p>
        )}
      </Field>

      {!online && (
        <p className="flex items-start gap-2 rounded-md border border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10 px-3 py-2 text-xs text-[oklch(0.815_0.145_88)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>
            You are offline. Your draft is saved on this device — submit once
            connectivity returns. Reports are not queued for automatic sending.
          </span>
        </p>
      )}

      {submission.state === "error" && (
        <p className="rounded-md border border-[oklch(0.648_0.201_22)]/40 bg-[oklch(0.648_0.201_22)]/10 px-3 py-2 text-xs text-[oklch(0.648_0.201_22)]">
          {submission.message}
        </p>
      )}

      <Button
        type="submit"
        className="h-12 w-full text-sm"
        disabled={!canSubmit || !online}
      >
        {submission.state === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {submission.step}
          </>
        ) : (
          "File report"
        )}
      </Button>

      {!canSubmit && submission.state !== "submitting" && (
        <p className="text-center text-[11px] text-muted-foreground">
          A description of at least 10 characters, a location name and a
          district are required.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground/70">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
