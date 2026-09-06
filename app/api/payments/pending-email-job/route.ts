import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPendingBusinessEmail } from "@/lib/notifications";

type PendingEmailJobBody = {
  listingId?: string;
};

export const POST = verifySignatureAppRouter(
  async (request: Request) => {
    let body: PendingEmailJobBody;

    try {
      body =
        (await request.json()) as PendingEmailJobBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const listingId =
      body.listingId?.trim();

    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          error: "listingId is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * 1. GET LISTING
     * =====================================================
     */

    const {
      data: listing,
      error: listingError,
    } =
      await supabaseAdmin
        .from("business_listings")
        .select(
          "id, business_name, listing_status, owner_id"
        )
        .eq("id", listingId)
        .maybeSingle();

    if (listingError) {
      console.error(
        "Pending email job listing lookup failed:",
        listingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check listing status.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Listing no longer exists.
     */

    if (!listing) {
      return NextResponse.json(
        {
          success: true,
          sent: false,
          reason:
            "listing_not_found",
        },
        {
          status: 200,
        }
      );
    }

    /*
     * =====================================================
     * 2. LISTING ALREADY LIVE
     * =====================================================
     */

    if (
      listing.listing_status ===
      "live"
    ) {
      return NextResponse.json(
        {
          success: true,
          sent: false,
          reason:
            "listing_live",
        },
        {
          status: 200,
        }
      );
    }

    /*
     * =====================================================
     * 3. ONLY APPROVED LISTINGS NEED PENDING EMAIL
     * =====================================================
     */

    if (
      listing.listing_status !==
      "approved"
    ) {
      return NextResponse.json(
        {
          success: true,
          sent: false,
          reason:
            "listing_not_approved",
        },
        {
          status: 200,
        }
      );
    }

    /*
     * =====================================================
     * 4. CHECK PAYMENT
     * =====================================================
     *
     * Database is authoritative.
     *
     * If payment was completed during the 90 seconds,
     * no pending email is sent.
     */

    const {
      data: paidPayment,
      error:
        paidPaymentError,
    } =
      await supabaseAdmin
        .from("payment_orders")
        .select("id")
        .eq(
          "listing_id",
          listing.id
        )
        .eq(
          "user_id",
          listing.owner_id
        )
        .eq(
          "status",
          "paid"
        )
        .limit(1)
        .maybeSingle();

    if (
      paidPaymentError
    ) {
      console.error(
        "Pending email job payment lookup failed:",
        paidPaymentError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check payment status.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Payment completed.
     * Do NOT send pending email.
     */

    if (paidPayment) {
      return NextResponse.json(
        {
          success: true,
          sent: false,
          reason:
            "payment_completed",
        },
        {
          status: 200,
        }
      );
    }

    /*
     * =====================================================
     * 5. GET OWNER EMAIL
     * =====================================================
     *
     * QStash does not have the user's browser session.
     * Use Supabase Admin Auth on the server.
     */

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        listing.owner_id
      );

    if (
      userError ||
      !user?.email
    ) {
      console.error(
        "Pending email job owner lookup failed:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find listing owner email.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * 6. SEND PENDING PAYMENT EMAIL
     * =====================================================
     */

    try {
      await sendPendingBusinessEmail({
        to: user.email,

        businessName:
          listing.business_name,

        listingId:
          listing.id,
      });

      return NextResponse.json(
        {
          success: true,
          sent: true,
          reason:
            "payment_incomplete",
        },
        {
          status: 200,
        }
      );
    } catch (emailError) {
      console.error(
        "Pending business email job failed:",
        emailError
      );

      /*
       * 500 tells QStash that delivery failed,
       * allowing it to retry.
       */

      return NextResponse.json(
        {
          success: false,
          error:
            "Pending email delivery failed.",
        },
        {
          status: 500,
        }
      );
    }
  }
);