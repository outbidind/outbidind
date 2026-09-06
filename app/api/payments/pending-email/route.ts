import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPendingBusinessEmail } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "Listing ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Authenticate the current user using the
     * server-side Supabase client.
     */
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "Your account does not have an email address.",
        },
        { status: 400 }
      );
    }

    /*
     * Fetch the listing and make sure it belongs to
     * the authenticated user.
     */
    const {
      data: listing,
      error: listingError,
    } = await supabaseAdmin
      .from("business_listings")
      .select(
        "id, business_name, listing_status, owner_id"
      )
      .eq("id", listingId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (listingError) {
      console.error(
        "Pending email listing lookup failed:",
        listingError
      );

      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "Unable to check the business listing.",
        },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "Business listing not found.",
        },
        { status: 404 }
      );
    }

    /*
     * If the listing is already live, the payment has
     * completed and the existing LIVE email flow handles
     * the live notification.
     */
    if (listing.listing_status === "live") {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "listing_live",
      });
    }

    /*
     * Check whether any payment for this listing has
     * already been completed.
     */
    const {
      data: paidPayment,
      error: paidPaymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("user_id", user.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();

    if (paidPaymentError) {
      console.error(
        "Pending email payment lookup failed:",
        paidPaymentError
      );

      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "Unable to check payment status.",
        },
        { status: 500 }
      );
    }

    /*
     * Payment is already paid.
     * Do NOT send the pending email.
     */
    if (paidPayment) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "payment_paid",
      });
    }

    /*
     * Payment is still incomplete.
     * Send the pending business email.
     */
    try {
      await sendPendingBusinessEmail({
        to: user.email,
        businessName: listing.business_name,
        listingId: listing.id,
      });

      return NextResponse.json({
        success: true,
        sent: true,
        reason: "payment_incomplete",
      });
    } catch (emailError) {
      console.error(
        "Pending business email failed:",
        emailError
      );

      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: "Unable to send pending business email.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      "Pending payment email API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        sent: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}