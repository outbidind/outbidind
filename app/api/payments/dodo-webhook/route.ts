import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendLiveBusinessEmail } from "@/lib/notifications";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as
    | "test_mode"
    | "live_mode",
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
});

type DodoWebhookEvent = {
  type?: string;
  data?: {
    payment_id?: string;
    metadata?: {
      payment_order_id?: string;
      listing_id?: string;
      user_id?: string;
      payment_type?: string;
    };
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const webhookId = request.headers.get("webhook-id");
    const webhookSignature =
      request.headers.get("webhook-signature");
    const webhookTimestamp =
      request.headers.get("webhook-timestamp");

    if (
      !webhookId ||
      !webhookSignature ||
      !webhookTimestamp
    ) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    /*
     * Verify the exact raw webhook body before parsing it.
     */
   const event = dodo.webhooks.unwrap(
  rawBody,
  {
    headers: {
      "webhook-id": webhookId,
      "webhook-signature": webhookSignature,
      "webhook-timestamp": webhookTimestamp,
    },
  }
) as unknown as DodoWebhookEvent;

    console.log("Dodo webhook received:", {
      id: webhookId,
      type: event.type,
    });

    /*
     * We only process business-listing payment events.
     */
    if (
      event.type !== "payment.succeeded" &&
      event.type !== "payment.failed"
    ) {
      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    const paymentData = event.data;

    const paymentOrderId =
      paymentData?.metadata?.payment_order_id;

    const listingId =
      paymentData?.metadata?.listing_id;

    const userId =
      paymentData?.metadata?.user_id;

    const paymentType =
      paymentData?.metadata?.payment_type;

    const dodoPaymentId =
      paymentData?.payment_id;

    if (
      paymentType !== "business_listing" ||
      !paymentOrderId ||
      !listingId ||
      !userId
    ) {
      console.error(
        "Dodo business-listing webhook is missing required metadata:",
        {
          webhookId,
          type: event.type,
          hasPaymentOrderId: Boolean(paymentOrderId),
          hasListingId: Boolean(listingId),
          hasUserId: Boolean(userId),
          paymentType,
        }
      );

      return NextResponse.json(
        {
          error:
            "Missing or invalid business listing payment metadata.",
        },
        { status: 400 }
      );
    }

    /*
     * Find the local payment order.
     *
     * The payment_order_id comes from metadata that our own
     * server placed into the Dodo checkout session.
     */
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
        status
        `
      )
      .eq("id", paymentOrderId)
      .eq("listing_id", listingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (paymentOrderError) {
      console.error(
        "Dodo payment order lookup error:",
        paymentOrderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the local payment order.",
        },
        { status: 500 }
      );
    }

    if (!paymentOrder) {
      console.error(
        "Dodo webhook payment order not found:",
        {
          paymentOrderId,
          listingId,
          userId,
          dodoPaymentId,
        }
      );

      return NextResponse.json(
        {
          error: "Payment order not found.",
        },
        { status: 404 }
      );
    }

    /*
     * payment.failed
     */
    if (event.type === "payment.failed") {
      /*
       * Only move a currently pending payment to failed.
       * This prevents a late failed event from overwriting
       * an already-paid order.
       */
      if (paymentOrder.status === "pending") {
        const {
          error: failedUpdateError,
        } = await supabaseAdmin
          .from("payment_orders")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentOrder.id)
          .eq("status", "pending");

        if (failedUpdateError) {
          console.error(
            "Failed to mark Dodo payment as failed:",
            failedUpdateError
          );

          return NextResponse.json(
            {
              error:
                "Payment failure could not be saved.",
            },
            { status: 500 }
          );
        }
      }

      console.log("Dodo payment marked failed:", {
        paymentOrderId: paymentOrder.id,
        dodoPaymentId,
      });

      return NextResponse.json({
        received: true,
        status: "failed",
      });
    }

    /*
     * payment.succeeded
     *
     * If this webhook is retried after the payment was
     * already marked paid, we still run the activation
     * check because activation itself is idempotent.
     */
    if (event.type === "payment.succeeded") {
      /*
       * Mark the local payment as paid.
       *
       * Only pending orders are transitioned here.
       * If another webhook attempt already marked it paid,
       * we simply continue with the activation check.
       */
      if (paymentOrder.status === "pending") {
        const {
          data: updatedPaymentOrder,
          error: updateError,
        } = await supabaseAdmin
          .from("payment_orders")
          .update({
            status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentOrder.id)
          .eq("status", "pending")
          .select(
            `
            id,
            listing_id,
            user_id,
            amount,
            currency,
            status,
            updated_at
            `
          )
          .maybeSingle();

        if (updateError) {
          console.error(
            "Dodo payment status update error:",
            updateError
          );

          return NextResponse.json(
            {
              error:
                "Payment was successful but could not be saved.",
            },
            { status: 500 }
          );
        }

        /*
         * A concurrent webhook may have changed the row
         * between the lookup and update. Re-read the row.
         */
        if (!updatedPaymentOrder) {
          const {
            data: currentPaymentOrder,
            error: currentPaymentOrderError,
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
              updated_at
              `
            )
            .eq("id", paymentOrder.id)
            .maybeSingle();

          if (currentPaymentOrderError) {
            console.error(
              "Dodo payment order re-check error:",
              currentPaymentOrderError
            );

            return NextResponse.json(
              {
                error:
                  "Unable to confirm payment status.",
              },
              { status: 500 }
            );
          }

          if (
            currentPaymentOrder?.status !== "paid"
          ) {
            return NextResponse.json(
              {
                error:
                  "Payment could not be marked as paid.",
              },
              { status: 500 }
            );
          }
        }
      }

      /*
       * Fetch the current listing.
       */
      const {
        data: listing,
        error: listingLookupError,
      } = await supabaseAdmin
        .from("business_listings")
        .select(
          `
          id,
          owner_id,
          business_name,
          listing_status,
          current_bid,
          starting_bid
          `
        )
        .eq("id", paymentOrder.listing_id)
        .eq("owner_id", paymentOrder.user_id)
        .maybeSingle();

      if (listingLookupError) {
        console.error(
          "Dodo listing lookup error:",
          listingLookupError
        );

        return NextResponse.json(
          {
            error:
              "Payment was saved but the business listing could not be checked.",
          },
          { status: 500 }
        );
      }

      if (!listing) {
        console.error(
          "Dodo payment references missing listing:",
          {
            paymentOrderId: paymentOrder.id,
            listingId: paymentOrder.listing_id,
          }
        );

        return NextResponse.json(
          {
            error:
              "Payment was saved but the business listing was not found.",
          },
          { status: 500 }
        );
      }

      /*
       * Already live:
       * Safe retry / duplicate webhook case.
       */
      if (listing.listing_status === "live") {
        console.log(
          "Dodo payment already activated listing:",
          {
            paymentOrderId: paymentOrder.id,
            listingId: listing.id,
          }
        );

        return NextResponse.json({
          received: true,
          status: "paid",
          listingStatus: "live",
          alreadyLive: true,
        });
      }

      /*
       * Preserve the existing payment rule:
       * approved → live
       */
      if (listing.listing_status !== "approved") {
        console.error(
          "Paid listing is not eligible for activation:",
          {
            paymentOrderId: paymentOrder.id,
            listingId: listing.id,
            listingStatus: listing.listing_status,
          }
        );

        return NextResponse.json(
          {
            error:
              "Payment was successful but the listing is not approved for activation.",
          },
          { status: 500 }
        );
      }

      /*
       * Activate the business.
       *
       * This is the same approved → live transition
       * used by the previous verified-payment flow.
       */
      const {
        data: activatedListing,
        error: activationError,
      } = await supabaseAdmin
        .from("business_listings")
        .update({
          listing_status: "live",
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id)
        .eq("owner_id", paymentOrder.user_id)
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

      if (activationError) {
        console.error(
          "Dodo listing activation error:",
          activationError
        );

        return NextResponse.json(
          {
            error:
              "Payment was successful but the business could not be activated.",
          },
          { status: 500 }
        );
      }

      /*
       * If another webhook activated it first, re-read
       * the listing and treat the result as successful.
       */
      if (!activatedListing) {
        const {
          data: currentListing,
          error: currentListingError,
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
          .eq("id", listing.id)
          .eq("owner_id", paymentOrder.user_id)
          .maybeSingle();

        if (currentListingError) {
          console.error(
            "Dodo listing re-check error:",
            currentListingError
          );

          return NextResponse.json(
            {
              error:
                "Payment was successful but listing activation could not be confirmed.",
            },
            { status: 500 }
          );
        }

        if (currentListing?.listing_status !== "live") {
          return NextResponse.json(
            {
              error:
                "Payment was successful but the business could not be activated.",
            },
            { status: 500 }
          );
        }
      }

      /*
       * Get the user's email for the existing live-business
       * notification flow.
       */
      const {
        data: authUser,
        error: authUserError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          paymentOrder.user_id
        );

      if (authUserError) {
        console.error(
          "Dodo user lookup for live email failed:",
          authUserError
        );
      }

      /*
       * Email failure must NOT undo a successful payment
       * or listing activation.
       */
      if (authUser?.user?.email) {
        void sendLiveBusinessEmail({
          to: authUser.user.email,
          businessName:
            activatedListing?.business_name ??
            listing.business_name,
          listingId: listing.id,
        }).catch((emailError) => {
          console.error(
            "Live business email failed after Dodo payment:",
            emailError
          );
        });
      }

      console.log(
        "Dodo payment successfully processed:",
        {
          webhookId,
          dodoPaymentId,
          paymentOrderId: paymentOrder.id,
          listingId: listing.id,
          listingStatus: "live",
        }
      );

      return NextResponse.json({
        received: true,
        status: "paid",
        listingStatus: "live",
      });
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Dodo webhook processing failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}