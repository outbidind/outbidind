import {
  createHmac,
} from "crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MINIMUM_BID = 99;

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    // =====================================================
    // 1. AUTH
    // =====================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // 2. REQUEST BODY
    // =====================================================

    const body =
      await request.json();

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
      typeof paymentOrderId !==
        "string" ||
      !razorpayPaymentId ||
      typeof razorpayPaymentId !==
        "string" ||
      !razorpayOrderId ||
      typeof razorpayOrderId !==
        "string" ||
      !razorpaySignature ||
      typeof razorpaySignature !==
        "string"
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
    // 3. LOAD LOCAL PAYMENT ORDER
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
      .eq(
        "id",
        paymentOrderId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (paymentOrderError) {
      console.error(
        "Payment order lookup error:",
        paymentOrderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify payment order.",
        },
        { status: 500 }
      );
    }

    if (!paymentOrder) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order was not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 4. DUPLICATE / REPLAY PROTECTION
    // =====================================================

    if (
      paymentOrder.status ===
      "paid"
    ) {
      const {
        data: existingBid,
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
          Number(paymentOrder.amount)
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

      if (existingBid) {
        const {
          data: currentListing,
        } = await supabaseAdmin
          .from("business_listings")
          .select(
            "current_bid"
          )
          .eq(
            "id",
            paymentOrder.listing_id
          )
          .maybeSingle();

        return NextResponse.json({
          success: true,
          bid: existingBid,
          newCurrentBid:
            Number(
              currentListing?.current_bid ??
                0
            ),
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "This payment was already processed but its bid record could not be recovered.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // 5. RAZORPAY ORDER ID MATCH
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
    // 6. LOCAL BID AMOUNT
    // =====================================================

    const paidBidAmount =
      Number(
        paymentOrder.amount
      );

    if (
      !Number.isFinite(
        paidBidAmount
      ) ||
      paidBidAmount < MINIMUM_BID
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid bid amount.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 7. RAZORPAY CONFIG
    // =====================================================

    const keyId =
      process.env.RAZORPAY_KEY_ID;

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay server configuration is missing.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 8. SIGNATURE VERIFICATION
    // =====================================================

    const generatedSignature =
      createHmac(
        "sha256",
        keySecret
      )
        .update(
          `${razorpayOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

    if (
      generatedSignature !==
      razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment signature verification failed.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 9. FETCH RAZORPAY ORDER SERVER-SIDE
    // =====================================================

    const razorpayOrderResponse =
      await fetch(
        `https://api.razorpay.com/v1/orders/${razorpayOrderId}`,
        {
          method: "GET",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${keyId}:${keySecret}`
              ).toString("base64"),
          },
        }
      );

    const razorpayOrderData =
      await razorpayOrderResponse
        .json()
        .catch(() => null);

    if (
      !razorpayOrderResponse.ok
    ) {
      console.error(
        "Razorpay order fetch failed:",
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
    // 10. VERIFY RAZORPAY ORDER AMOUNT
    // =====================================================

    const razorpayAmount =
      Number(
        razorpayOrderData?.amount
      );

    const expectedAmount =
      Math.round(
        paidBidAmount * 100
      );

    if (
      !Number.isFinite(
        razorpayAmount
      ) ||
      razorpayAmount !==
        expectedAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount does not match the bid amount.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 11. VERIFY RAZORPAY NOTES
    // =====================================================

    const notes =
      razorpayOrderData?.notes ??
      {};

    if (
      notes.payment_type !==
      "bid"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment is not registered as a bid payment.",
        },
        { status: 400 }
      );
    }

    if (
      notes.listing_id !==
      paymentOrder.listing_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment listing mismatch.",
        },
        { status: 400 }
      );
    }

    if (
      notes.user_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment user mismatch.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 12. VERIFY PAYMENT STATUS WITH RAZORPAY
    // =====================================================

    const paymentResponse =
      await fetch(
        `https://api.razorpay.com/v1/payments/${razorpayPaymentId}`,
        {
          method: "GET",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${keyId}:${keySecret}`
              ).toString("base64"),
          },
        }
      );

    const paymentData =
      await paymentResponse
        .json()
        .catch(() => null);

    if (
      !paymentResponse.ok
    ) {
      console.error(
        "Razorpay payment fetch failed:",
        paymentData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the Razorpay payment.",
        },
        { status: 502 }
      );
    }

    if (
      paymentData?.order_id !==
      razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay payment order mismatch.",
        },
        { status: 400 }
      );
    }

    if (
      Number(
        paymentData?.amount
      ) !== expectedAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay payment amount mismatch.",
        },
        { status: 400 }
      );
    }

    if (
      paymentData?.status !==
      "captured"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has not been captured.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 13. MARK PAYMENT PAID
    // =====================================================

    const {
      error: paymentUpdateError,
    } = await supabaseAdmin
      .from("payment_orders")
      .update({
        razorpay_payment_id:
          razorpayPaymentId,

        razorpay_signature:
          razorpaySignature,

        status:
          "paid",

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
      );

    if (paymentUpdateError) {
      console.error(
        "Payment status update error:",
        paymentUpdateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was verified but could not be recorded safely.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 14. CALL AUTHENTICATED place_bid()
    // =====================================================
    //
    // IMPORTANT:
    // Use the authenticated Supabase client.
    // Do NOT use supabaseAdmin.rpc() here because
    // place_bid() uses auth.uid().
    // =====================================================

    const {
      data: bidResult,
      error: bidError,
    } = await supabase.rpc(
      "place_bid",
      {
        p_listing_id:
          paymentOrder.listing_id,

        p_amount:
          paidBidAmount,
      }
    );

    if (bidError) {
      console.error(
        "place_bid RPC failed:",
        bidError
      );

      // ===================================================
      // RECOVERY: CHECK WHETHER BID WAS ACTUALLY INSERTED
      // ===================================================

      const {
        data: recoveredBid,
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

      if (!recoveredBid) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was verified but the bid could not be completed. Please contact support with your payment details.",
          },
          { status: 500 }
        );
      }

      const {
        data: recoveredListing,
      } =
        await supabaseAdmin
          .from("business_listings")
          .select(
            "current_bid"
          )
          .eq(
            "id",
            paymentOrder.listing_id
          )
          .maybeSingle();

      return NextResponse.json({
        success: true,
        bid: recoveredBid,
        newCurrentBid:
          Number(
            recoveredListing?.current_bid ??
              0
          ),
      });
    }

    // =====================================================
    // 15. EXTRACT RESULT
    // =====================================================

    const bidObject =
      bidResult &&
      typeof bidResult ===
        "object"
        ? bidResult
        : null;

    const newCurrentBid =
      Number(
        bidObject?.new_current_bid ??
          0
      );

    // =====================================================
    // 16. GET ACTUAL BID RECORD
    // =====================================================

    const {
      data: insertedBid,
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

    // =====================================================
    // 17. SUCCESS
    // =====================================================

    return NextResponse.json({
      success: true,

      bid:
        insertedBid ??
        {
          id: null,
          listing_id:
            paymentOrder.listing_id,
          bidder_id:
            user.id,
          amount:
            paidBidAmount,
          created_at:
            new Date().toISOString(),
        },

      bidAmount:
        paidBidAmount,

      newCurrentBid,
    });
  } catch (error) {
    console.error(
      "Verify bid payment error:",
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