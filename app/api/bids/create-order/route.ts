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

    const listingId =
      body?.listingId;

    const bidAmount =
      Number(body?.amount);

    if (
      !listingId ||
      typeof listingId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Listing ID is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. SERVER-SIDE AMOUNT VALIDATION
    // =====================================================

    if (
      !Number.isFinite(bidAmount) ||
      bidAmount < MINIMUM_BID
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Minimum bid amount is ₹99.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. GET LIVE LISTING
    // =====================================================

    const {
      data: listing,
      error: listingError,
    } = await supabaseAdmin
      .from("business_listings")
      .select(
        `
          id,
          business_name,
          current_bid,
          listing_status
        `
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
    // 5. LIVE ONLY
    // =====================================================

    if (
      listing.listing_status !==
      "live"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bidding is only available for live auctions.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // IMPORTANT
    //
    // We intentionally DO NOT compare bidAmount
    // with current_bid.
    //
    // Any amount >= ₹99 is valid.
    // =====================================================

    const amountInPaise =
      Math.round(
        bidAmount * 100
      );

    if (
      !Number.isSafeInteger(
        amountInPaise
      ) ||
      amountInPaise <= 0
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
            amount:
              amountInPaise,

            currency: "INR",

            receipt:
              `outbidind_bid_${listing.id.slice(
                0,
                20
              )}_${Date.now()}`,

            notes: {
              payment_type:
                "bid",

              listing_id:
                listing.id,

              user_id:
                user.id,

              bid_amount:
                String(bidAmount),

              business_name:
                listing.business_name,
            },
          }),
        }
      );

    const razorpayData =
      await razorpayResponse
        .json()
        .catch(() => null);

    if (
      !razorpayResponse.ok
    ) {
      console.error(
        "Razorpay bid order creation failed:",
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
      typeof razorpayOrderId !==
        "string"
    ) {
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
    // 8. SAVE PAYMENT ORDER
    // =====================================================

    const {
      data: paymentOrder,
      error: paymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        listing_id:
          listing.id,

        user_id:
          user.id,

        amount:
          bidAmount,

        currency:
          "INR",

        razorpay_order_id:
          razorpayOrderId,

        status:
          "pending",
      })
      .select(
        `
          id,
          listing_id,
          user_id,
          amount,
          currency,
          razorpay_order_id,
          status
        `
      )
      .single();

    if (
      paymentError ||
      !paymentOrder
    ) {
      console.error(
        "Bid payment order database error:",
        paymentError
      );

      // Try to recover an order that may have
      // actually been inserted despite an error.

      const {
        data: recoveredPaymentOrder,
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
            status
          `
        )
        .eq(
          "razorpay_order_id",
          razorpayOrderId
        )
        .eq(
          "listing_id",
          listing.id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        recoveredPaymentOrder
      ) {
        return NextResponse.json({
          success: true,
          paymentOrderId:
            recoveredPaymentOrder.id,
          orderId:
            recoveredPaymentOrder.razorpay_order_id,
          amount:
            Math.round(
              Number(
                recoveredPaymentOrder.amount
              ) * 100
            ),
          currency:
            recoveredPaymentOrder.currency,
          keyId,
          bidAmount,
          listingId:
            listing.id,
          businessName:
            listing.business_name,
        });
      }

      // Retry once.

      const {
        data: retryPaymentOrder,
        error:
          retryPaymentError,
      } = await supabaseAdmin
        .from("payment_orders")
        .insert({
          listing_id:
            listing.id,

          user_id:
            user.id,

          amount:
            bidAmount,

          currency:
            "INR",

          razorpay_order_id:
            razorpayOrderId,

          status:
            "pending",
        })
        .select(
          `
            id,
            listing_id,
            user_id,
            amount,
            currency,
            razorpay_order_id,
            status
          `
        )
        .single();

      if (
        retryPaymentError ||
        !retryPaymentOrder
      ) {
        console.error(
          "Bid payment order retry failed:",
          retryPaymentError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment order could not be saved. Please try again.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentOrderId:
          retryPaymentOrder.id,
        orderId:
          retryPaymentOrder.razorpay_order_id,
        amount:
          razorpayData.amount,
        currency:
          razorpayData.currency,
        keyId,
        bidAmount,
        listingId:
          listing.id,
        businessName:
          listing.business_name,
      });
    }

    // =====================================================
    // 9. SUCCESS
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

      listingId:
        listing.id,

      businessName:
        listing.business_name,
    });
  } catch (error) {
    console.error(
      "Create bid order error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create bid payment.",
      },
      { status: 500 }
    );
  }
}