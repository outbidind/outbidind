import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    /* =====================================================
       AUTH
       ===================================================== */

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

    /* =====================================================
       REQUEST DATA
       ===================================================== */

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

    /* =====================================================
       LOCAL PAYMENT ORDER
       ===================================================== */

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
          error:
            "Unable to verify the payment order.",
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

    /* =====================================================
       RAZORPAY ORDER MATCH
       ===================================================== */

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

    /* =====================================================
       ACTIVATE LISTING
       
       Payment verified:
       
       approved → live
       
       This is the only place where a listing becomes
       live through the listing-payment flow.
       ===================================================== */

    const activateListing = async () => {
      const {
        data: listing,
        error: listingError,
      } = await supabaseAdmin
        .from("business_listings")
        .update({
          listing_status: "live",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          paymentOrder.listing_id
        )
        .eq(
          "owner_id",
          user.id
        )
        .eq(
          "listing_status",
          "approved"
        )
        .select(
          `
          id,
          business_name,
          listing_status,
          current_bid,
          starting_bid
          `
        )
        .maybeSingle();

      if (listingError) {
        console.error(
          "Listing activation error:",
          listingError
        );

        return {
          success: false,
          listing: null,
        };
      }

      /*
       * If no row was updated, check whether the listing
       * is already live.
       *
       * This keeps verification safely retryable.
       */

      if (!listing) {
        const {
          data: existingListing,
          error: existingError,
        } = await supabaseAdmin
          .from("business_listings")
          .select(
            `
            id,
            business_name,
            listing_status,
            current_bid,
            starting_bid
            `
          )
          .eq(
            "id",
            paymentOrder.listing_id
          )
          .eq(
            "owner_id",
            user.id
          )
          .maybeSingle();

        if (existingError) {
          console.error(
            "Existing listing lookup error:",
            existingError
          );

          return {
            success: false,
            listing: null,
          };
        }

        if (
          existingListing?.listing_status ===
          "live"
        ) {
          return {
            success: true,
            listing: existingListing,
          };
        }

        console.error(
          "Listing was paid but is not eligible to become live."
        );

        return {
          success: false,
          listing: null,
        };
      }

      return {
        success: true,
        listing,
      };
    };

    /* =====================================================
       ALREADY PAID
       ===================================================== */

    if (
      paymentOrder.status ===
      "paid"
    ) {
      const activationResult =
        await activateListing();

      if (
        !activationResult.success
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was already verified, but the business could not be activated. Please retry.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        verified: true,
        listing:
          activationResult.listing,
        message:
          "Payment has already been verified and the business is live.",
      });
    }

    /* =====================================================
       PAYMENT MUST BE PENDING
       ===================================================== */

    if (
      paymentOrder.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment order is not pending.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       RAZORPAY SECRET
       ===================================================== */

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

    /* =====================================================
       SIGNATURE VERIFICATION
       ===================================================== */

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

    const signaturesMatch =
      generatedSignature ===
      razorpaySignature;

    if (!signaturesMatch) {
      console.error(
        "Razorpay signature verification failed."
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

    /* =====================================================
       MARK PAYMENT AS PAID
       ===================================================== */

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
        amount,
        currency,
        razorpay_order_id,
        razorpay_payment_id,
        status,
        updated_at
        `
      )
      .single();

    /* =====================================================
       PAYMENT UPDATE RACE / RETRY
       ===================================================== */

    if (updateError) {
      console.error(
        "Payment status update error:",
        updateError
      );

      const {
        data: currentPaymentOrder,
      } = await supabaseAdmin
        .from("payment_orders")
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
        .eq(
          "id",
          paymentOrder.id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        currentPaymentOrder?.status ===
        "paid"
      ) {
        const activationResult =
          await activateListing();

        if (
          !activationResult.success
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Payment was verified but the business could not be activated. Please retry.",
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          alreadyPaid: true,
          verified: true,
          paymentOrder:
            currentPaymentOrder,
          listing:
            activationResult.listing,
          message:
            "Payment verified and business activated.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was verified but could not be saved.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       PAYMENT SUCCESS → BUSINESS LIVE
       ===================================================== */

    const activationResult =
      await activateListing();

    if (
      !activationResult.success
    ) {
      /*
       * Payment stays paid.
       *
       * A retry can safely complete activation.
       */
      return NextResponse.json(
        {
          success: false,
          verified: true,
          paymentOrder:
            updatedPaymentOrder,
          error:
            "Payment was verified but the business could not be activated. Please retry.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       FINAL SUCCESS
       ===================================================== */

    return NextResponse.json({
      success: true,
      verified: true,
      paymentOrder:
        updatedPaymentOrder,
      listing:
        activationResult.listing,
      message:
        "Payment verified successfully. Business is now live.",
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}