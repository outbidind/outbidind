import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MINIMUM_BID = 99;

export async function POST(request: Request) {
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

    const paymentOrderId =
      body?.paymentOrderId;

    if (
      !paymentOrderId ||
      typeof paymentOrderId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order ID is required.",
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
          razorpay_payment_id,
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
        "Dodo bid payment order lookup error:",
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
    // 4. PAYMENT MUST BE PAID
    // =====================================================

    /*
     * Dodo's server-side webhook is responsible for
     * verifying the payment and changing the local
     * payment order from pending → paid.
     *
     * We do NOT trust the browser to declare a payment
     * successful.
     */
    if (paymentOrder.status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          pending: true,
          error:
            "Payment is still being confirmed. Please wait a moment and try again.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // 5. LOCAL BID AMOUNT
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
    // 6. GET CURRENT LISTING
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
      .eq(
        "id",
        paymentOrder.listing_id
      )
      .maybeSingle();

    if (listingError) {
      console.error(
        "Dodo bid listing lookup error:",
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
            "Business listing was not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 7. LISTING MUST STILL BE LIVE
    // =====================================================

    if (
      listing.listing_status !==
      "live"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This auction is no longer live.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 8. DUPLICATE / REPLAY PROTECTION
    // =====================================================

    /*
     * If the payment was already used to create a bid,
     * return that existing bid instead of placing another
     * bid when the browser retries the request.
     */
    const {
      data: existingBids,
      error: existingBidError,
    } = await supabaseAdmin
      .from("bids")
      .select(
        `
          id,
          listing_id,
          bidder_id,
          amount,
          created_at
        `
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
      .limit(1);

    if (existingBidError) {
      console.error(
        "Existing Dodo bid lookup error:",
        existingBidError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check whether this bid was already processed.",
        },
        { status: 500 }
      );
    }

    const existingBid =
      existingBids?.[0] ?? null;

    if (existingBid) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        bid: existingBid,
        bidAmount:
          paidBidAmount,
        newCurrentBid:
          Number(
            listing.current_bid ?? 0
          ),
      });
    }

    // =====================================================
    // 9. AUTHENTICATED place_bid()
    // =====================================================

    /*
     * IMPORTANT:
     *
     * Keep using the authenticated Supabase client here.
     *
     * DO NOT use supabaseAdmin.rpc().
     *
     * The existing place_bid() function uses auth.uid()
     * to identify the bidder.
     */
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
        "Dodo place_bid RPC failed:",
        bidError
      );

      // ===================================================
      // RECOVERY: CHECK WHETHER BID WAS ACTUALLY INSERTED
      // ===================================================

      const {
        data: recoveredBids,
      } = await supabaseAdmin
        .from("bids")
        .select(
          `
            id,
            listing_id,
            bidder_id,
            amount,
            created_at
          `
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
        .limit(1);

      const recoveredBid =
        recoveredBids?.[0] ?? null;

      if (!recoveredBid) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was verified but the bid could not be completed. Please try again.",
          },
          { status: 500 }
        );
      }

      const {
        data: recoveredListing,
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
        alreadyProcessed: true,
        bid: recoveredBid,
        bidAmount:
          paidBidAmount,
        newCurrentBid:
          Number(
            recoveredListing?.current_bid ??
              0
          ),
      });
    }

    // =====================================================
    // 10. EXTRACT RESULT
    // =====================================================

    const bidObject =
      bidResult &&
      typeof bidResult === "object"
        ? bidResult
        : null;

    const newCurrentBid =
      Number(
        bidObject?.new_current_bid ??
          0
      );

    // =====================================================
    // 11. GET ACTUAL BID RECORD
    // =====================================================

    const {
      data: insertedBids,
    } = await supabaseAdmin
      .from("bids")
      .select(
        `
          id,
          listing_id,
          bidder_id,
          amount,
          created_at
        `
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
      .limit(1);

    const insertedBid =
      insertedBids?.[0] ?? null;

    // =====================================================
    // 12. SUCCESS
    // =====================================================

    return NextResponse.json({
      success: true,

      bid:
        insertedBid ?? {
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
      "Verify Dodo bid payment error:",
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