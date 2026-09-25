"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ShieldCheck, Truck, Smartphone, Siren, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    key: "admin",
    label: "MDoNER Command Chief",
    subtitle: "Full operational authority & analytics",
    icon: ShieldCheck,
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  {
    key: "logistics_operator",
    label: "Logistics Dispatcher",
    subtitle: "Fleet tracking, routes & deliveries",
    icon: Truck,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  },
  {
    key: "field_officer",
    label: "Field Inspection Officer",
    subtitle: "Mobile incident & road damage reporting",
    icon: Smartphone,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  {
    key: "emergency_authority",
    label: "Disaster Response Commander",
    subtitle: "Emergency SMS & corridor evacuation",
    icon: Siren,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
] as const;

export function RoleSwitcher() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateUserRole = useMutation(api.users.updateUserRole);
  const [updating, setUpdating] = useState(false);

  const currentRole = currentUser?.role || "admin";
  const activeRoleConfig = ROLES.find((r) => r.key === currentRole) || ROLES[0];
  const Icon = activeRoleConfig.icon;

  const handleSelectRole = async (roleKey: any) => {
    if (!currentUser || updating) return;
    setUpdating(true);
    try {
      await updateUserRole({ userId: currentUser._id, role: roleKey });
    } catch (e) {
      console.error("Failed to switch role", e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-xs hover:border-primary/50 transition-colors"
          />
        }
      >
        <Icon className={cn("size-3.5", activeRoleConfig.color.split(" ")[0])} />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
          {activeRoleConfig.label.split(" ")[0]}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-mono text-[10px] uppercase text-muted-foreground">
            Role-Based Access Control (RBAC)
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {ROLES.map((role) => {
          const RoleIcon = role.icon;
          const isSelected = currentRole === role.key;
          return (
            <DropdownMenuItem
              key={role.key}
              onClick={() => handleSelectRole(role.key)}
              className={cn(
                "flex items-start gap-2.5 py-2 cursor-pointer",
                isSelected ? "bg-primary/10" : "",
              )}
            >
              <RoleIcon
                className={cn("size-4 mt-0.5 shrink-0", role.color.split(" ")[0])}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-foreground">
                    {role.label}
                  </span>
                  {isSelected && <Check className="size-3 text-primary shrink-0" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {role.subtitle}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
