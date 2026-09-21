import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MINIMUM_BID = 99;

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as
    | "test_mode"
    | "live_mode",
});

export async function POST(request: Request) {
  let createdPaymentOrderId: string | null = null;

  try {
    const supabase = await createClient();

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
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // 2. REQUEST BODY
    // =====================================================

    const body = await request.json();

    const listingId = body?.listingId;
    const bidAmount = Number(body?.amount);

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Listing ID is required.",
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
          error: "Minimum bid amount is ₹99.",
        },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(bidAmount * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
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
          error: "Business listing not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 5. LIVE ONLY
    // =====================================================

    if (listing.listing_status !== "live") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bidding is only available for live auctions.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     *
     * We intentionally do NOT compare bidAmount with
     * current_bid here.
     *
     * The existing place_bid() database function remains
     * the final authority for whether the bid can be placed.
     */

    // =====================================================
    // 6. DODO CONFIG
    // =====================================================

    const apiKey =
      process.env.DODO_PAYMENTS_API_KEY;

    const environment =
      process.env.DODO_PAYMENTS_ENVIRONMENT;

    const productId =
      process.env.DODO_BUSINESS_LISTING_PRODUCT_ID;

    const returnUrl =
      process.env.DODO_PAYMENTS_RETURN_URL;

    if (
      !apiKey ||
      !environment ||
      !productId ||
      !returnUrl
    ) {
      console.error(
        "Dodo bid payment configuration is missing:",
        {
          hasApiKey: Boolean(apiKey),
          environment,
          hasProductId: Boolean(productId),
          hasReturnUrl: Boolean(returnUrl),
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Dodo payment configuration is missing.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 7. CHECK EXISTING PENDING PAYMENT
    // =====================================================

    const {
      data: existingPaymentOrders,
      error: existingPaymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .select(
        `
          id,
          listing_id,
          user_id,
          amount,
          currency,
          status,
          created_at
        `
      )
      .eq("listing_id", listing.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (existingPaymentError) {
      console.error(
        "Existing bid payment lookup error:",
        existingPaymentError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check existing payment orders.",
        },
        { status: 500 }
      );
    }

    /*
     * Reuse a pending payment only when the amount is
     * exactly the same.
     *
     * A different bid amount gets a new payment order.
     */
    const existingPaymentOrder =
      existingPaymentOrders?.find(
        (order) =>
          Number(order.amount) === bidAmount
      );

    let paymentOrderId: string;

    if (existingPaymentOrder) {
      paymentOrderId = existingPaymentOrder.id;
    } else {
      // ===================================================
      // 8. CREATE LOCAL PENDING PAYMENT ORDER
      // ===================================================

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
          status: "pending",
        })
        .select(
          `
            id,
            listing_id,
            user_id,
            amount,
            currency,
            status
          `
        )
        .single();

      if (paymentError || !paymentOrder) {
        console.error(
          "Bid payment order database error:",
          paymentError
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

      paymentOrderId = paymentOrder.id;
      createdPaymentOrderId = paymentOrder.id;
    }

    // =====================================================
    // 9. DODO RETURN URL
    // =====================================================

    const checkoutReturnUrl = new URL("/bid-payment", returnUrl);

    checkoutReturnUrl.searchParams.set(
      "payment",
      "bid-return"
    );

    checkoutReturnUrl.searchParams.set(
      "listingId",
      listing.id
    );

    checkoutReturnUrl.searchParams.set(
      "paymentOrderId",
      paymentOrderId
    );

    // =====================================================
    // 10. CREATE DODO CHECKOUT SESSION
    // =====================================================

    /*
     * Dodo Pay What You Want must be enabled on the
     * configured one-time product.
     *
     * INR amount is supplied in paise.
     */
    const checkoutSession =
      await dodo.checkoutSessions.create({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: amountInPaise,
          },
        ],

        customer: user.email
          ? {
              email: user.email,
              name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                user.email,
            }
          : undefined,

        return_url:
          checkoutReturnUrl.toString(),

        metadata: {
          payment_order_id:
            paymentOrderId,

          listing_id:
            listing.id,

          user_id:
            user.id,

          payment_type:
            "bid",

          bid_amount:
            String(bidAmount),

          business_name:
            listing.business_name,
        },
      });

    // =====================================================
    // 11. GET CHECKOUT URL
    // =====================================================

    const checkoutUrl =
      (
        checkoutSession as {
          checkout_url?: string;
        }
      ).checkout_url ??
      (
        checkoutSession as {
          url?: string;
        }
      ).url;

    if (!checkoutUrl) {
      console.error(
        "Dodo bid checkout session did not return a checkout URL:",
        checkoutSession
      );

      /*
       * If we created a brand-new local payment order
       * and Dodo failed to create checkout, clean it up.
       */
      if (createdPaymentOrderId) {
        await supabaseAdmin
          .from("payment_orders")
          .delete()
          .eq(
            "id",
            createdPaymentOrderId
          )
          .eq(
            "status",
            "pending"
          );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Dodo checkout session could not be created.",
        },
        { status: 502 }
      );
    }

    // =====================================================
    // 12. SUCCESS
    // =====================================================

    console.log(
      "Dodo bid checkout session created:",
      {
        paymentOrderId,
        listingId: listing.id,
        userId: user.id,
        amount: bidAmount,
      }
    );

    return NextResponse.json({
      success: true,

      paymentOrderId,

      checkoutUrl,

      amount:
        amountInPaise,

      currency:
        "INR",

      bidAmount,

      listingId:
        listing.id,

      businessName:
        listing.business_name,
    });
  } catch (error) {
    console.error(
      "Create Dodo bid payment error:",
      error
    );

    /*
     * Clean up only the local payment order created
     * during this request.
     */
    if (createdPaymentOrderId) {
      try {
        const {
          error: cleanupError,
        } = await supabaseAdmin
          .from("payment_orders")
          .delete()
          .eq(
            "id",
            createdPaymentOrderId
          )
          .eq(
            "status",
            "pending"
          );

        if (cleanupError) {
          console.error(
            "Failed to clean up bid payment order:",
            cleanupError
          );
        }
      } catch (cleanupError) {
        console.error(
          "Bid payment cleanup threw an error:",
          cleanupError
        );
      }
    }

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