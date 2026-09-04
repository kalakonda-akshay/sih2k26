"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = [
  ["admin", "Administrator", "Full regional oversight and user management"],
  [
    "logistics_operator",
    "Logistics operator",
    "Fleet, consignments and route planning",
  ],
  [
    "field_officer",
    "Field officer",
    "Incident reporting from the field, district-scoped",
  ],
  [
    "emergency_authority",
    "Emergency authority",
    "Emergency mode and priority allocation",
  ],
] as const;

type Role = (typeof ROLES)[number][0];

const ROLE_TONE: Record<Role, string> = {
  admin: "border-primary/40 bg-primary/10 text-primary",
  logistics_operator:
    "border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10 text-[oklch(0.735_0.155_158)]",
  field_officer:
    "border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10 text-[oklch(0.815_0.145_88)]",
  emergency_authority:
    "border-[oklch(0.648_0.201_22)]/40 bg-[oklch(0.648_0.201_22)]/10 text-[oklch(0.648_0.201_22)]",
};

/**
 * User and role management.
 *
 * Role changes write through the real `users.updateUserRole` mutation, so the
 * list re-renders from the database rather than from local state — what you
 * see is what is stored.
 *
 * Authentication is not implemented, so this does not yet gate access to
 * anything. The roles are real records and the schema carries the fields a
 * provider needs; the enforcement layer is what is missing, and the note at
 * the foot of the panel says so rather than implying security that is absent.
 */
export function UserManagement() {
  const users = useQuery(api.users.listUsers, {});
  const updateRole = useMutation(api.users.updateUserRole);
  const [pending, setPending] = useState<string | null>(null);

  const change = async (userId: Id<"users">, role: Role) => {
    setPending(userId);
    try {
      await updateRole({ userId, role });
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Users className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Users &amp; roles</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {users ? `${users.length} accounts` : "Loading…"}
          </p>
        </div>
      </header>

      <div className="divide-y divide-border">
        {users === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}

        {users?.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No accounts yet. Load the demo dataset to create them.
          </p>
        )}

        {users?.map((user) => (
          <div key={user._id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-semibold text-primary">
                {user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {user.email}
                  {user.district ? ` · ${user.district}` : ""}
                </div>
              </div>
              {pending === user._id && (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
              )}
            </div>

            {user.organization && (
              <p className="mt-1.5 pl-10 text-[11px] text-muted-foreground">
                {user.organization}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-10">
              {ROLES.map(([value, label]) => {
                const active = user.role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => change(user._id, value)}
                    disabled={active || pending !== null}
                    aria-pressed={active}
                    title={ROLES.find((r) => r[0] === value)?.[2]}
                    className={cn(
                      "flex items-center gap-1 rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      "disabled:cursor-default",
                      active
                        ? ROLE_TONE[value]
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && <Check className="size-2.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="border-t border-border bg-background/40 px-4 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Roles are stored and editable, but authentication is not implemented —
        they do not yet restrict access. The schema carries `tokenIdentifier`
        so a provider drops in without a migration.
      </p>
    </section>
  );
}
