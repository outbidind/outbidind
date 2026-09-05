import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import ApproveButton from "./ApproveButton";
import RejectButton from "./RejectButton";
import StartAuctionButton from "./StartAuctionButton";
import PanelMobileMenu from "@/components/PanelMobileMenu";
export const metadata: Metadata = {
  title: "Admin Dashboard | OutbidInd",
  description:
    "Private OutbidInd administration dashboard for authorized marketplace management.",
  robots: {
    index: false,
    follow: false,
  },
};

type Listing = {
  id: string;
  business_name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  starting_bid: number | null;
  current_bid: number | null;
  business_website: string | null;
  additional_information: string | null;
  listing_status: string;
  ai_review_status: string | null;
  rejection_reason: string | null;
  admin_reviewed_at: string | null;
  created_at: string;
};

type PaymentStatus = {
  listing_id: string;
  status: string;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = await createClient();

  /* =========================================================
     AUTH
  ========================================================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  /* =========================================================
     ADMIN CHECK
  ========================================================= */

  const {
    data: adminStatus,
    error: adminError,
  } = await supabase.rpc(
    "is_current_user_admin"
  );

  if (
    adminError ||
    adminStatus !== true
  ) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">

          <div className="mb-4 text-4xl">
            🔒
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900">
            Access Denied
          </h1>

          <p className="mt-3 text-zinc-600">
            You do not have permission to access the admin dashboard.
          </p>

        </div>
      </main>
    );
  }

  /* =========================================================
     FETCH BUSINESS LISTINGS
  ========================================================= */

  /*
   * Admin dashboard uses the protected RPC.
   *
   * Do NOT query business_listings directly.
   */

  const {
    data: listings,
    error: listingsError,
  } = await supabase.rpc(
    "admin_get_business_listings"
  );

  const allListings: Listing[] =
    (listings ?? []) as Listing[];

  /* =========================================================
     FETCH PAYMENT STATUS
  ========================================================= */

  const {
    data: paymentOrders,
    error: paymentOrdersError,
  } = await supabaseAdmin
    .from("payment_orders")
    .select(
      "listing_id, status, created_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (paymentOrdersError) {
    console.error(
      "Admin payment status error:",
      paymentOrdersError
    );
  }

  /* =========================================================
     LATEST PAYMENT STATUS BY LISTING
  ========================================================= */

  const latestPaymentByListing =
    new Map<string, PaymentStatus>();

  for (
    const payment of
      (paymentOrders ?? []) as PaymentStatus[]
  ) {
    if (
      !latestPaymentByListing.has(
        payment.listing_id
      )
    ) {
      latestPaymentByListing.set(
        payment.listing_id,
        payment
      );
    }
  }

  /* =========================================================
     PAYMENT PENDING CHECK

     Internal DB state:
       approved + unpaid = pending
  ========================================================= */

  const isPaymentPending = (
    listing: Listing
  ) => {
    if (
      listing.listing_status !==
      "approved"
    ) {
      return false;
    }

    const payment =
      latestPaymentByListing.get(
        listing.id
      );

    return payment?.status !== "paid";
  };

  /* =========================================================
     PENDING LISTINGS

     Pending includes:

     1. pending_review
     2. approved but payment not completed
  ========================================================= */

  const pendingListings =
    allListings.filter(
      (listing) =>
        listing.listing_status ===
          "pending_review" ||
        isPaymentPending(listing)
    );

  /* =========================================================
     APPROVED LISTINGS

     Keep approved businesses internally available,
     but exclude unpaid approved listings because those
     are now displayed as Pending.
  ========================================================= */

  const approvedListings =
    allListings.filter(
      (listing) =>
        listing.listing_status ===
          "approved" &&
        !isPaymentPending(listing)
    );

  /* =========================================================
     LIVE LISTINGS
  ========================================================= */

  const liveListings =
    allListings.filter(
      (listing) =>
        listing.listing_status ===
        "live"
    );

  /* =========================================================
     REJECTED LISTINGS
  ========================================================= */

  const rejectedListings =
    allListings.filter(
      (listing) =>
        listing.listing_status ===
        "rejected"
    );

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatMoney = (
    value: number | null
  ) => {
    return `₹${Number(
      value ?? 0
    ).toLocaleString("en-IN")}`;
  };

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return "—";
    }

    return new Date(
      value
    ).toLocaleString("en-IN");
  };

  const securityStatus = (
    status: string | null
  ) => {
    const normalized = (
      status ??
      "not reviewed"
    ).toLowerCase();

    if (
      normalized === "approved" ||
      normalized === "passed"
    ) {
      return (
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Passed
        </span>
      );
    }

    if (
      normalized === "rejected" ||
      normalized === "failed"
    ) {
      return (
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          Failed
        </span>
      );
    }

    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        {status ?? "Not reviewed"}
      </span>
    );
  };

  const paymentStatus = (
    listingId: string
  ) => {
    const payment =
      latestPaymentByListing.get(
        listingId
      );

    const status =
      payment?.status ??
      "not started";

    if (status === "paid") {
      return (
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Paid
        </span>
      );
    }

    if (
      status === "failed" ||
      status === "cancelled"
    ) {
      return (
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          {status === "failed"
            ? "Failed"
            : "Cancelled"}
        </span>
      );
    }

    if (status === "pending") {
      return (
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          Pending
        </span>
      );
    }

    return (
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
        Not Started
      </span>
    );
  };

  const statusBadge = (
    status: string
  ) => {
    if (status === "approved") {
      return (
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Approved
        </span>
      );
    }

    if (status === "live") {
      return (
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          Live
        </span>
      );
    }

    if (status === "rejected") {
      return (
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          Rejected
        </span>
      );
    }

    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        Pending Review
      </span>
    );
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="min-h-screen bg-zinc-50">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-50 border-b border-zinc-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">

          <div className="flex items-center gap-3">

            <Image
              src="/logo.png"
              alt="OutbidInd"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain"
            />

            <div>

              <p className="text-sm font-medium text-zinc-500">
                Outbid<span className="text-[#e4572e]">Ind</span>
              </p>

              <h1 className="text-2xl font-bold text-zinc-900">
                Admin Dashboard
              </h1>

            </div>

          </div>

          <div className="hidden items-center gap-3 sm:flex">

            <a
              href="/"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              View Marketplace
            </a>

            <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700">
              Administrator
            </div>

          </div>

          <PanelMobileMenu admin />

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6">

        {/* PAGE TITLE */}

        <div className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#d94d28]">
            Control Center
          </p>

          <h2 className="mt-2 text-3xl font-bold text-zinc-900">
            Business Listing Management
          </h2>

          <p className="mt-2 max-w-2xl text-zinc-600">
            Monitor businesses submitted to the OutbidInd marketplace.
          </p>

        </div>

        {/* ===================================================
            STATS
        =================================================== */}

        <div className="mb-10 grid gap-4 sm:grid-cols-2">

          {/* =================================================
              PENDING CARD

              CLICK → PENDING SECTION
          ================================================= */}

          <a
            href="#pending"
            className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <p className="text-sm font-medium text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-3xl font-black text-amber-900">
              {pendingListings.length}
            </p>

            <p className="mt-1 text-xs font-medium text-amber-700">
              Awaiting payment or review
            </p>

          </a>

          {/* =================================================
              LIVE CARD

              CLICK → LIVE SECTION
          ================================================= */}

          <a
            href="#live"
            className="block rounded-2xl border border-blue-200 bg-blue-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <p className="text-sm font-medium text-blue-700">
              Live Auctions
            </p>

            <p className="mt-2 text-3xl font-black text-blue-900">
              {liveListings.length}
            </p>

            <p className="mt-1 text-xs font-medium text-blue-700">
              Currently live businesses
            </p>

          </a>

        </div>

        {/* ===================================================
            ERRORS
        =================================================== */}

        {(listingsError ||
          paymentOrdersError) && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Some admin data could not be loaded. Please refresh and try again.
          </div>
        )}

        {/* ===================================================
            PENDING LISTINGS
        =================================================== */}

        <section
          id="pending"
          className="mb-12 scroll-mt-8"
        >

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
              Pending
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Pending Business Listings
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Businesses waiting for security review or listing payment.
            </p>

          </div>

          {pendingListings.length === 0 ? (

            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">

              <div className="mb-3 text-4xl">
                ✓
              </div>

              <h3 className="text-lg font-bold text-zinc-900">
                No Pending Listings
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                There are currently no businesses waiting for review or payment.
              </p>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {pendingListings.map(
                (listing) => {

                  const paymentPending =
                    isPaymentPending(
                      listing
                    );

                  return (
                    <article
                      key={listing.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <h3 className="text-xl font-bold text-zinc-900">
                            {listing.business_name}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-500">
                            {listing.category ??
                              "Uncategorized"}{" "}
                            ·{" "}
                            {listing.location ??
                              "Location not provided"}
                          </p>

                        </div>

                        {paymentPending ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                            Payment Pending
                          </span>
                        ) : (
                          statusBadge(
                            listing.listing_status
                          )
                        )}

                      </div>

                      {listing.description && (
                        <p className="mt-5 text-sm leading-6 text-zinc-600">
                          {listing.description}
                        </p>
                      )}

                      <div className="mt-6 grid grid-cols-2 gap-4">

                        <div className="rounded-xl bg-zinc-50 p-4">

                          <p className="text-xs text-zinc-500">
                            Starting Bid
                          </p>

                          <p className="mt-1 font-semibold text-zinc-900">
                            {formatMoney(
                              listing.starting_bid
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl bg-zinc-50 p-4">

                          <p className="text-xs text-zinc-500">
                            Current Bid
                          </p>

                          <p className="mt-1 font-semibold text-zinc-900">
                            {formatMoney(
                              listing.current_bid
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="mt-5 space-y-3 text-sm">

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="font-semibold text-zinc-900">
                            Security Status:
                          </span>

                          {securityStatus(
                            listing.ai_review_status
                          )}

                        </div>

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="font-semibold text-zinc-900">
                            Payment Status:
                          </span>

                          {paymentStatus(
                            listing.id
                          )}

                        </div>

                        {listing.business_website && (
                          <p>

                            <span className="font-semibold text-zinc-900">
                              Website:
                            </span>{" "}

                            <a
                              href={
                                listing.business_website.startsWith(
                                  "http"
                                )
                                  ? listing.business_website
                                  : `https://${listing.business_website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              Visit Website ↗
                            </a>

                          </p>
                        )}

                        {listing.additional_information && (
                          <div>

                            <p className="font-semibold text-zinc-900">
                              Additional Information
                            </p>

                            <p className="mt-1 whitespace-pre-line text-zinc-600">
                              {listing.additional_information}
                            </p>

                          </div>
                        )}

                      </div>

                      <div className="mt-6 rounded-xl border border-zinc-200 p-4">

                        <p className="text-xs text-zinc-500">
                          Submitted
                        </p>

                        <p className="mt-1 text-sm text-zinc-700">
                          {formatDate(
                            listing.created_at
                          )}
                        </p>

                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">

                        {listing.listing_status ===
                          "pending_review" && (
                          <>
                            <ApproveButton
                              listingId={
                                listing.id
                              }
                            />

                            <RejectButton
                              listingId={
                                listing.id
                              }
                            />
                          </>
                        )}

                        {paymentPending && (
                          <a
                            href={`/business/${listing.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg bg-[#e4572e] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#c94724]"
                          >
                            View Business ↗
                          </a>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* ===================================================
            LIVE AUCTIONS
        =================================================== */}

        <section
          id="live"
          className="mb-12 scroll-mt-8"
        >

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Active Auctions
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Live Auctions
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Businesses currently available for bidding.
            </p>

          </div>

          {liveListings.length === 0 ? (

            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">

              <h3 className="font-bold text-zinc-900">
                No Live Auctions
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                There are currently no live businesses.
              </p>

            </div>

          ) : (

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[950px] text-left">

                  <thead className="border-b border-zinc-200 bg-zinc-50">

                    <tr>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Business
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Category
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Starting Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Current Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Bid Status
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-zinc-100">

                    {liveListings.map(
                      (listing) => {

                        const hasBid =
                          Number(
                            listing.current_bid ??
                              0
                          ) >
                          Number(
                            listing.starting_bid ??
                              0
                          );

                        return (
                          <tr
                            key={listing.id}
                            className="transition hover:bg-zinc-50"
                          >

                            <td className="px-5 py-5">

                              <p className="font-bold text-zinc-900">
                                {listing.business_name}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {listing.location ??
                                  "Location not provided"}
                              </p>

                            </td>

                            <td className="px-5 py-5 text-sm text-zinc-600">
                              {listing.category ??
                                "—"}
                            </td>

                            <td className="px-5 py-5 text-sm font-semibold text-zinc-700">
                              {formatMoney(
                                listing.starting_bid
                              )}
                            </td>

                            <td className="px-5 py-5 text-sm font-black text-zinc-900">
                              {formatMoney(
                                listing.current_bid
                              )}
                            </td>

                            <td className="px-5 py-5">

                              <div className="flex flex-col gap-2">

                                {hasBid ? (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                    Bid Placed
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                                    No Bids Yet
                                  </span>
                                )}

                                {paymentStatus(
                                  listing.id
                                )}

                              </div>

                            </td>

                            <td className="px-5 py-5">

                              <a
                                href={`/business/${listing.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-[#e4572e]"
                              >
                                View Auction ↗
                              </a>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </section>

        {/* ===================================================
            APPROVED BUSINESSES
        =================================================== */}

        {approvedListings.length > 0 && (
          <section className="mb-12">

            <div className="mb-5">

              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Approved Queue
              </p>

              <h2 className="mt-1 text-2xl font-bold text-zinc-900">
                Approved Businesses
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Businesses approved internally and already paid.
              </p>

            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px] text-left">

                  <thead className="border-b border-zinc-200 bg-zinc-50">

                    <tr>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Business
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Category
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Starting Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Current Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Approved
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-zinc-100">

                    {approvedListings.map(
                      (listing) => (

                        <tr
                          key={listing.id}
                          className="transition hover:bg-zinc-50"
                        >

                          <td className="px-5 py-5">

                            <p className="font-bold text-zinc-900">
                              {listing.business_name}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {listing.location ??
                                "Location not provided"}
                            </p>

                          </td>

                          <td className="px-5 py-5 text-sm text-zinc-600">
                            {listing.category ??
                              "—"}
                          </td>

                          <td className="px-5 py-5 text-sm font-semibold text-zinc-700">
                            {formatMoney(
                              listing.starting_bid
                            )}
                          </td>

                          <td className="px-5 py-5 text-sm font-black text-zinc-900">
                            {formatMoney(
                              listing.current_bid
                            )}
                          </td>

                          <td className="px-5 py-5">

                            <div className="flex flex-col items-start gap-2">

                              {statusBadge(
                                listing.listing_status
                              )}

                              {securityStatus(
                                listing.ai_review_status
                              )}

                              {paymentStatus(
                                listing.id
                              )}

                            </div>

                          </td>

                          <td className="px-5 py-5 text-sm text-zinc-600">
                            {formatDate(
                              listing.admin_reviewed_at
                            )}
                          </td>

                          <td className="px-5 py-5">

                            <div className="flex flex-col gap-2">

                              <StartAuctionButton
                                listingId={
                                  listing.id
                                }
                              />

                              <a
                                href={`/business/${listing.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50"
                              >
                                View Business ↗
                              </a>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </section>
        )}

        {/* ===================================================
            REJECTED BUSINESSES
        =================================================== */}

        {rejectedListings.length > 0 && (
          <section>

            <div className="mb-5">

              <p className="text-sm font-semibold uppercase tracking-wider text-red-600">
                Rejected
              </p>

              <h2 className="mt-1 text-2xl font-bold text-zinc-900">
                Rejected Businesses
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Listings rejected during administrator review.
              </p>

            </div>

            <div className="grid gap-5 lg:grid-cols-2">

              {rejectedListings.map(
                (listing) => (

                  <article
                    key={listing.id}
                    className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <h3 className="text-xl font-bold text-zinc-900">
                          {listing.business_name}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {listing.category ??
                            "Uncategorized"}{" "}
                          ·{" "}
                          {listing.location ??
                            "Location not provided"}
                        </p>

                      </div>

                      {statusBadge(
                        listing.listing_status
                      )}

                    </div>

                    <div className="mt-6 rounded-xl bg-red-50 p-4">

                      <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                        Rejection Reason
                      </p>

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-900">
                        {listing.rejection_reason ||
                          "No rejection reason provided."}
                      </p>

                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">

                      <div className="rounded-xl bg-zinc-50 p-4">

                        <p className="text-xs text-zinc-500">
                          Submitted
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-800">
                          {formatDate(
                            listing.created_at
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl bg-zinc-50 p-4">

                        <p className="text-xs text-zinc-500">
                          Reviewed
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-800">
                          {formatDate(
                            listing.admin_reviewed_at
                          )}
                        </p>

                      </div>

                    </div>

                  </article>

                )
              )}

            </div>

          </section>
        )}

      </section>

    </main>
  );
}