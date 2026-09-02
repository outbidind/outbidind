import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
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
      console.error(
        "Listing lookup error:",
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
            "Business listing not found or unauthorized.",
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
          error:
            "This listing has not passed security approval.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. SERVER-SIDE PAYMENT AMOUNT
    // =====================================================

    const amount =
      Number(listing.starting_bid);

    if (
      !Number.isFinite(amount) ||
      amount < 99
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    const amountInPaise =
      Math.round(amount * 100);

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
      .eq(
        "listing_id",
        listing.id
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "pending"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
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
          error:
            "Unable to check existing payment orders.",
        },
        { status: 500 }
      );
    }

    /*
     * Existing pending order found.
     *
     * Do NOT create another Razorpay order.
     */
    if (existingPaymentOrder) {
      return NextResponse.json({
        success: true,
        paymentOrderId:
          existingPaymentOrder.id,
        orderId:
          existingPaymentOrder.razorpay_order_id,
        amount:
          Math.round(
            Number(
              existingPaymentOrder.amount
            ) * 100
          ),
        currency:
          existingPaymentOrder.currency,
        keyId,
      });
    }

    // =====================================================
    // 8. CREATE RAZORPAY ORDER
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
              `outbidind_${listing.id.slice(
                0,
                20
              )}_${Date.now()}`,

            notes: {
              listing_id:
                listing.id,
              user_id:
                user.id,
              business_name:
                listing.business_name,
            },
          }),
        }
      );

    const razorpayData =
      await razorpayResponse.json();

    // =====================================================
    // 9. HANDLE RAZORPAY CREATION FAILURE
    // =====================================================

    if (!razorpayResponse.ok) {
      console.error(
        "Razorpay order creation failed:",
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
        "Razorpay returned an invalid order:",
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
    // 10. SAVE PAYMENT ORDER IN SUPABASE
    // =====================================================

    const paymentInsertPayload = {
      listing_id:
        listing.id,
      user_id:
        user.id,
      amount,
      currency: "INR",
      razorpay_order_id:
        razorpayOrderId,
      status: "pending",
    };

    const {
      data: paymentOrder,
      error: paymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .insert(
        paymentInsertPayload
      )
      .select(
        "id, listing_id, user_id, amount, currency, razorpay_order_id, status"
      )
      .single();

    // =====================================================
    // 11. DATABASE INSERT SUCCESS
    // =====================================================

    if (
      !paymentError &&
      paymentOrder
    ) {
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
      });
    }

    // =====================================================
    // 12. DATABASE INSERT FAILED
    // =====================================================

    console.error(
      "Payment order database error:",
      paymentError
    );

    /*
     * IMPORTANT:
     *
     * The Razorpay order already exists.
     *
     * Before retrying the INSERT, check whether the
     * database operation actually succeeded but returned
     * an error/timeout.
     */

    const {
      data: recoveredPaymentOrder,
      error:
        recoveryLookupError,
    } = await supabaseAdmin
      .from("payment_orders")
      .select(
        "id, listing_id, user_id, amount, currency, razorpay_order_id, status"
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

    // =====================================================
    // 13. RECOVER IF INSERT ACTUALLY SUCCEEDED
    // =====================================================

    if (
      !recoveryLookupError &&
      recoveredPaymentOrder
    ) {
      console.warn(
        "Payment order recovered after database error:",
        razorpayOrderId
      );

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
      });
    }

    // =====================================================
    // 14. ONE DATABASE INSERT RETRY
    // =====================================================

    console.warn(
      "Retrying payment order database insert:",
      razorpayOrderId
    );

    const {
      data: retryPaymentOrder,
      error: retryPaymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .insert(
        paymentInsertPayload
      )
      .select(
        "id, listing_id, user_id, amount, currency, razorpay_order_id, status"
      )
      .single();

    // =====================================================
    // 15. RETRY SUCCESS
    // =====================================================

    if (
      !retryPaymentError &&
      retryPaymentOrder
    ) {
      console.log(
        "Payment order database retry succeeded:",
        razorpayOrderId
      );

      return NextResponse.json({
        success: true,
        paymentOrderId:
          retryPaymentOrder.id,
        orderId:
          razorpayOrderId,
        amount:
          razorpayData.amount,
        currency:
          razorpayData.currency,
        keyId,
      });
    }

    // =====================================================
    // 16. RETRY ALSO FAILED
    // =====================================================

    console.error(
      "Payment order database retry failed:",
      retryPaymentError
    );

    /*
     * Razorpay does not provide a normal cancel endpoint
     * for Orders.
     *
     * Therefore, we DO NOT pretend the order was cancelled.
     *
     * Instead, mark the Razorpay order with diagnostic
     * notes so it can be identified/reconciled later.
     */

    try {
      const noteUpdateResponse =
        await fetch(
          `https://api.razorpay.com/v1/orders/${razorpayOrderId}`,
          {
            method: "PATCH",
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
              notes: {
                listing_id:
                  listing.id,
                user_id:
                  user.id,
                business_name:
                  listing.business_name,
                db_save_status:
                  "failed",
                db_save_failed_at:
                  new Date().toISOString(),
              },
            }),
          }
        );

      if (!noteUpdateResponse.ok) {
        const noteUpdateData =
          await noteUpdateResponse
            .json()
            .catch(() => null);

        console.error(
          "Failed to mark Razorpay order with DB failure:",
          noteUpdateData
        );
      }
    } catch (noteError) {
      console.error(
        "Razorpay order diagnostic update failed:",
        noteError
      );
    }

    // =====================================================
    // 17. FINAL FAILURE RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: false,
        error:
          "Payment order could not be saved. Please try again. No payment should be made from this attempt.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error(
      "Create payment order error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create payment order.",
      },
      { status: 500 }
    );
  }
}