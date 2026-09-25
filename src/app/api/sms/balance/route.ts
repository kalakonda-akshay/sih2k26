import { NextResponse } from "next/server";

export async function GET() {
  const apiKey =
    process.env.FAST2SMS_API_KEY ||
    "uSNFzrHsLMl0iDdOB1nRm4QKk5yZbwfTCe6qWxA9Ig7hG2VpJo9Ta7ZIp0dxgRVctbjzLEvYG4FUkKQ2";

  try {
    const res = await fetch("https://www.fast2sms.com/dev/wallet", {
      headers: {
        authorization: apiKey,
      },
      next: { revalidate: 30 },
    });

    const data = await res.json();
    return NextResponse.json({
      success: data.return === true,
      wallet: data.wallet || "0.0000",
      smsCount: data.sms_count || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch balance" },
      { status: 500 },
    );
  }
}
