"use client";

import { Fragment } from "react";
import { Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPopup, PopupAction } from "../map-popup";
import type { MapPrediction } from "../types";
import { RISK_TONE, type RiskLevel } from "@/lib/risk";
import { timeAgo } from "@/lib/format";

/**
 * AI risk prediction layer.
 *
 * Predictions are forecasts, not observations, and the encoding says so: a
 * dashed translucent zone with a hollow diamond at its centre, versus the
 * solid filled squares used for confirmed incidents. Every popup is headed
 * "AI PREDICTED RISK" so the distinction survives even if someone reads only
 * the text.
 *
 * Zone radius scales with the score — a critical forecast covers visibly more
 * ground than a moderate one.
 */
export function RiskLayer({ predictions }: { predictions: MapPrediction[] }) {
  return (
    <>
      {predictions.map((prediction) => {
        const tone = RISK_TONE[prediction.riskLevel as RiskLevel];
        // 12 km at score 0 up to ~32 km at score 100.
        const radiusMeters = 12000 + prediction.riskScore * 200;

        const icon = L.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -10],
          html: `
            <div style="
              width:14px;height:14px;margin:2px;
              transform:rotate(45deg);
              border:1.5px dashed ${tone.hex};
              background:${tone.hex}1f;
            "></div>`,
        });

        return (
          <Fragment key={prediction._id}>
            <Circle
              center={[prediction.latitude, prediction.longitude]}
              radius={radiusMeters}
              pathOptions={{
                color: tone.hex,
                weight: 1.5,
                opacity: 0.65,
                dashArray: "6 6",
                fillColor: tone.hex,
                fillOpacity: 0.07,
              }}
            />
            <Marker
              position={[prediction.latitude, prediction.longitude]}
              icon={icon}
            >
              <Popup>
                <MapPopup
                  eyebrow="AI predicted risk"
                  title={prediction.predictedIssue}
                  toneHex={tone.hex}
                  toneLabel={`${tone.label} · ${Math.round(prediction.riskScore)}/100`}
                  rows={[
                    ["Location", prediction.locationName],
                    [
                      "District",
                      `${prediction.district}, ${prediction.state}`,
                    ],
                    ["Risk score", `${Math.round(prediction.riskScore)}/100`],
                    ["Confidence", `${Math.round(prediction.confidence)}%`],
                    ...(prediction.horizonHours
                      ? ([
                          ["Horizon", `${prediction.horizonHours}h`],
                        ] as Array<[string, string]>)
                      : []),
                    ["Generated", timeAgo(prediction.createdAt)],
                  ]}
                >
                  {prediction.contributingFactors.length > 0 && (
                    <div className="mt-2.5 border-t border-border pt-2">
                      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                        Contributing factors
                      </div>
                      <ul className="mt-1 flex flex-col gap-1">
                        {[...prediction.contributingFactors]
                          .sort((a, b) => b.weight - a.weight)
                          .slice(0, 4)
                          .map((factor) => (
                            <li
                              key={factor.factor}
                              className="flex items-center gap-2 text-[10.5px]"
                            >
                              <span className="flex-1 truncate text-foreground/85">
                                {factor.factor}
                              </span>
                              <span className="font-mono tabular text-muted-foreground">
                                +{factor.weight}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  <PopupAction>{prediction.recommendedAction}</PopupAction>
                </MapPopup>
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}
