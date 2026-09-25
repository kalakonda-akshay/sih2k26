import { NextRequest, NextResponse } from "next/server";

interface RecipientPayload {
  phone: string;
  name: string;
  language: string;
  message: string;
}

interface SendSmsRequest {
  senderPhone: string;
  recipients: RecipientPayload[];
  provider?: "fast2sms" | "textbee" | "twilio" | "auto";
  apiKey?: string;
  deviceId?: string;
  isSimulation?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: SendSmsRequest = await req.json();
    const {
      senderPhone,
      recipients,
      provider = "auto",
      apiKey,
      deviceId,
      isSimulation = false,
    } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No recipients provided" },
        { status: 400 },
      );
    }

    // Safety: If Simulation mode is toggled, preserve all balance!
    if (isSimulation) {
      const results = recipients.map((r) => ({
        phone: r.phone,
        success: true,
        provider: "simulation",
        status: "SIMULATED_DELIVERED",
        message: `[SIMULATION - NO CREDITS DEDUCTED] SOS dispatch to ${r.phone} in ${r.language}`,
      }));
      return NextResponse.json({
        success: true,
        isSimulation: true,
        provider: "simulation",
        message: "Simulation mode active. Zero credits consumed.",
        results,
      });
    }

    const fast2smsKey =
      apiKey ||
      process.env.FAST2SMS_API_KEY ||
      "uSNFzrHsLMl0iDdOB1nRm4QKk5yZbwfTCe6qWxA9Ig7hG2VpJo9Ta7ZIp0dxgRVctbjzLEvYG4FUkKQ2";
    const textbeeKey = apiKey || process.env.TEXTBEE_API_KEY;
    const textbeeDeviceId = deviceId || process.env.TEXTBEE_DEVICE_ID;

    // 1. FAST2SMS GATEWAY (Indian telecom route)
    if ((provider === "fast2sms" || provider === "auto") && fast2smsKey) {
      const results = [];
      for (const r of recipients) {
        const cleanNumber = r.phone.replace(/[^\d]/g, "").slice(-10); // last 10 digits
        try {
          // Use route 'q' for quick dev dispatch or fallback to 'v3'
          const resp = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: fast2smsKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route: "q",
              message: r.message,
              language: "unicode",
              flash: 0,
              numbers: cleanNumber,
            }),
          });
          const data = await resp.json();
          results.push({
            phone: r.phone,
            success: data.return === true,
            provider: "fast2sms",
            data,
          });
        } catch (err: any) {
          results.push({
            phone: r.phone,
            success: false,
            provider: "fast2sms",
            error: err.message,
          });
        }
      }

      return NextResponse.json({
        success: results.some((r) => r.success),
        provider: "fast2sms",
        results,
      });
    }

    // 2. TEXTBEE GATEWAY (Free Android SIM Gateway using 9390093424)
    if ((provider === "textbee" || provider === "auto") && textbeeKey && textbeeDeviceId) {
      const results = [];
      for (const r of recipients) {
        const cleanNumber = r.phone.replace(/[^\d+]/g, "");
        try {
          const resp = await fetch(
            `https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/sendSMS`,
            {
              method: "POST",
              headers: {
                "x-api-key": textbeeKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                recipients: [cleanNumber],
                message: r.message,
              }),
            },
          );
          const data = await resp.json();
          results.push({
            phone: r.phone,
            success: resp.ok,
            provider: "textbee",
            data,
          });
        } catch (err: any) {
          results.push({
            phone: r.phone,
            success: false,
            provider: "textbee",
            error: err.message,
          });
        }
      }

      return NextResponse.json({
        success: results.some((r) => r.success),
        provider: "textbee",
        results,
      });
    }

    // 3. NO API GATEWAY CONFIGURED YET
    return NextResponse.json({
      success: false,
      error: "NO_GATEWAY_CONFIGURED",
      message:
        "A desktop web browser cannot transmit cellular radio SMS directly to telecom cell towers without a gateway or phone sync. You can connect a free Fast2SMS key, install the free TextBee Android app on 9390093424, or use 1-Click WhatsApp Broadcast!",
      senderPhone,
      recipientCount: recipients.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process SMS request" },
      { status: 500 },
    );
  }
}
