import { NextResponse } from "next/server";

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
    // 2. GET BID DATA
    // =====================================================

    const body = await request.json();

    const listingId = body?.listingId;
    const bidAmount = Number(body?.amount);

    if (
      !listingId ||
      typeof listingId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Listing ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(bidAmount) ||
      bidAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid bid amount.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. GET LIVE LISTING
    // =====================================================

    const {
      data: listing,
      error: listingError,
    } = await supabaseAdmin
      .from("business_listings")
      .select(
        "id, business_name, current_bid, listing_status"
      )
      .eq("id", listingId)
      .maybeSingle();

    if (listingError) {
      console.error(
        "Bid listing lookup error:",
        listingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the business listing.",
        },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business listing not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 4. LISTING MUST BE LIVE
    // =====================================================

    if (listing.listing_status !== "live") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bidding is currently unavailable for this business.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. BID MUST BE HIGHER THAN CURRENT BID
    // =====================================================

    const currentBid = Number(
      listing.current_bid ?? 0
    );

    if (
      !Number.isFinite(currentBid)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the current bid.",
        },
        { status: 500 }
      );
    }

    if (bidAmount <= currentBid) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Your bid must be higher than ₹${currentBid.toLocaleString(
              "en-IN"
            )}.`,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. RAZORPAY CONFIG
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
    // 7. CREATE RAZORPAY ORDER
    // =====================================================

    const amountInPaise =
      Math.round(bidAmount * 100);

    const razorpayResponse =
      await fetch(
        "https://api.razorpay.com/v1/orders",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              "Basic " +
              Buffer.from(
                `${keyId}:${keySecret}`
              ).toString("base64"),
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",

            receipt:
              `outbidind_bid_${listing.id.slice(
                0,
                20
              )}_${Date.now()}`,

            notes: {
              payment_type: "bid",
              listing_id: listing.id,
              user_id: user.id,
              bid_amount: bidAmount,
              business_name:
                listing.business_name,
            },
          }),
        }
      );

    const razorpayData =
      await razorpayResponse.json();

    // =====================================================
    // 8. HANDLE RAZORPAY FAILURE
    // =====================================================

    if (!razorpayResponse.ok) {
      console.error(
        "Bid Razorpay order creation failed:",
        razorpayData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay order creation failed.",
        },
        {
          status:
            razorpayResponse.status,
        }
      );
    }

    const razorpayOrderId =
      razorpayData?.id;

    if (
      !razorpayOrderId ||
      typeof razorpayOrderId !== "string"
    ) {
      console.error(
        "Razorpay returned invalid bid order:",
        razorpayData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay returned an invalid order.",
        },
        { status: 502 }
      );
    }

    // =====================================================
    // 9. SAVE PAYMENT ORDER
    // =====================================================

    /*
     * IMPORTANT:
     *
     * For this MVP step, the existing payment_orders
     * table is reused.
     *
     * The bid amount is stored as the payment amount.
     * Razorpay order notes identify this payment as a bid.
     *
     * The actual bid will NOT be inserted here.
     *
     * The bid will only be created after successful
     * Razorpay signature verification in the next step.
     */

    const {
      data: paymentOrder,
      error: paymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        listing_id: listing.id,
        user_id: user.id,
        amount: bidAmount,
        currency: "INR",
        razorpay_order_id:
          razorpayOrderId,
        status: "pending",
      })
      .select(
        "id, listing_id, user_id, amount, currency, razorpay_order_id, status"
      )
      .single();

    if (paymentError || !paymentOrder) {
      console.error(
        "Bid payment order database error:",
        paymentError
      );

      /*
       * Razorpay order already exists.
       * We do not pretend that it was cancelled.
       */
      return NextResponse.json(
        {
          success: false,
          error:
            "Bid payment order could not be saved. Please try again.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 10. RETURN PAYMENT DATA
    // =====================================================

    return NextResponse.json({
      success: true,
      paymentOrderId:
        paymentOrder.id,
      orderId:
        razorpayOrderId,
      amount:
        razorpayData.amount,
      currency:
        razorpayData.currency,
      keyId,
      bidAmount,
      listingId: listing.id,
      businessName:
        listing.business_name,
    });
  } catch (error) {
    console.error(
      "Create bid payment order error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create bid payment order.",
      },
      { status: 500 }
    );
  }
}