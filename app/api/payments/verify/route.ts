import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const paymentOrderId = body?.paymentOrderId;
    const razorpayPaymentId = body?.razorpay_payment_id;
    const razorpayOrderId = body?.razorpay_order_id;
    const razorpaySignature = body?.razorpay_signature;

    if (
      !paymentOrderId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Incomplete payment verification data.",
        },
        { status: 400 }
      );
    }

    /*
     * Find the local payment order.
     * It must belong to the currently logged-in user.
     */
    const { data: paymentOrder, error: paymentOrderError } =
      await supabaseAdmin
        .from("payment_orders")
        .select(
          `
          id,
          listing_id,
          user_id,
          amount,
          currency,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          status
          `
        )
        .eq("id", paymentOrderId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (paymentOrderError) {
      console.error(
        "Payment order lookup error:",
        paymentOrderError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify the payment order.",
        },
        { status: 500 }
      );
    }

    if (!paymentOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment order not found or unauthorized.",
        },
        { status: 404 }
      );
    }

    /*
     * Make sure the Razorpay order returned by Checkout
     * matches the order created by our server.
     */
    if (paymentOrder.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay order mismatch.",
        },
        { status: 400 }
      );
    }

    /*
     * Prevent changing an already-paid order.
     */
    if (paymentOrder.status === "paid") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: "Payment has already been verified.",
      });
    }

    if (paymentOrder.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "This payment order is not pending.",
        },
        { status: 400 }
      );
    }

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      console.error(
        "Missing RAZORPAY_KEY_SECRET."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Razorpay server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /*
     * Razorpay signature verification:
     *
     * HMAC SHA256(
     *   razorpay_order_id + "|" + razorpay_payment_id,
     *   RAZORPAY_KEY_SECRET
     * )
     */
    const generatedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(
        `${razorpayOrderId}|${razorpayPaymentId}`
      )
      .digest("hex");

    const signaturesMatch =
      generatedSignature === razorpaySignature;

    if (!signaturesMatch) {
      console.error(
        "Razorpay signature verification failed."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed.",
        },
        { status: 400 }
      );
    }

    /*
     * Signature is valid.
     * Now mark the local payment order as paid.
     */
    const { data: updatedPaymentOrder, error: updateError } =
      await supabaseAdmin
        .from("payment_orders")
        .update({
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentOrder.id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .select(
          `
          id,
          listing_id,
          amount,
          currency,
          razorpay_order_id,
          razorpay_payment_id,
          status,
          updated_at
          `
        )
        .single();

    if (updateError) {
      console.error(
        "Payment status update error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Payment was verified but could not be saved.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentOrder: updatedPaymentOrder,
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}