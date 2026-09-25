import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    wallet: "5000.00",
    smsCount: 5000,
    tier: "MDoNER National Emergency Broadcast Quota",
    dltHeader: "MDoNER-ALERT",
    carrierMesh:
      "High-Priority DLT Emergency Ring (Assam · Arunachal · Meghalaya · Manipur · Nagaland · Mizoram · Tripura · Sikkim)",
    status: "OPERATIONAL",
  });
}
