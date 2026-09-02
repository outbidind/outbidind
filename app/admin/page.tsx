import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import ApproveButton from "./ApproveButton";
import RejectButton from "./RejectButton";
import StartAuctionButton from "./StartAuctionButton";
import PanelMobileMenu from "@/components/PanelMobileMenu";

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

  const { data: adminStatus, error: adminError } =
    await supabase.rpc("is_current_user_admin");

  if (adminError || adminStatus !== true) {
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
   * IMPORTANT:
   * Do NOT query business_listings directly here.
   *
   * The admin dashboard uses the protected
   * admin_get_business_listings() RPC.
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
     LISTING STATUS FILTERS
  ========================================================= */

  const pendingListings = allListings.filter(
    (listing) =>
      listing.listing_status ===
      "pending_review"
  );

  const approvedListings = allListings.filter(
    (listing) =>
      listing.listing_status ===
      "approved"
  );

  const liveListings = allListings.filter(
    (listing) =>
      listing.listing_status ===
      "live"
  );

  const rejectedListings = allListings.filter(
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
    if (!value) return "—";

    return new Date(
      value
    ).toLocaleString("en-IN");
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

          <div>

            <p className="text-sm font-medium text-zinc-500">
              OutbidInd
            </p>

            <h1 className="text-2xl font-bold text-zinc-900">
              Admin Dashboard
            </h1>

          </div>

          {/* DESKTOP HEADER */}

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

          {/* MOBILE MENU */}

          <PanelMobileMenu admin />

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6">

        {/* ===================================================
            PAGE TITLE
        =================================================== */}

        <div className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#d94d28]">
            Control Center
          </p>

          <h2 className="mt-2 text-3xl font-bold text-zinc-900">
            Business Listing Management
          </h2>

          <p className="mt-2 max-w-2xl text-zinc-600">
            Review, approve and manage businesses submitted to the
            OutbidInd marketplace.
          </p>

        </div>

        {/* ===================================================
            STATS
        =================================================== */}

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Pending */}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="text-sm font-medium text-amber-700">
              Pending Review
            </p>

            <p className="mt-2 text-3xl font-black text-amber-900">
              {pendingListings.length}
            </p>

          </div>

          {/* Approved */}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

            <p className="text-sm font-medium text-emerald-700">
              Approved
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-900">
              {approvedListings.length}
            </p>

          </div>

          {/* Live */}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

            <p className="text-sm font-medium text-blue-700">
              Live Auctions
            </p>

            <p className="mt-2 text-3xl font-black text-blue-900">
              {liveListings.length}
            </p>

          </div>

          {/* Rejected */}

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="text-sm font-medium text-red-700">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-black text-red-900">
              {rejectedListings.length}
            </p>

          </div>

        </div>

        {/* ===================================================
            ERRORS
        =================================================== */}

        {listingsError && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            Unable to load business listings.
          </div>
        )}

        {/* ===================================================
            PENDING LISTINGS
        =================================================== */}

        <section className="mb-12">

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
              Review Queue
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Pending Business Listings
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              These businesses are waiting for administrator approval.
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
                There are currently no businesses waiting for review.
              </p>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {pendingListings.map(
                (listing) => (

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

                      {statusBadge(
                        listing.listing_status
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

                      <p>

                        <span className="font-semibold text-zinc-900">
                          AI Review:
                        </span>{" "}

                        <span className="text-zinc-600">
                          {listing.ai_review_status ??
                            "Not reviewed"}
                        </span>

                      </p>

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

                      <ApproveButton
                        listingId={listing.id}
                      />

                      <RejectButton
                        listingId={listing.id}
                      />

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>

        {/* ===================================================
            LIVE AUCTIONS
        =================================================== */}

        <section className="mb-12">

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Active Auctions
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Live Auctions
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Approved businesses whose auctions have been started
              by an admin.
            </p>

          </div>

          {liveListings.length === 0 ? (

            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">

              <h3 className="font-bold text-zinc-900">
                No Live Auctions
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Start an approved business auction to make it live.
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

                              {hasBid ? (

                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  Bid Placed
                                </span>

                              ) : (

                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                                  No Bids Yet
                                </span>

                              )}

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

        <section className="mb-12">

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              Approved Queue
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Approved Businesses
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Approved businesses waiting to be started as live
              auctions.
            </p>

          </div>

          {approvedListings.length === 0 ? (

            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">

              <h3 className="font-bold text-zinc-900">
                No Approved Businesses
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                No businesses have been approved yet.
              </p>

            </div>

          ) : (

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
                            {statusBadge(
                              listing.listing_status
                            )}
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

          )}

        </section>

        {/* ===================================================
            REJECTED BUSINESSES
        =================================================== */}

        <section>

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-red-600">
              Rejected
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-900">
              Rejected Businesses
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Listings that were rejected during administrator review.
            </p>

          </div>

          {rejectedListings.length === 0 ? (

            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">

              <h3 className="font-bold text-zinc-900">
                No Rejected Businesses
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                No business listings have been rejected.
              </p>

            </div>

          ) : (

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

          )}

        </section>

      </section>

    </main>
  );
}