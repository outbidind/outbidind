import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    // 1. VERIFY LOGGED-IN USER
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
    // 2. GET LISTING ID
    // =====================================================

    const body = await request.json();
    const listingId = body?.listingId;

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
    // 3. GET USER'S OWN LISTING
    // =====================================================

    const {
      data: listing,
      error: listingError,
    } = await supabaseAdmin
      .from("business_listings")
      .select(
        "id, owner_id, business_name, starting_bid, current_bid, listing_status, ai_review_status"
      )
      .eq("id", listingId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (listingError) {
      console.error("Listing lookup error:", listingError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify the business listing.",
        },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error: "Business listing not found or unauthorized.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 4. PAYMENT ONLY AFTER SECURITY APPROVAL
    // =====================================================

    if (
      listing.listing_status !== "approved" ||
      listing.ai_review_status !== "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This listing has not passed security approval.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. SERVER-SIDE PAYMENT AMOUNT
    // =====================================================

    const amount = Number(listing.starting_bid);

    if (!Number.isFinite(amount) || amount < 99) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(amount * 100);

    // =====================================================
    // 6. DODO CONFIG
    // =====================================================

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT;
   const configuredProductId =
       process.env.DODO_BUSINESS_LISTING_PRODUCT_ID;
    const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL;

    if (!apiKey || !environment || !configuredProductId || !returnUrl) {
      console.error("Dodo server configuration is missing:", {
        hasApiKey: Boolean(apiKey),
        environment,
        hasProductId: Boolean(configuredProductId),
        hasReturnUrl: Boolean(returnUrl),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Dodo payment configuration is missing.",
        },
        { status: 500 }
      );
    }

    // After the check above, these are guaranteed strings.
    const productId: string = configuredProductId;
    const dodoReturnUrl: string = returnUrl;

    // =====================================================
    // 7. REUSE EXISTING PENDING PAYMENT ORDER
    // =====================================================

    const {
      data: existingPaymentOrder,
      error: existingPaymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .select(
        "id, listing_id, user_id, amount, currency, razorpay_order_id, status"
      )
      .eq("listing_id", listing.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "Existing payment order lookup error:",
        existingPaymentError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check existing payment orders.",
        },
        { status: 500 }
      );
    }

    let paymentOrderId: string;
    let paymentAmount = amount;

    if (existingPaymentOrder) {
      paymentOrderId = existingPaymentOrder.id;
      paymentAmount = Number(existingPaymentOrder.amount);

      if (!Number.isFinite(paymentAmount) || paymentAmount < 99) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid existing payment amount.",
          },
          { status: 400 }
        );
      }
    } else {
      // ===================================================
      // 8. CREATE INTERNAL PAYMENT ORDER
      // ===================================================

      const {
        data: paymentOrder,
        error: paymentError,
      } = await supabaseAdmin
        .from("payment_orders")
        .insert({
          listing_id: listing.id,
          user_id: user.id,
          amount: paymentAmount,
          currency: "INR",
          status: "pending",
        })
        .select(
          "id, listing_id, user_id, amount, currency, status"
        )
        .single();

      if (paymentError || !paymentOrder) {
        console.error(
          "Payment order database insert failed:",
          paymentError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Payment order could not be created.",
          },
          { status: 500 }
        );
      }

      paymentOrderId = paymentOrder.id;
      createdPaymentOrderId = paymentOrder.id;
    }

    // =====================================================
    // 9. CREATE DODO CHECKOUT SESSION
    // =====================================================

    const checkoutReturnUrl = new URL(dodoReturnUrl);

    checkoutReturnUrl.searchParams.set("payment", "return");
    checkoutReturnUrl.searchParams.set("listingId", listing.id);
    checkoutReturnUrl.searchParams.set(
      "paymentOrderId",
      paymentOrderId
    );

    const session = await dodo.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          amount: Math.round(paymentAmount * 100),
        },
      ],
     ...(user.email
  ? {
      customer: {
        email: user.email,
        name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email,
      },
    }
  : {}),
      return_url: checkoutReturnUrl.toString(),
      metadata: {
        payment_order_id: paymentOrderId,
        listing_id: listing.id,
        user_id: user.id,
        payment_type: "business_listing",
      },
    });

    const checkoutUrl =
      (session as { checkout_url?: string }).checkout_url ??
      (session as { url?: string }).url;

    if (!checkoutUrl) {
      console.error(
        "Dodo checkout session did not return a checkout URL:",
        session
      );

      if (createdPaymentOrderId) {
        await supabaseAdmin
          .from("payment_orders")
          .delete()
          .eq("id", createdPaymentOrderId)
          .eq("status", "pending");
      }

      return NextResponse.json(
        {
          success: false,
          error: "Dodo checkout session could not be created.",
        },
        { status: 502 }
      );
    }

    console.log("Dodo checkout session created:", {
      paymentOrderId,
      listingId: listing.id,
      amount: paymentAmount,
    });

    // =====================================================
    // 10. RETURN CHECKOUT URL
    // =====================================================

    return NextResponse.json({
      success: true,
      paymentOrderId,
      checkoutUrl,
      amount: Math.round(paymentAmount * 100),
      currency: "INR",
    });
  } catch (error) {
    console.error(
      "Create Dodo payment session error:",
      error
    );

    if (createdPaymentOrderId) {
      try {
        const { error: cleanupError } = await supabaseAdmin
          .from("payment_orders")
          .delete()
          .eq("id", createdPaymentOrderId)
          .eq("status", "pending");

        if (cleanupError) {
          console.error(
            "Failed to clean up payment order after Dodo error:",
            cleanupError
          );
        }
      } catch (cleanupError) {
        console.error(
          "Payment order cleanup threw an error:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create payment session.",
      },
      { status: 500 }
    );
  }
}