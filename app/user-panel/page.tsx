import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import BidForm from "@/components/BidForm";
import PanelMobileMenu from "@/components/PanelMobileMenu";

type Business = {
  id: string;
  business_name: string;
  category: string | null;
  location: string | null;
  starting_bid: number | string | null;
  current_bid: number | string | null;
  listing_status: string;
  rejection_reason: string | null;
  created_at: string;
};

type MyBid = {
  id: string;
  listing_id: string;
  amount: number | string;
  created_at: string;
  business_name: string | null;
  listing_status: string | null;
  current_bid: number | string | null;
};

type PaymentOrder = {
  listing_id: string;
  status: string;
  created_at: string;
};

export default async function UserPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();

  const params = await searchParams;
  const statusFilter = params.status;

  /* =====================================================
     AUTH
     ===================================================== */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login=true");
  }

  /* =====================================================
     MY BUSINESSES
     ===================================================== */

  const {
    data: businessesData,
    error: businessesError,
  } = await supabase.rpc("get_my_business_listings");

  const businesses: Business[] =
    (businessesData ?? []) as Business[];

  /* =====================================================
     MY BIDS
     ===================================================== */

  const {
    data: bidsData,
    error: bidsError,
  } = await supabase.rpc("get_my_bids");

  const myBids: MyBid[] =
    (bidsData ?? []) as MyBid[];

  /* =====================================================
     MY PAYMENT ORDERS
     ===================================================== */

  const {
    data: paymentOrdersData,
    error: paymentOrdersError,
  } = await supabase
    .from("payment_orders")
    .select("listing_id, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const paymentOrders: PaymentOrder[] =
    (paymentOrdersData ?? []) as PaymentOrder[];

  /* =====================================================
     LATEST PAYMENT STATUS BY LISTING
     ===================================================== */

  const latestPaymentByListing =
    new Map<string, PaymentOrder>();

  for (const payment of paymentOrders) {
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

  /* =====================================================
     PAYMENT / AUCTION STATE

     IMPORTANT:
     approved is an INTERNAL database state.

     User-facing:
     approved + unpaid = Pending
     live = Live
     ===================================================== */

  const isPaymentPending = (
    business: Business
  ) => {
    if (
      business.listing_status !==
      "approved"
    ) {
      return false;
    }

    const payment =
      latestPaymentByListing.get(
        business.id
      );

    /*
     * If there is no payment order yet,
     * payment has not been completed.
     *
     * If payment exists but is not paid,
     * it is also pending.
     */
    return payment?.status !== "paid";
  };

  /* =====================================================
     USER-FACING PENDING BUSINESS
     ===================================================== */

  const isPendingBusiness = (
    business: Business
  ) => {
    return (
      business.listing_status ===
        "pending_review" ||
      isPaymentPending(business)
    );
  };

  /* =====================================================
     STATUS FILTERS

     Only Pending and Live are user-facing listing
     states. Approved is intentionally removed.
     ===================================================== */

  const validStatusFilters = [
    "pending",
    "pending_review",
    "live",
    "rejected",
  ];

  const filteredBusinesses =
    statusFilter &&
    validStatusFilters.includes(
      statusFilter
    )
      ? businesses.filter((business) => {
          if (
            statusFilter ===
            "pending"
          ) {
            return isPendingBusiness(
              business
            );
          }

          return (
            business.listing_status ===
            statusFilter
          );
        })
      : businesses;

  /* =====================================================
     COUNTS
     ===================================================== */

  const pendingCount =
    businesses.filter(
      (business) =>
        isPendingBusiness(
          business
        )
    ).length;

  const liveCount =
    businesses.filter(
      (business) =>
        business.listing_status ===
        "live"
    ).length;

  /* =====================================================
     HELPERS
     ===================================================== */

  const formatMoney = (
    value: number | string | null
  ) => {
    return `₹${Number(
      value ?? 0
    ).toLocaleString("en-IN")}`;
  };

  const getStatusLabel = (
    business: Business
  ) => {
    if (isPendingBusiness(business)) {
      return "Pending";
    }

    if (
      business.listing_status ===
      "live"
    ) {
      return "Live";
    }

    if (
      business.listing_status ===
      "rejected"
    ) {
      return "Rejected";
    }

    return business.listing_status.replaceAll(
      "_",
      " "
    );
  };

  const getStatusClass = (
    business: Business
  ) => {
    if (isPendingBusiness(business)) {
      return "bg-amber-50 text-amber-700";
    }

    if (
      business.listing_status ===
      "live"
    ) {
      return "bg-blue-50 text-blue-700";
    }

    if (
      business.listing_status ===
      "rejected"
    ) {
      return "bg-red-50 text-red-700";
    }

    return "bg-amber-50 text-amber-700";
  };

  const getFilterLabel = () => {
    if (statusFilter === "pending") {
      return "Pending";
    }

    if (statusFilter) {
      return statusFilter.replaceAll(
        "_",
        " "
      );
    }

    return "";
  };

  /* =====================================================
     PAGE
     ===================================================== */

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-slate-900">

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="relative z-50 border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/logo.png"
              alt="OutbidInd"
              width={44}
              height={44}
              priority
              className="h-11 w-11 object-contain"
            />

            <span className="text-xl font-bold tracking-tight text-slate-950">
              Outbid<span className="text-[#e4572e]">Ind</span>
            </span>
          </Link>

          <div className="hidden items-center gap-3 sm:flex">

            <Link
              href="/live-bids"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Live Bids
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Marketplace
            </Link>

          </div>

          <PanelMobileMenu />

        </nav>
      </header>

      {/* =================================================
          MAIN
          ================================================= */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">

        {/* TITLE */}

        <div className="mb-10">

          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#d94d28]">
            My Account
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            User Panel
          </h1>

          <p className="mt-3 text-slate-600">
            Manage your listed businesses and track your bids.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Signed in as {user.email}
          </p>

        </div>

        {/* ERRORS */}

        {(businessesError ||
          bidsError ||
          paymentOrdersError) && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Some account data could not be loaded.
            Please refresh and try again.
          </div>
        )}

        {/* STATUS CARDS */}

        <div className="mb-10 grid gap-4 sm:grid-cols-2">

          <Link
            href="/user-panel?status=pending#listings"
            className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-3xl font-black text-amber-900">
              {pendingCount}
            </p>

            <p className="mt-1 text-xs font-medium text-amber-700">
              Complete payment to start auction
            </p>
          </Link>

          <Link
            href="/user-panel?status=live#listings"
            className="block rounded-2xl border border-blue-200 bg-blue-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-blue-700">
              Live
            </p>

            <p className="mt-2 text-3xl font-black text-blue-900">
              {liveCount}
            </p>

            <p className="mt-1 text-xs font-medium text-blue-700">
              Auctions currently live
            </p>
          </Link>

        </div>

        {/* MY LISTINGS */}

        <section
          id="listings"
          className="mb-12"
        >

          <div className="mb-5 flex items-end justify-between gap-4">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wider text-[#d94d28]">
                Your Listings
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                My Listed Businesses
              </h2>

              {statusFilter &&
                validStatusFilters.includes(
                  statusFilter
                ) && (
                  <p className="mt-1 text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-semibold capitalize">
                      {getFilterLabel()}
                    </span>{" "}
                    businesses.
                  </p>
                )}

            </div>

            <div className="flex items-center gap-3">

              {statusFilter &&
                validStatusFilters.includes(
                  statusFilter
                ) && (
                  <Link
                    href="/user-panel#listings"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Show All
                  </Link>
                )}

              <Link
                href="/"
                className="rounded-lg bg-[#e4572e] px-4 py-2 text-sm font-bold text-white hover:bg-[#c94724]"
              >
                List Business
              </Link>

            </div>

          </div>

          {filteredBusinesses.length === 0 ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <h3 className="text-lg font-bold text-slate-950">
                No businesses listed yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {statusFilter
                  ? "No businesses found for this status."
                  : "Your submitted businesses will appear here."}
              </p>

            </div>

          ) : (

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left">

                  <thead className="border-b border-slate-200 bg-slate-50">

                    <tr>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Business
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Starting Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredBusinesses.map(
                      (business) => {

                        const paymentPending =
                          isPaymentPending(
                            business
                          );

                        const pendingBusiness =
                          isPendingBusiness(
                            business
                          );

                        return (

                          <tr
                            key={business.id}
                            className={`relative transition ${
                              pendingBusiness
                                ? "bg-amber-50/40 hover:bg-amber-50"
                                : "hover:bg-slate-50"
                            }`}
                          >

                            {/* BUSINESS */}


                            <td className="relative z-10 px-5 py-5">

                              <Link
                                href={`/business/${business.id}`}
                                className="group block"
                              >

                                <p className="font-bold text-slate-950 group-hover:text-[#e4572e]">
                                  {business.business_name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {business.category ??
                                    "Uncategorized"}{" "}
                                  ·{" "}
                                  {business.location ??
                                    "Location not provided"}
                                </p>

                              </Link>

                            </td>

                            {/* STATUS */}

                            <td className="relative z-10 px-5 py-5">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                                  business
                                )}`}
                              >
                                {getStatusLabel(
                                  business
                                )}
                              </span>

                              {paymentPending && (
                                <p className="mt-2 text-xs font-semibold text-amber-700">
                                  Complete payment to start auction
                                </p>
                              )}

                              {business.rejection_reason && (
                                <p className="mt-2 max-w-xs text-xs text-red-600">
                                  {business.rejection_reason}
                                </p>
                              )}

                            </td>

                            {/* STARTING BID */}

                            <td className="relative z-10 px-5 py-5 text-sm font-semibold">
                              {formatMoney(
                                business.starting_bid
                              )}
                            </td>

                            {/* CURRENT BID */}

                            <td className="relative z-10 px-5 py-5 text-sm font-black">
                              {formatMoney(
                                business.current_bid
                              )}
                            </td>

                            {/* ACTION */}

                            <td className="relative z-10 px-5 py-5">

                              <div className="space-y-3">

                                <Link
                                  href={`/business/${business.id}`}
                                  className={`inline-flex rounded-lg px-4 py-2 text-xs font-bold transition ${
                                    paymentPending
                                      ? "bg-[#e4572e] text-white hover:bg-[#c94724]"
                                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {paymentPending
                                    ? "Complete Payment"
                                    : "View"}
                                </Link>

                                {business.listing_status ===
                                  "live" && (

                                  <div className="w-[260px] rounded-xl border border-slate-200 bg-slate-50 p-3">

                                    <BidForm
                                      listingId={
                                        business.id
                                      }
                                      currentBid={Number(
                                        business.current_bid ??
                                          0
                                      )}
                                    />

                                  </div>

                                )}

                              </div>

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

        {/* MY BIDS */}

        <section>

          <div className="mb-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-[#d94d28]">
              Your Activity
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              My Bids
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your recent bidding activity.
            </p>

          </div>

          {myBids.length === 0 ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <h3 className="text-lg font-bold text-slate-950">
                No bids yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Your bids will appear here when you participate
                in a live auction.
              </p>

              <Link
                href="/live-bids"
                className="mt-5 inline-flex rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white hover:bg-[#c94724]"
              >
                Browse Live Auctions
              </Link>

            </div>

          ) : (

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[800px] text-left">

                  <thead className="border-b border-slate-200 bg-slate-50">

                    <tr>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Business
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        My Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Date
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {myBids.map(
                      (bid) => {

                        const currentBid =
                          Number(
                            bid.current_bid ??
                              0
                          );

                        const myBid =
                          Number(
                            bid.amount ??
                              0
                          );

                        const isHighest =
                          myBid >=
                          currentBid;

                        return (

                          <tr
                            key={bid.id}
                            className="hover:bg-slate-50"
                          >

                            <td className="px-5 py-5">

                              <Link
                                href={`/business/${bid.listing_id}`}
                                className="font-bold text-slate-950 hover:text-[#e4572e]"
                              >
                                {bid.business_name ??
                                  "Business"}
                              </Link>

                            </td>

                            <td className="px-5 py-5 text-sm font-black">
                              {formatMoney(
                                bid.amount
                              )}
                            </td>

                            <td className="px-5 py-5 text-sm font-bold">
                              {formatMoney(
                                currentBid
                              )}
                            </td>

                            <td className="px-5 py-5">

                              <span
                                className={
                                  isHighest
                                    ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                    : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                }
                              >
                                {isHighest
                                  ? "Highest Bid"
                                  : "Outbid"}
                              </span>

                            </td>

                            <td className="px-5 py-5 text-sm text-slate-500">
                              {new Date(
                                bid.created_at
                              ).toLocaleString(
                                "en-IN"
                              )}
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

      </section>

    </main>
  );
}