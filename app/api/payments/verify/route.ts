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

    const activateListing = async () => {
      /*
       * A successfully paid business is moved from
       * approved → live.
       *
       * Service-role client is used because this is a
       * trusted server-side payment transition.
       */
      const { data: listing, error: listingError } =
        await supabaseAdmin
          .from("business_listings")
          .update({
            listing_status: "live",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentOrder.listing_id)
          .eq("owner_id", user.id)
          .eq("listing_status", "approved")
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
       * If the listing was already live, the update above
       * will return no row because of listing_status=approved.
       *
       * Check whether it is already live so verification
       * remains safely retryable.
       */
      if (!listing) {
        const { data: existingListing, error: existingError } =
          await supabaseAdmin
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
            .eq("id", paymentOrder.listing_id)
            .eq("owner_id", user.id)
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

        if (existingListing?.listing_status === "live") {
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

    /*
     * If this payment was already verified previously,
     * make sure its listing is also LIVE.
     *
     * This makes the endpoint safely retryable if a previous
     * request marked payment as paid but failed during the
     * listing transition.
     */
    if (paymentOrder.status === "paid") {
      const activationResult = await activateListing();

      if (!activationResult.success) {
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
        listing: activationResult.listing,
        message:
          "Payment has already been verified and the business is live.",
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
     * Mark the local payment order as paid.
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

      /*
       * The payment may have been marked paid by a
       * concurrent verification request.
       *
       * Re-check the current payment status before
       * reporting a failure.
       */
      const { data: currentPaymentOrder } =
        await supabaseAdmin
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
          .eq("id", paymentOrder.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (currentPaymentOrder?.status === "paid") {
        const activationResult = await activateListing();

        if (!activationResult.success) {
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
          paymentOrder: currentPaymentOrder,
          listing: activationResult.listing,
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

    /*
     * Payment is now confirmed in our database.
     *
     * Next Day 3 transition:
     * approved → live
     */
    const activationResult = await activateListing();

    if (!activationResult.success) {
      /*
       * Important:
       * Payment remains paid.
       *
       * We do NOT reverse or fake the payment.
       * A retry of this verification endpoint can safely
       * complete the listing activation.
       */
      return NextResponse.json(
        {
          success: false,
          verified: true,
          paymentOrder: updatedPaymentOrder,
          error:
            "Payment was verified but the business could not be activated. Please retry.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentOrder: updatedPaymentOrder,
      listing: activationResult.listing,
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
        error: "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}