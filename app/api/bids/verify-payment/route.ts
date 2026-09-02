import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. VERIFY LOGGED-IN USER
    // =====================================================

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

    // =====================================================
    // 2. GET PAYMENT DATA
    // =====================================================

    const body = await request.json();

    const paymentOrderId =
      body?.paymentOrderId;

    const razorpayPaymentId =
      body?.razorpay_payment_id;

    const razorpayOrderId =
      body?.razorpay_order_id;

    const razorpaySignature =
      body?.razorpay_signature;

    if (
      !paymentOrderId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incomplete payment verification data.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. GET LOCAL PAYMENT ORDER
    // =====================================================

    const {
      data: paymentOrder,
      error: paymentOrderError,
    } = await supabaseAdmin
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
        status,
        created_at
        `
      )
      .eq("id", paymentOrderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentOrderError) {
      console.error(
        "Bid payment order lookup error:",
        paymentOrderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the bid payment order.",
        },
        { status: 500 }
      );
    }

    if (!paymentOrder) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order not found or unauthorized.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 4. VERIFY RAZORPAY ORDER ID
    // =====================================================

    if (
      paymentOrder.razorpay_order_id !==
      razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay order mismatch.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. VERIFY RAZORPAY SIGNATURE
    // =====================================================

    const razorpaySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      console.error(
        "Missing RAZORPAY_KEY_SECRET."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          razorpaySecret
        )
        .update(
          `${razorpayOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

    if (
      generatedSignature !==
      razorpaySignature
    ) {
      console.error(
        "Bid Razorpay signature verification failed."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment verification failed.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. VERIFY RAZORPAY ORDER SERVER-SIDE
    // =====================================================

    const keyId =
      process.env.RAZORPAY_KEY_ID;

    if (!keyId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const razorpayOrderResponse =
      await fetch(
        `https://api.razorpay.com/v1/orders/${razorpayOrderId}`,
        {
          method: "GET",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${keyId}:${razorpaySecret}`
              ).toString("base64"),
          },
        }
      );

    const razorpayOrderData =
      await razorpayOrderResponse.json();

    if (
      !razorpayOrderResponse.ok
    ) {
      console.error(
        "Bid Razorpay order lookup failed:",
        razorpayOrderData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the Razorpay order.",
        },
        { status: 502 }
      );
    }

    // =====================================================
    // 7. VERIFY THIS IS A BID PAYMENT
    // =====================================================

    if (
      razorpayOrderData?.notes?.payment_type !==
      "bid"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment order is not a valid bid payment.",
        },
        { status: 400 }
      );
    }

    if (
      razorpayOrderData?.notes?.listing_id !==
      paymentOrder.listing_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bid listing verification failed.",
        },
        { status: 400 }
      );
    }

    if (
      razorpayOrderData?.notes?.user_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bid user verification failed.",
        },
        { status: 400 }
      );
    }

    const paidBidAmount =
      Number(paymentOrder.amount);

    const razorpayOrderAmount =
      Number(
        razorpayOrderData?.amount
      ) / 100;

    if (
      !Number.isFinite(
        paidBidAmount
      ) ||
      !Number.isFinite(
        razorpayOrderAmount
      ) ||
      paidBidAmount !==
        razorpayOrderAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bid payment amount verification failed.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 8. MARK PAYMENT AS PAID
    // =====================================================

    if (
      paymentOrder.status ===
      "pending"
    ) {
      const {
        data: updatedPaymentOrder,
        error: updateError,
      } = await supabaseAdmin
        .from("payment_orders")
        .update({
          razorpay_payment_id:
            razorpayPaymentId,
          razorpay_signature:
            razorpaySignature,
          status: "paid",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          paymentOrder.id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "pending"
        )
        .select(
          `
          id,
          listing_id,
          user_id,
          amount,
          currency,
          razorpay_order_id,
          razorpay_payment_id,
          status
          `
        )
        .maybeSingle();

      if (updateError) {
        console.error(
          "Bid payment status update error:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was verified but could not be saved.",
          },
          { status: 500 }
        );
      }

      if (updatedPaymentOrder) {
        console.log(
          "Bid payment marked as paid:",
          updatedPaymentOrder.id
        );
      }
    }

    // =====================================================
    // 9. CHECK WHETHER THIS BID WAS ALREADY CREATED
    // =====================================================

    const {
      data: existingBid,
      error: existingBidError,
    } = await supabaseAdmin
      .from("bids")
      .select(
        "id, listing_id, bidder_id, amount, created_at"
      )
      .eq(
        "listing_id",
        paymentOrder.listing_id
      )
      .eq(
        "bidder_id",
        user.id
      )
      .eq(
        "amount",
        paidBidAmount
      )
      .gte(
        "created_at",
        paymentOrder.created_at
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (existingBidError) {
      console.error(
        "Existing bid lookup error:",
        existingBidError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify whether the bid was already placed.",
        },
        { status: 500 }
      );
    }

    if (existingBid) {
      return NextResponse.json({
        success: true,
        verified: true,
        alreadyPlaced: true,
        bid: existingBid,
        message:
          "Payment verified and bid is already live.",
      });
    }

    // =====================================================
    // 10. PLACE BID ONLY AFTER PAYMENT VERIFICATION
    // =====================================================

  const {
  data: placedBid,
  error: placeBidError,
} = await supabase.rpc(
  "place_bid",
  {
    p_listing_id:
      paymentOrder.listing_id,
    p_amount:
      paidBidAmount,
  }
);

    if (placeBidError) {
      console.error(
        "place_bid error:",
        placeBidError
      );

      /*
       * If another verification request placed the
       * bid at the same time, check once more before
       * reporting failure.
       */

      const {
        data: retryExistingBid,
      } = await supabaseAdmin
        .from("bids")
        .select(
          "id, listing_id, bidder_id, amount, created_at"
        )
        .eq(
          "listing_id",
          paymentOrder.listing_id
        )
        .eq(
          "bidder_id",
          user.id
        )
        .eq(
          "amount",
          paidBidAmount
        )
        .gte(
          "created_at",
          paymentOrder.created_at
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (retryExistingBid) {
        return NextResponse.json({
          success: true,
          verified: true,
          alreadyPlaced: true,
          bid: retryExistingBid,
          message:
            "Payment verified and bid is now live.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          verified: true,
          error:
            "Payment was verified but the bid could not be placed.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 11. SUCCESS
    // =====================================================

    const finalBid =
      Array.isArray(placedBid)
        ? placedBid[0]
        : placedBid;

    return NextResponse.json({
      success: true,
      verified: true,
      bid: finalBid,
      message:
        "Payment verified successfully. Your bid is now live.",
    });
  } catch (error) {
    console.error(
      "Bid payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to verify bid payment.",
      },
      { status: 500 }
    );
  }
}