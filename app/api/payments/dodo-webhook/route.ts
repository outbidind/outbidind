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
      bid_amount?: string;
      business_name?: string;
    };

    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. READ RAW WEBHOOK BODY
    // =====================================================

    const rawBody = await request.text();

    // =====================================================
    // 2. READ WEBHOOK HEADERS
    // =====================================================

    const webhookId =
      request.headers.get("webhook-id");

    const webhookSignature =
      request.headers.get(
        "webhook-signature"
      );

    const webhookTimestamp =
      request.headers.get(
        "webhook-timestamp"
      );

    if (
      !webhookId ||
      !webhookSignature ||
      !webhookTimestamp
    ) {
      return NextResponse.json(
        {
          error:
            "Missing webhook headers",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. VERIFY DODO WEBHOOK SIGNATURE
    // =====================================================

    const event =
      dodo.webhooks.unwrap(
        rawBody,
        {
          headers: {
            "webhook-id":
              webhookId,

            "webhook-signature":
              webhookSignature,

            "webhook-timestamp":
              webhookTimestamp,
          },
        }
      ) as unknown as DodoWebhookEvent;

    console.log(
      "Dodo webhook received:",
      {
        id: webhookId,
        type: event.type,
      }
    );

    // =====================================================
    // 4. ONLY PAYMENT EVENTS
    // =====================================================

    if (
      event.type !==
        "payment.succeeded" &&
      event.type !==
        "payment.failed"
    ) {
      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    // =====================================================
    // 5. READ PAYMENT METADATA
    // =====================================================

    const paymentData =
      event.data;

    const paymentOrderId =
      paymentData?.metadata
        ?.payment_order_id;

    const listingId =
      paymentData?.metadata
        ?.listing_id;

    const userId =
      paymentData?.metadata
        ?.user_id;

    const paymentType =
      paymentData?.metadata
        ?.payment_type;

    const dodoPaymentId =
      paymentData?.payment_id;

    if (
      !paymentOrderId ||
      !listingId ||
      !userId ||
      !paymentType
    ) {
      console.error(
        "Dodo webhook is missing required metadata:",
        {
          webhookId,
          type: event.type,
          hasPaymentOrderId:
            Boolean(
              paymentOrderId
            ),
          hasListingId:
            Boolean(listingId),
          hasUserId:
            Boolean(userId),
          paymentType,
        }
      );

      return NextResponse.json(
        {
          error:
            "Missing or invalid payment metadata.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. ONLY OUR TWO PAYMENT TYPES
    // =====================================================

    if (
      paymentType !==
        "business_listing" &&
      paymentType !== "bid"
    ) {
      console.error(
        "Unsupported OutbidInd payment type:",
        {
          webhookId,
          paymentType,
        }
      );

      return NextResponse.json(
        {
          error:
            "Unsupported payment type.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 7. FIND LOCAL PAYMENT ORDER
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
          status
        `
      )
      .eq(
        "id",
        paymentOrderId
      )
      .eq(
        "listing_id",
        listingId
      )
      .eq(
        "user_id",
        userId
      )
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
          error:
            "Payment order not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 8. PAYMENT FAILED
    // =====================================================

    if (
      event.type ===
      "payment.failed"
    ) {
      /*
       * Only pending orders are changed to failed.
       *
       * A late failed webhook must never overwrite
       * an already-paid order.
       */
      if (
        paymentOrder.status ===
        "pending"
      ) {
        const {
          error:
            failedUpdateError,
        } = await supabaseAdmin
          .from("payment_orders")
          .update({
            status: "failed",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            paymentOrder.id
          )
          .eq(
            "status",
            "pending"
          );

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

      console.log(
        "Dodo payment marked failed:",
        {
          paymentOrderId:
            paymentOrder.id,

          paymentType,

          dodoPaymentId,
        }
      );

      return NextResponse.json({
        received: true,
        status: "failed",
      });
    }

    // =====================================================
    // 9. PAYMENT SUCCEEDED
    // =====================================================

    if (
      event.type ===
      "payment.succeeded"
    ) {
      /*
       * Mark pending payment as paid.
       *
       * This applies to BOTH:
       *
       * business_listing
       * bid
       */
      if (
        paymentOrder.status ===
        "pending"
      ) {
        const {
          data:
            updatedPaymentOrder,
          error:
            updateError,
        } = await supabaseAdmin
          .from("payment_orders")
          .update({
            status: "paid",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            paymentOrder.id
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
         * Concurrent webhook protection.
         */
        if (
          !updatedPaymentOrder
        ) {
          const {
            data:
              currentPaymentOrder,
            error:
              currentPaymentOrderError,
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
            .eq(
              "id",
              paymentOrder.id
            )
            .maybeSingle();

          if (
            currentPaymentOrderError
          ) {
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
            currentPaymentOrder?.status !==
            "paid"
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

      // ===================================================
      // 10. BID PAYMENT
      // ===================================================

      if (
        paymentType ===
        "bid"
      ) {
        /*
         * IMPORTANT:
         *
         * Do NOT call place_bid() here.
         *
         * This webhook has no authenticated browser
         * session, while place_bid() depends on auth.uid().
         *
         * The authenticated client will call
         * /api/bids/verify-payment after returning from
         * Dodo checkout.
         */
        console.log(
          "Dodo bid payment confirmed:",
          {
            webhookId,
            dodoPaymentId,
            paymentOrderId:
              paymentOrder.id,
            listingId:
              paymentOrder.listing_id,
            userId:
              paymentOrder.user_id,
            amount:
              paymentOrder.amount,
          }
        );

        return NextResponse.json({
          received: true,
          status: "paid",
          paymentType: "bid",
        });
      }

      // ===================================================
      // 11. BUSINESS LISTING PAYMENT
      // ===================================================

      /*
       * Everything below remains the existing
       * business-listing activation flow.
       */

      const {
        data: listing,
        error:
          listingLookupError,
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
        .eq(
          "id",
          paymentOrder.listing_id
        )
        .eq(
          "owner_id",
          paymentOrder.user_id
        )
        .maybeSingle();

      if (
        listingLookupError
      ) {
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
            paymentOrderId:
              paymentOrder.id,

            listingId:
              paymentOrder.listing_id,
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

      // ===================================================
      // 12. ALREADY LIVE
      // ===================================================

      if (
        listing.listing_status ===
        "live"
      ) {
        console.log(
          "Dodo payment already activated listing:",
          {
            paymentOrderId:
              paymentOrder.id,

            listingId:
              listing.id,
          }
        );

        return NextResponse.json({
          received: true,
          status: "paid",
          listingStatus:
            "live",
          alreadyLive: true,
        });
      }

      // ===================================================
      // 13. APPROVED → LIVE
      // ===================================================

      if (
        listing.listing_status !==
        "approved"
      ) {
        console.error(
          "Paid listing is not eligible for activation:",
          {
            paymentOrderId:
              paymentOrder.id,

            listingId:
              listing.id,

            listingStatus:
              listing.listing_status,
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

      // ===================================================
      // 14. ACTIVATE BUSINESS
      // ===================================================

      const {
        data:
          activatedListing,
        error:
          activationError,
      } = await supabaseAdmin
        .from("business_listings")
        .update({
          listing_status:
            "live",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          listing.id
        )
        .eq(
          "owner_id",
          paymentOrder.user_id
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

      // ===================================================
      // 15. CONCURRENT ACTIVATION CHECK
      // ===================================================

      if (
        !activatedListing
      ) {
        const {
          data:
            currentListing,
          error:
            currentListingError,
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
            listing.id
          )
          .eq(
            "owner_id",
            paymentOrder.user_id
          )
          .maybeSingle();

        if (
          currentListingError
        ) {
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

        if (
          currentListing?.listing_status !==
          "live"
        ) {
          return NextResponse.json(
            {
              error:
                "Payment was successful but the business could not be activated.",
            },
            { status: 500 }
          );
        }
      }

      // ===================================================
      // 16. LIVE BUSINESS EMAIL
      // ===================================================

      const {
        data: authUser,
        error:
          authUserError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          paymentOrder.user_id
        );

      if (
        authUserError
      ) {
        console.error(
          "Dodo user lookup for live email failed:",
          authUserError
        );
      }

      /*
       * Email failure must NOT undo successful payment
       * or listing activation.
       */
      if (
        authUser?.user?.email
      ) {
        void sendLiveBusinessEmail({
          to:
            authUser.user.email,

          businessName:
            activatedListing?.business_name ??
            listing.business_name,

          listingId:
            listing.id,
        }).catch(
          (emailError) => {
            console.error(
              "Live business email failed after Dodo payment:",
              emailError
            );
          }
        );
      }

      // ===================================================
      // 17. BUSINESS LISTING SUCCESS
      // ===================================================

      console.log(
        "Dodo business listing payment successfully processed:",
        {
          webhookId,
          dodoPaymentId,
          paymentOrderId:
            paymentOrder.id,
          listingId:
            listing.id,
          listingStatus:
            "live",
        }
      );

      return NextResponse.json({
        received: true,
        status: "paid",
        listingStatus:
          "live",
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
        error:
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}