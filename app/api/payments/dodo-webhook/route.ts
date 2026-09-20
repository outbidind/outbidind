import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as
    | "test_mode"
    | "live_mode",
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const webhookId = request.headers.get("webhook-id");
    const webhookSignature = request.headers.get("webhook-signature");
    const webhookTimestamp = request.headers.get("webhook-timestamp");

    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    const event = dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": webhookSignature,
        "webhook-timestamp": webhookTimestamp,
      },
    });

    console.log("Dodo webhook received:", {
      id: webhookId,
      type: event.type,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Dodo webhook verification failed:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }
}