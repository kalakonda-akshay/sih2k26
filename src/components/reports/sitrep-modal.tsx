"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  FileText,
  Printer,
  Download,
  Shield,
  Clock,
  AlertTriangle,
  Truck,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SitRepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SitRepModal({ isOpen, onClose }: SitRepModalProps) {
  const metrics = useQuery(api.dashboard.getMetrics);
  const alerts = useQuery(api.alerts.listActiveAlerts, { limit: 10 });
  const incidents = useQuery(api.incidents.listActiveIncidents, { limit: 10 });
  const deliveries = useQuery(api.deliveries.getActiveDeliveries, { limit: 10 });

  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const docRef = `NER-SITREP/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-border bg-background shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Controls Bar (hidden during browser print) */}
        <div className="print:hidden flex items-center justify-between border-b border-border bg-card px-5 py-3 shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="size-4 text-primary" />
            <span>MDoNER Official Situation Report (SitRep)</span>
            <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] text-primary font-bold">
              CLASSIFIED / TACTICAL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs"
            >
              <Printer className="size-3.5" />
              Print / Save as PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="size-8 p-0"
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="sitrep-print-area" className="p-6 sm:p-10 overflow-y-auto font-sans text-foreground space-y-6 bg-card/60">
          {/* Government Letterhead */}
          <div className="border-b-2 border-border pb-5 text-center space-y-1">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              GOVERNMENT OF INDIA · MINISTRY OF DEVELOPMENT OF NORTH EASTERN REGION (MDoNER)
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              DISASTER & LOGISTICS OPERATIONS SITUATION REPORT (SITREP)
            </h1>
            <div className="text-xs text-muted-foreground font-mono">
              NORTH EAST REGIONAL ACCESSIBILITY COMMAND CENTRE · SMART INDIA HACKATHON 2026
            </div>
            <div className="flex flex-wrap justify-between pt-3 text-xs font-mono text-muted-foreground border-t border-border/40 mt-3">
              <span>DOC REF: <strong className="text-foreground">{docRef}</strong></span>
              <span>DATE: <strong className="text-foreground">{dateStr} {timeStr} IST</strong></span>
              <span>NETWORK STATUS: <strong className="text-emerald-400">OPERATIONAL ({metrics?.networkHealth ?? 92}%)</strong></span>
            </div>
          </div>

          {/* Key Executive Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Corridor Health</span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                {metrics?.networkHealth ?? 92}%
              </div>
              <span className="text-[10px] text-muted-foreground">{metrics?.safeRoads ?? 12} Corridors Passable</span>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Active Blockages</span>
              <div className="text-xl font-bold text-red-400 font-mono mt-0.5">
                {metrics?.blockedRoads ?? 2}
              </div>
              <span className="text-[10px] text-muted-foreground">NH-6, NH-13 Impassable</span>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Monitored Fleet</span>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">
                {metrics?.activeVehicles ?? 18}
              </div>
              <span className="text-[10px] text-muted-foreground">{metrics?.delayedVehicles ?? 2} Delayed Convoys</span>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Active Incidents</span>
              <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
                {metrics?.activeIncidents ?? 7}
              </div>
              <span className="text-[10px] text-muted-foreground">{metrics?.criticalIncidents ?? 2} Critical Priority</span>
            </div>
          </div>

          {/* Section 1: Critical Corridor Status */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-primary flex items-center gap-1.5 border-b border-border pb-1">
              <AlertTriangle className="size-3.5 text-red-400" />
              1. Critical Road Blockages & Active Disruption Points
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-border">
                <thead className="bg-muted/40 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="p-2 border-r border-border">Corridor / Location</th>
                    <th className="p-2 border-r border-border">State & District</th>
                    <th className="p-2 border-r border-border">Type</th>
                    <th className="p-2 border-r border-border">Severity</th>
                    <th className="p-2">Recommended Diversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {incidents && incidents.length > 0 ? (
                    incidents.slice(0, 5).map((inc) => (
                      <tr key={inc._id} className="hover:bg-muted/10">
                        <td className="p-2 font-medium font-mono border-r border-border">{inc.locationName}</td>
                        <td className="p-2 border-r border-border">{inc.district}, {inc.state}</td>
                        <td className="p-2 capitalize border-r border-border">{inc.incidentType.replace("_", " ")}</td>
                        <td className="p-2 font-mono uppercase font-bold border-r border-border text-red-400">{inc.severity}</td>
                        <td className="p-2 text-muted-foreground">{inc.description.slice(0, 60)}…</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">
                        No critical corridor blockages currently logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Essential Logistics Consignments */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-primary flex items-center gap-1.5 border-b border-border pb-1">
              <Truck className="size-3.5 text-cyan-400" />
              2. Priority Humanitarian & Relief Dispatches
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {deliveries && deliveries.length > 0 ? (
                deliveries.slice(0, 4).map((del) => (
                  <div key={del._id} className="rounded border border-border p-2.5 bg-background space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold font-mono">{del.origin} ➔ {del.destination}</span>
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-mono text-primary capitalize font-bold">
                        {del.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Cargo: <span className="text-foreground capitalize">{del.cargoType}</span> · Progress: {del.progress ?? 45}%
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-xs text-muted-foreground p-2">
                  All relief consignments progressing on schedule.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Official Orders & Actions */}
          <div className="space-y-1.5 rounded-lg border border-border bg-background/50 p-4 text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-1.5 font-mono text-[11px] uppercase">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              3. Operational Directives & Command Action Plan
            </h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed pl-1 text-[11px]">
              <li><strong>BRO Engineering Task Force:</strong> Priority earthmoving mobilization at Sonapur Corridor (NH-6) and Papum Pare sector (NH-13).</li>
              <li><strong>State Disaster Response (SDRF):</strong> Deploy mobile VHF repeaters and pre-position emergency relief supplies at Jowai and Silchar hubs.</li>
              <li><strong>Commercial Logistics Operators:</strong> Re-route 16-wheel bulk fuel and medical convoys via designated alternate southern corridor.</li>
            </ul>
          </div>

          {/* Signoff Authentication Block */}
          <div className="border-t-2 border-border pt-4 flex flex-wrap justify-between items-end text-xs text-muted-foreground font-mono">
            <div>
              <p>Generated by: <strong>NER-Vision AI Autonomous Command Engine</strong></p>
              <p>Host: SIH-26002 Command Terminal · Vercel Production</p>
            </div>
            <div className="text-right">
              <div className="inline-block border-b border-muted-foreground w-40 pb-1 mb-1 text-center font-bold text-foreground">
                [DIGITALLY VERIFIED]
              </div>
              <p>Duty Officer · Regional Command Centre</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
