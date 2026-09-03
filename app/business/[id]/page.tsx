import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BidSection from "@/components/BidSection";
import CompletePaymentButton from "@/components/CompletePaymentButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PublicBusinessListing = {
  id: string;
  business_name: string;
  category: string;
  description: string;
  location: string;
  starting_bid: number | string;
  current_bid: number | string;
  business_website: string | null;
  additional_information: string | null;
  listing_status: string;
  created_at: string;
  updated_at: string;
};

type PublicBidRow = {
  id: string;
  listing_id: string;
  amount: number | string;
  created_at: string;
};

type Bid = {
  id: string;
  listing_id: string;
  amount: number;
  created_at: string;
};

type MyBusiness = {
  id: string;
  business_name: string;
  starting_bid: number | string | null;
  listing_status: string;
};

type PaymentOrder = {
  status: string;
  created_at: string;
};

function formatMoney(
  value: number | string | null | undefined
) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="text-[#e4572e]"
    >
      ↗
    </span>
  );
}

export default async function BusinessPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  /* =====================================================
     AUTH
     ===================================================== */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* =====================================================
     PUBLIC BUSINESS LISTING
     ===================================================== */

  const {
    data: listingData,
    error: listingError,
  } = await supabase.rpc(
    "get_public_business_listing",
    {
      p_listing_id: id,
    }
  );

  if (listingError) {
    console.error(
      "Failed to load business listing:",
      listingError
    );

    notFound();
  }

  const listingRows =
    (listingData ?? []) as PublicBusinessListing[];

  const listing: PublicBusinessListing | null =
    Array.isArray(listingRows)
      ? listingRows[0] ?? null
      : null;

  if (!listing) {
    notFound();
  }

  /* =====================================================
     OWNER CHECK
     
     We use the secure "my businesses" RPC.
     
     owner_id is NOT exposed to the public page.
     ===================================================== */

  let isOwner = false;
  let ownerBusiness: MyBusiness | null = null;

  if (user) {
    const {
      data: myBusinessesData,
      error: myBusinessesError,
    } = await supabase.rpc(
      "get_my_business_listings"
    );

    if (myBusinessesError) {
      console.error(
        "Failed to load owner's businesses:",
        myBusinessesError
      );
    }

    const myBusinesses =
      (myBusinessesData ?? []) as MyBusiness[];

    ownerBusiness =
      myBusinesses.find(
        (business) =>
          business.id === listing.id
      ) ?? null;

    isOwner = Boolean(ownerBusiness);
  }

  /* =====================================================
     PAYMENT STATUS
     
     Only the authenticated owner can read their own
     payment order for this listing.
     ===================================================== */

  let latestPayment: PaymentOrder | null =
    null;

  if (isOwner && user) {
    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from("payment_orders")
      .select(
        "status, created_at"
      )
      .eq("listing_id", listing.id)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error(
        "Failed to load payment status:",
        paymentError
      );
    }

    if (paymentData) {
      latestPayment =
        paymentData as PaymentOrder;
    }
  }

  /* =====================================================
     OWNER PAYMENT ACTION
     
     Approved + unpaid = owner can complete payment.
     
     If there is no payment order yet, we still allow the
     owner to start the payment process. The server-side
     create-order route will create the order securely.
     ===================================================== */

  const canCompletePayment =
    isOwner &&
    listing.listing_status === "approved" &&
    latestPayment?.status !== "paid";

  /* =====================================================
     PUBLIC BID HISTORY
     ===================================================== */

  const {
    data: bidsData,
    error: bidsError,
  } = await supabase.rpc(
    "get_public_bid_history",
    {
      p_listing_id: listing.id,
    }
  );

  if (bidsError) {
    console.error(
      "Failed to load public bid history:",
      bidsError
    );
  }

  const bidRows =
    (bidsData ?? []) as PublicBidRow[];

  const bidHistory: Bid[] =
    bidRows.map(
      (bid): Bid => ({
        id: bid.id,
        listing_id: bid.listing_id,
        amount: Number(bid.amount),
        created_at: bid.created_at,
      })
    );

  /* =====================================================
     CURRENT BID
     ===================================================== */

  const initialCurrentBid = Number(
    listing.current_bid ??
      listing.starting_bid ??
      0
  );

  /* =====================================================
     WEBSITE
     ===================================================== */

  const website = listing.business_website
    ? listing.business_website.startsWith(
        "http"
      )
      ? listing.business_website
      : `https://${listing.business_website}`
    : null;

  /* =====================================================
     PAGE
     ===================================================== */

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-slate-900">

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="border-b border-slate-200 bg-white">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"
          aria-label="Business navigation"
        >
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e4572e] text-sm font-black text-white">
              O
            </span>

            <span className="text-lg font-bold tracking-tight text-slate-950">
              OutbidInd
            </span>
          </Link>

          <div className="flex items-center gap-3">

            <Link
              href="/live-bids"
              className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:block"
            >
              Live Bids
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-[#e4572e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#c94724]"
            >
              Marketplace
            </Link>

          </div>
        </nav>
      </header>

      {/* =================================================
          BREADCRUMB
          ================================================= */}

      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">

        <div className="flex items-center gap-2 text-sm text-slate-500">

          <Link
            href="/"
            className="transition hover:text-[#e4572e]"
          >
            Marketplace
          </Link>

          <span>/</span>

          <span className="truncate text-slate-700">
            {listing.business_name}
          </span>

        </div>

      </div>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">

          {/* =================================================
              LEFT COLUMN
              ================================================= */}

          <div>

            {/* BUSINESS HEADER */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="relative flex min-h-[220px] items-end bg-orange-100 p-7 sm:p-10">

                <div
                  className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[32px] border-white/40"
                  aria-hidden="true"
                />

                <div
                  className="absolute -bottom-24 -right-8 h-52 w-52 rounded-full bg-orange-200/50 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative z-10">

                  <div className="flex flex-wrap items-center gap-3">

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#d94d28] shadow-sm">
                      {listing.category}
                    </span>

                    {listing.listing_status ===
                    "live" ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                        <span className="h-2 w-2 rounded-full bg-emerald-500" />

                        LIVE AUCTION

                      </span>
                    ) : canCompletePayment ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">

                        <span className="h-2 w-2 rounded-full bg-amber-500" />

                        PAYMENT PENDING

                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                        APPROVED
                      </span>
                    )}

                  </div>

                  <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                    {listing.business_name}
                  </h1>

                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">

                    <span aria-hidden="true">
                      📍
                    </span>

                    {listing.location}

                  </p>

                </div>

              </div>

              {/* BUSINESS INFORMATION */}

              <div className="p-7 sm:p-10">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#d94d28]">
                    About the business
                  </p>

                  <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-600">
                    {listing.description}
                  </p>

                </div>

                {listing.additional_information && (
                  <div className="mt-8 border-t border-slate-100 pt-8">

                    <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#d94d28]">
                      Additional information
                    </p>

                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                      {listing.additional_information}
                    </p>

                  </div>
                )}

                {website && (
                  <div className="mt-8 border-t border-slate-100 pt-8">

                    <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#d94d28]">
                      Official website
                    </p>

                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 font-bold text-[#e4572e] transition hover:text-[#102a43]"
                    >
                      Visit Business Website

                      <Arrow />

                    </a>

                  </div>
                )}

              </div>

            </div>

            {/* =================================================
                OWNER PAYMENT
                ================================================= */}

            {canCompletePayment && (
              <div className="mt-8">
                <CompletePaymentButton
                  listingId={listing.id}
                  businessName={
                    listing.business_name
                  }
                  bidAmount={Number(
                    ownerBusiness?.starting_bid ??
                      listing.starting_bid
                  )}
                />
              </div>
            )}

            {/* =================================================
                BID HISTORY
                ================================================= */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-7">

                <div>

                  <p className="font-bold text-slate-950">
                    Bid History
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {bidHistory.length}{" "}
                    {bidHistory.length === 1
                      ? "bid"
                      : "bids"}
                  </p>

                </div>

                {listing.listing_status ===
                  "live" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                    <span className="h-2 w-2 rounded-full bg-emerald-500" />

                    LIVE

                  </span>
                )}

              </div>

              {bidHistory.length === 0 ? (

                <div className="px-6 py-12 text-center sm:px-7">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                    ₹
                  </div>

                  <p className="mt-4 font-bold text-slate-950">
                    No bids yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Be the first person to place a bid
                    on this business.
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-slate-100">

                  {bidHistory.map(
                    (bid, index) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between gap-4 px-6 py-5 sm:px-7"
                      >

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                            #{bidHistory.length -
                              index}
                          </div>

                          <div className="min-w-0">

                            <p className="font-bold text-slate-950">
                              {formatMoney(
                                bid.amount
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(
                                bid.created_at
                              )}
                            </p>

                          </div>

                        </div>

                        {index === 0 && (
                          <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#d94d28]">
                            Latest
                          </span>
                        )}

                      </div>
                    )
                  )}

                </div>

              )}

            </div>

          </div>

          {/* =================================================
              RIGHT COLUMN
              ================================================= */}

          <aside>

            <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">

              {/* CURRENT BID */}

              <div className="bg-[#102a43] p-7 text-white sm:p-8">

                <div className="flex items-center justify-between gap-4">

                  <p className="text-sm font-semibold text-slate-300">
                    Current bid
                  </p>

                  {listing.listing_status ===
                    "live" && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">

                      <span className="h-2 w-2 rounded-full bg-emerald-400" />

                      LIVE

                    </span>
                  )}

                </div>

                <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                  {formatMoney(
                    initialCurrentBid
                  )}
                </p>

                <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">

                  <div
                    className="h-full rounded-full bg-[#f28c62] transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          (initialCurrentBid /
                            Math.max(
                              Number(
                                listing.starting_bid
                              ),
                              1
                            )) *
                            50
                        )
                      )}%`,
                    }}
                  />

                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">

                  <span>
                    Starting bid
                  </span>

                  <span className="font-bold text-orange-200">
                    {formatMoney(
                      listing.starting_bid
                    )}
                  </span>

                </div>

              </div>

              {/* =================================================
                  BID / PAYMENT AREA
                  ================================================= */}

              <div className="p-7 sm:p-8">

                {listing.listing_status ===
                "live" ? (
                  <BidSection
                    listingId={listing.id}
                    currentBid={
                      initialCurrentBid
                    }
                    listingStatus={
                      listing.listing_status
                    }
                  />
                ) : canCompletePayment ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

                    <p className="text-sm font-bold text-amber-800">
                      Payment required
                    </p>

                    <p className="mt-2 text-sm leading-6 text-amber-700">
                      Complete the payment above to
                      start this auction.
                    </p>

                    <p className="mt-4 text-lg font-black text-amber-900">
                      {formatMoney(
                        ownerBusiness?.starting_bid ??
                          listing.starting_bid
                      )}
                    </p>

                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <p className="text-sm font-bold text-slate-800">
                      Auction not live yet
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Bidding will become available once
                      this business goes live.
                    </p>

                  </div>
                )}

              </div>

            </div>

            {/* =================================================
                AUCTION INFORMATION
                ================================================= */}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">

              <p className="font-bold text-slate-950">
                Auction information
              </p>

              <div className="mt-5 space-y-4">

                <div className="flex items-center justify-between gap-4">

                  <span className="text-sm text-slate-500">
                    Starting bid
                  </span>

                  <span className="text-sm font-bold text-slate-900">
                    {formatMoney(
                      listing.starting_bid
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between gap-4">

                  <span className="text-sm text-slate-500">
                    Current bid
                  </span>

                  <span className="text-sm font-bold text-slate-900">
                    {formatMoney(
                      initialCurrentBid
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between gap-4">

                  <span className="text-sm text-slate-500">
                    Total bids
                  </span>

                  <span className="text-sm font-bold text-slate-900">
                    {bidHistory.length}
                  </span>

                </div>

                <div className="flex items-center justify-between gap-4">

                  <span className="text-sm text-slate-500">
                    Status
                  </span>

                  <span
                    className={
                      listing.listing_status ===
                      "live"
                        ? "text-sm font-bold text-emerald-700"
                        : canCompletePayment
                        ? "text-sm font-bold text-amber-700"
                        : "text-sm font-bold text-amber-700"
                    }
                  >
                    {listing.listing_status ===
                    "live"
                      ? "Live"
                      : canCompletePayment
                      ? "Payment Pending"
                      : "Approved"}
                  </span>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </section>

      {/* =================================================
          FOOTER
          ================================================= */}

      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">

          <Link
            href="/"
            className="font-bold text-slate-950"
          >
            OutbidInd
          </Link>

          <p className="text-sm text-slate-400">
            © 2026 OutbidInd
          </p>

        </div>

      </footer>

    </main>
  );
}