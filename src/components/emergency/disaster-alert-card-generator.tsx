"use client";

import { useEffect, useRef, useState } from "react";
import {
  Share2,
  Download,
  Copy,
  Check,
  AlertTriangle,
  QrCode,
  ShieldAlert,
  Smartphone,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface DisasterCardData {
  noticeId: string;
  roadNumber: string;
  highwayName: string;
  locationName: string;
  state: string;
  district: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  incidentType: string;
  debrisVolumeM3: number;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  authorizedBypass: string;
  clearingTimeEst: string;
  emergencyHelpline: string;
  issuedBy: string;
}

export const PRESET_DISASTER_NOTICES: DisasterCardData[] = [
  {
    noticeId: "MDoNER/DISASTER-ALERT/2026-088",
    roadNumber: "NH-6",
    highwayName: "Guwahati-Shillong-Silchar Mountain Highway",
    locationName: "Sonapur Defile & Tunnel Sector (KM 142)",
    state: "Meghalaya / Assam Border",
    district: "East Jaintia Hills",
    severity: "CRITICAL",
    incidentType: "Torrenial Monsoon Mudslide & Road Collapse",
    debrisVolumeM3: 16400,
    latitude: 25.18,
    longitude: 92.35,
    altitudeMeters: 420,
    authorizedBypass: "Umrangso Hydro Corridor (SH-19) ➔ Haflong Ridge bypass active for relief trucks",
    clearingTimeEst: "36 to 48 Hours (Heavy JCBs deployed)",
    emergencyHelpline: "+91 98640 11201 / 1077 (SDMA)",
    issuedBy: "Ministry of Development of North Eastern Region (MDoNER) & SDMA",
  },
  {
    noticeId: "MDoNER/DISASTER-ALERT/2026-089",
    roadNumber: "NH-13",
    highwayName: "Trans-Arunachal Strategic Border Highway",
    locationName: "Sela Pass North Ridge (Elevation 4,170m)",
    state: "Arunachal Pradesh",
    district: "West Kameng / Tawang",
    severity: "CRITICAL",
    incidentType: "Permafrost Slip & Catastrophic Rockfall",
    debrisVolumeM3: 28500,
    latitude: 27.505,
    longitude: 92.103,
    altitudeMeters: 4170,
    authorizedBypass: "Balipara-Charduar-Tawang (BCT) lower valley route with military escort",
    clearingTimeEst: "52 Hours (BRO Heavy Excavator Column in action)",
    emergencyHelpline: "+91 98640 11203 / 112 (State Emergency)",
    issuedBy: "Border Roads Organisation (Project Vartak) & MDoNER",
  },
  {
    noticeId: "MDoNER/DISASTER-ALERT/2026-090",
    roadNumber: "NH-2",
    highwayName: "Dimapur-Kohima-Imphal Lifeline Corridor",
    locationName: "Mao Gate Inter-State Mountain Slump",
    state: "Nagaland / Manipur Border",
    district: "Senapati / Kohima",
    severity: "HIGH",
    incidentType: "High-Volume Debris Slump & Bridge Scour",
    debrisVolumeM3: 9200,
    latitude: 25.5,
    longitude: 94.15,
    altitudeMeters: 1780,
    authorizedBypass: "Single-lane convoy queue active; light vehicles only via Maram-Peren road",
    clearingTimeEst: "18 to 24 Hours",
    emergencyHelpline: "+91 98640 11205 / 1070 (Disaster Control)",
    issuedBy: "State Disaster Management Authority & NDRF 12th Bn",
  },
];

export function DisasterAlertCardGenerator({
  initialData,
}: {
  initialData?: Partial<DisasterCardData>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<DisasterCardData>({
    ...PRESET_DISASTER_NOTICES[0],
    ...initialData,
  });
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Draw 1200x630 official emergency graphic card on canvas
  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // 1. Dark Tactical Carbon Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0b0f15");
    bgGrad.addColorStop(0.5, "#101622");
    bgGrad.addColorStop(1, "#070a0e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle tactical dot grid
    ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
    for (let x = 20; x < width; x += 30) {
      for (let y = 20; y < height; y += 30) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Outer tactical border with corner accents
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 6;
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(18, 55);
    ctx.lineTo(18, 18);
    ctx.lineTo(55, 18);
    ctx.stroke();
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(width - 55, 18);
    ctx.lineTo(width - 18, 18);
    ctx.lineTo(width - 18, 55);
    ctx.stroke();
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(18, height - 55);
    ctx.lineTo(18, height - 18);
    ctx.lineTo(55, height - 18);
    ctx.stroke();
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(width - 55, height - 18);
    ctx.lineTo(width - 18, height - 18);
    ctx.lineTo(width - 18, height - 55);
    ctx.stroke();

    // 2. Top Header Ribbon (Indian Tricolor accent)
    ctx.fillStyle = "#FF9933";
    ctx.fillRect(25, 25, (width - 50) / 3, 4);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(25 + (width - 50) / 3, 25, (width - 50) / 3, 4);
    ctx.fillStyle = "#138808";
    ctx.fillRect(25 + ((width - 50) / 3) * 2, 25, (width - 50) / 3, 4);

    // Ministry Title & Emblem
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("GOVERNMENT OF INDIA · MINISTRY OF DEVELOPMENT OF NORTH EASTERN REGION (MDoNER)", 45, 58);

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(data.noticeId, width - 45, 58);
    ctx.textAlign = "left";

    // 3. Giant Caution Strip with Diagonal Hazard Stripes
    const stripY = 76;
    const stripH = 48;
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(40, stripY, width - 80, stripH);

    // Diagonal hazard stripes on ends
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    for (let s = 40; s < width - 80; s += 28) {
      ctx.beginPath();
      ctx.moveTo(s, stripY);
      ctx.lineTo(s + 14, stripY);
      ctx.lineTo(s - 6, stripY + stripH);
      ctx.lineTo(s - 20, stripY + stripH);
      ctx.fill();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`🚨 HIGHWAY ROADBLOCK NOTICE · ${data.roadNumber} CLOSED TO CIVILIAN TRAFFIC`, 65, stripY + 33);

    // 4. Left Content Column: Route, Hazard & Geolocation
    const colLeftX = 45;
    let contentY = 160;

    // Highway & Location Block
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(data.roadNumber + " — " + data.locationName, colLeftX, contentY);

    contentY += 28;
    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`${data.highwayName} (${data.district}, ${data.state})`, colLeftX, contentY);

    // Hazard Severity Matrix Box
    contentY += 24;
    ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.roundRect(colLeftX, contentY, 680, 115, 10);
    ctx.fill();
    ctx.stroke();

    // Inside Box text
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("HAZARD ASSESSMENT & DEBRIS CLASSIFICATION", colLeftX + 20, contentY + 28);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(data.incidentType, colLeftX + 20, contentY + 58);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "14px 'Courier New', monospace";
    ctx.fillText(
      `Volume: ~${data.debrisVolumeM3.toLocaleString()} m³ · GPS: ${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E · Alt: ${data.altitudeMeters.toLocaleString()}m`,
      colLeftX + 20,
      contentY + 88,
    );

    // Diversion Route Section
    contentY += 135;
    ctx.fillStyle = "rgba(14, 165, 233, 0.1)";
    ctx.strokeStyle = "rgba(14, 165, 233, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.roundRect(colLeftX, contentY, 680, 105, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("OFFICIALLY AUTHORIZED DIVERSION BYPASS", colLeftX + 20, contentY + 28);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    // Wrap bypass text
    const words = data.authorizedBypass.split(" ");
    let line = "";
    let lineY = contentY + 54;
    for (const w of words) {
      const testLine = line + w + " ";
      if (ctx.measureText(testLine).width > 640 && line !== "") {
        ctx.fillText(line, colLeftX + 20, lineY);
        line = w + " ";
        lineY += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, colLeftX + 20, lineY);

    // Est clearance
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText(`Est. Clearance: ${data.clearingTimeEst}`, colLeftX + 20, contentY + 92);

    // 5. Right Column: QR Code + Digital Verified Seal + Helpline
    const colRightX = 760;
    const colRightW = 395;

    // Right Container Card
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.roundRect(colRightX, 155, colRightW, 375, 12);
    ctx.fill();
    ctx.stroke();

    // QR Code Frame
    const qrSize = 160;
    const qrX = colRightX + (colRightW - qrSize) / 2;
    const qrY = 175;

    ctx.fillStyle = "#ffffff";
    ctx.roundRect(qrX, qrY, qrSize, qrSize, 8);
    ctx.fill();

    // Procedural tactical QR code representation
    ctx.fillStyle = "#000000";
    ctx.fillRect(qrX + 12, qrY + 12, 36, 36);
    ctx.clearRect(qrX + 18, qrY + 18, 24, 24);
    ctx.fillRect(qrX + 22, qrY + 22, 16, 16);

    ctx.fillRect(qrX + qrSize - 48, qrY + 12, 36, 36);
    ctx.clearRect(qrX + qrSize - 42, qrY + 18, 24, 24);
    ctx.fillRect(qrX + qrSize - 38, qrY + 22, 16, 16);

    ctx.fillRect(qrX + 12, qrY + qrSize - 48, 36, 36);
    ctx.clearRect(qrX + 18, qrY + qrSize - 42, 24, 24);
    ctx.fillRect(qrX + 22, qrY + qrSize - 38, 16, 16);

    // Random procedural data blocks for believable high-density QR
    const seed = data.latitude + data.longitude;
    for (let qx = 0; qx < 12; qx++) {
      for (let qy = 0; qy < 12; qy++) {
        const val = Math.sin(qx * 13.5 + qy * 27.2 + seed) * 10000;
        if (val - Math.floor(val) > 0.48) {
          ctx.fillRect(qrX + 54 + qx * 6.5, qrY + 20 + qy * 9.5, 5, 5);
        }
      }
    }

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("SCAN FOR LIVE BYPASS MAP & GPS DETOUR", colRightX + colRightW / 2, qrY + qrSize + 22);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("sih2k26-one.vercel.app/map", colRightX + colRightW / 2, qrY + qrSize + 38);

    // Emergency Helpline Box
    const helpY = qrY + qrSize + 52;
    ctx.fillStyle = "rgba(220, 38, 38, 0.18)";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.roundRect(colRightX + 20, helpY, colRightW - 40, 56, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f87171";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillText("STATE DISASTER HELPLINE (TOLL-FREE)", colRightX + colRightW / 2, helpY + 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px 'Courier New', monospace";
    ctx.fillText(data.emergencyHelpline, colRightX + colRightW / 2, helpY + 44);

    // Official Digital Validation Stamp
    ctx.fillStyle = "rgba(34, 197, 94, 0.12)";
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.roundRect(colRightX + 20, helpY + 68, colRightW - 40, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText("✓ VERIFIED BY SDMA & MDoNER OPERATIONS", colRightX + colRightW / 2, helpY + 86);
    ctx.textAlign = "left";

    // 6. Bottom Meta Bar
    ctx.fillStyle = "#64748b";
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillText(
      `BROADCAST TIMESTAMP: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} · NER-VISION AI DISASTER NETWORK`,
      45,
      height - 30,
    );

    ctx.textAlign = "right";
    ctx.fillText(data.issuedBy, width - 45, height - 30);
    ctx.textAlign = "left";
  };

  useEffect(() => {
    drawCard();
  }, [data]);

  // Download High-Res 1200x630 PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `MDoNER_Emergency_Notice_${data.roadNumber.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Share to WhatsApp / Web Share API
  const handleShareWhatsApp = async () => {
    const shareText = `🚨 *MDoNER EMERGENCY DISASTER NOTICE*\n\n*Highway*: ${data.roadNumber} (${data.highwayName})\n*Location*: ${data.locationName} (${data.district}, ${data.state})\n*Hazard*: ${data.incidentType} (Volume: ~${data.debrisVolumeM3.toLocaleString()} m³)\n*Status*: ⛔ CLOSED TO ALL CIVILIAN TRAFFIC\n\n*Authorized Bypass*: ${data.authorizedBypass}\n*Est. Clearance*: ${data.clearingTimeEst}\n*Emergency Helpline*: ${data.emergencyHelpline}\n\n*Live Detour Map*: https://sih2k26-one.vercel.app/map`;

    if (navigator.share && canvasRef.current) {
      try {
        canvasRef.current.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "notice.png", { type: "image/png" })] })) {
            await navigator.share({
              title: `MDoNER Emergency Alert - ${data.roadNumber}`,
              text: shareText,
              files: [new File([blob], "notice.png", { type: "image/png" })],
            });
          } else {
            // Fallback to text WhatsApp
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
          }
        }, "image/png");
        return;
      } catch {
        // Fallback below
      }
    }

    // Direct WhatsApp Web / Mobile redirect
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  // Copy Bulletin text
  const handleCopyText = () => {
    const shareText = `🚨 MDoNER EMERGENCY DISASTER NOTICE: ${data.roadNumber} (${data.locationName}) is CLOSED due to ${data.incidentType}. Bypass: ${data.authorizedBypass}. Helpline: ${data.emergencyHelpline}. Live Map: https://sih2k26-one.vercel.app/map`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Preset Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
              Emergency Operations Suite
            </span>
            <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-[10px] font-mono">
              1200×630 OPEN GRAPH
            </Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            WhatsApp & Social Disaster Alert Card Generator
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Instantly render on-device, official MDoNER Disaster Notice images for WhatsApp transport groups, district social media, and civilian broadcasts.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">Preset Corridor:</span>
          <div className="flex rounded-lg border border-border bg-background p-1">
            {PRESET_DISASTER_NOTICES.map((p, idx) => (
              <button
                key={p.noticeId}
                type="button"
                onClick={() => setData(p)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  data.roadNumber === p.roadNumber
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.roadNumber}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Canvas Preview */}
      <div className="rounded-xl border border-border/80 bg-black/40 p-4 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>High-Res Canvas Preview (1200×630px)</span>
          </span>
          <span>100% Client-Side Render · ₹0 Cost</span>
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-border/60 bg-black/60 shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full max-w-4xl mx-auto h-auto rounded shadow-2xl block"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              className="gap-2 bg-primary text-primary-foreground font-medium text-xs h-9 px-4 shadow-lg shadow-primary/20"
            >
              <Download className="size-4" /> Download Official PNG (1200×630)
            </Button>

            <Button
              onClick={handleShareWhatsApp}
              variant="outline"
              className="gap-2 border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs h-9 px-4"
            >
              <Share2 className="size-4" /> Share to WhatsApp / Telegram
            </Button>
          </div>

          <Button
            onClick={handleCopyText}
            variant="ghost"
            className="gap-2 text-xs h-9 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-400" /> Copied Bulletin
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copy Text Bulletin
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
