import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import BidSection from "@/components/BidSection";
import CompletePaymentButton from "@/components/CompletePaymentButton";
import TrackedWebsiteLink from "@/components/TrackedWebsiteLink";
import { getBusinessPath } from "@/lib/business-url";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type BusinessListing = {
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

type Bid = {
  id: string;
  listing_id: string;
  amount: number;
  created_at: string;
};

async function getPublicBusinessListing(
  id: string
): Promise<BusinessListing | null> {
  // A business detail route should contain a UUID.
  // If the URL is invalid, do not call the database and
  // do not create a noisy server-console error.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    return null;
  }

  const supabase = await createClient();

  const {
    data: listingData,
    error: listingError,
  } = await supabase.rpc(
    "get_public_business_listing",
    {
      p_listing_id: id,
    }
  );

  // A missing/unavailable public listing is an expected
  // condition for metadata generation. The actual page
  // will handle it with notFound().
  if (listingError) {
    return null;
  }

  const listingRows =
    (listingData ?? []) as BusinessListing[];

  return Array.isArray(listingRows)
    ? listingRows[0] ?? null
    : null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  const listing =
    await getPublicBusinessListing(id);

  if (!listing) {
    return {
      title: "Business Auction | OutbidInd",
      description:
        "Explore approved businesses and live bidding opportunities on the OutbidInd marketplace.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const businessName =
    listing.business_name.trim();

  const category =
    listing.category.trim();

  const location =
    listing.location.trim();

  const description =
    listing.description.trim();

  const seoDescription =
    `${businessName} ${category ? `business auction in ${category}` : "business auction"}${location ? `, ${location}` : ""}. Explore business details and participate in live bidding on OutbidInd.`;

  const finalDescription =
    description.length > 0
      ? `${description.slice(0, 145).trim()}${description.length > 145 ? "…" : ""} Participate in live bidding on OutbidInd.`
      : seoDescription;

  const businessPath = getBusinessPath(
    businessName,
    id
  );

  return {
    title: `${businessName}${category ? ` – ${category}` : ""}${location ? ` in ${location}` : ""} | OutbidInd`,
    description: finalDescription,
    alternates: {
      canonical: businessPath,
    },
    openGraph: {
      type: "website",
      url: businessPath,
      siteName: "OutbidInd",
      title: `${businessName}${category ? ` – ${category}` : ""}${location ? ` in ${location}` : ""} | OutbidInd`,
      description: finalDescription,
      locale: "en_IN",
      images: [
        {
          url: "/logo.png",
          width: 512,
          height: 512,
          alt: "OutbidInd – Business Auction & Bidding Marketplace",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${businessName}${category ? ` – ${category}` : ""}${location ? ` in ${location}` : ""} | OutbidInd`,
      description: finalDescription,
      images: ["/logo.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `₹${Number(
    value ?? 0
  ).toLocaleString("en-IN")}`;
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString("en-IN", {
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

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    notFound();
  }

  const supabase =
    await createClient();

  // =====================================================
  // PUBLIC BUSINESS LISTING
  // =====================================================

  // Use the secure public RPC instead of directly selecting
  // business_listings. The RPC intentionally does not expose
  // owner_id or internal admin/security fields.

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
    (listingData ?? []) as BusinessListing[];

  const listing: BusinessListing | null =
    Array.isArray(listingRows)
      ? listingRows[0] ?? null
      : null;

  if (!listing) {
    notFound();
  }

  // =====================================================
  // PUBLIC BID HISTORY
  // =====================================================

  const {
    data: bids,
    error: bidsError,
  } = await supabase.rpc(
    "get_public_bid_history",
    {
      p_listing_id:
        listing.id,
    }
  );

  if (bidsError) {
    console.error(
      "Failed to load public bid history:",
      bidsError
    );
  }

  const bidHistory: Bid[] =
    (bids ?? []).map(
      (bid: {
        id: string;
        listing_id: string;
        amount:
          | number
          | string;
        created_at: string;
      }) => ({
        id: bid.id,

        listing_id:
          bid.listing_id,

        amount:
          Number(
            bid.amount
          ),

        created_at:
          bid.created_at,
      })
    );

  const initialCurrentBid =
    Number(
      listing.current_bid ??
        listing.starting_bid ??
        0
    );

  // =====================================================
  // WEBSITE
  // =====================================================

  const website =
    listing.business_website
      ? listing.business_website.startsWith(
          "http"
        )
        ? listing.business_website
        : `https://${listing.business_website}`
      : null;

  // =====================================================
  // MINIMIZED BID HISTORY
  // =====================================================

  const visibleBidCount = 3;

  const visibleBids =
    bidHistory.slice(
      0,
      visibleBidCount
    );

  const remainingBids =
    bidHistory.slice(
      visibleBidCount
    );

  // =====================================================
  // SEO STRUCTURED DATA
  // =====================================================

  const businessPageUrl =
    `https://outbidind.com${getBusinessPath(
      listing.business_name,
      listing.id
    )}`;

  const businessPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${listing.business_name} | OutbidInd`,
    description:
      listing.description?.trim() ||
      `Explore ${listing.business_name} on OutbidInd and participate in live business bidding.`,
    url: businessPageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "OutbidInd",
      url: "https://outbidind.com",
    },
    about: {
      "@type": "Thing",
      name: listing.business_name,
      description:
        listing.description?.trim() ||
        `Business listing for ${listing.business_name}.`,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://outbidind.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Live Bids",
          item: "https://outbidind.com/live-bids",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: listing.business_name,
          item: businessPageUrl,
        },
      ],
    },
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            businessPageSchema
          ),
        }}
      />

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
              Outbid<span className="text-[#e4572e]">Ind</span>
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

          <Link
            href="/live-bids"
            className="transition hover:text-[#e4572e]"
          >
            Live Bids
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

                  <div className="mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">

                    <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Starting Bid
                      </p>

                      <p className="mt-1 text-lg font-black text-slate-950">
                        {formatMoney(listing.starting_bid)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Bid
                      </p>

                      <p className="mt-1 text-lg font-black text-[#d94d28]">
                        {formatMoney(initialCurrentBid)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </p>

                      <p className="mt-1 text-lg font-black uppercase text-slate-950">
                        {listing.listing_status}
                      </p>
                    </div>

                  </div>

                </div>
              </div>

              {/* BUSINESS INFORMATION */}

              <div className="p-7 sm:p-10">

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#d94d28]">
                    About {listing.business_name}
                  </h2>

                  <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-600">
                    {listing.description}
                  </p>
                </div>

                {listing.additional_information && (
                  <div className="mt-8 border-t border-slate-100 pt-8">

                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#d94d28]">
                      Additional Information
                    </h2>

                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                      {
                        listing.additional_information
                      }
                    </p>

                  </div>
                )}

                {website && (
                  <div className="mt-8 border-t border-slate-100 pt-8">

                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#d94d28]">
                      Official Website
                    </h2>

                    <TrackedWebsiteLink
                      href={website}
                      listingId={listing.id}
                      className="mt-3 inline-flex items-center gap-2 font-bold text-[#e4572e] transition hover:text-[#102a43]"
                    >
                      Visit Business Website
                      <Arrow />
                    </TrackedWebsiteLink>

                  </div>
                )}

              </div>
            </div>

            {/* =================================================
                BID HISTORY
                ================================================= */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-7">

                <div>
                  <h2 className="font-bold text-slate-950">
                    Bid History & Auction Activity
                  </h2>

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

              {bidHistory.length ===
              0 ? (
                <div className="px-6 py-12 text-center sm:px-7">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                    ₹
                  </div>

                  <p className="mt-4 font-bold text-slate-950">
                    No bids yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Be the first person to
                    place a bid on this
                    business.
                  </p>

                </div>
              ) : (
                <>

                  {/* LATEST 3 */}

                  <div className="divide-y divide-slate-100">

                    {visibleBids.map(
                      (
                        bid,
                        index
                      ) => (
                        <div
                          key={bid.id}
                          className="flex items-center justify-between gap-4 px-6 py-5 sm:px-7"
                        >

                          <div className="flex min-w-0 items-center gap-4">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                              #
                              {bidHistory.length -
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

                  {/* FULL HISTORY */}

                  {remainingBids.length >
                    0 && (
                    <details className="border-t border-slate-100">

                      <summary className="cursor-pointer list-none px-6 py-4 text-center text-sm font-bold text-[#e4572e] transition hover:bg-orange-50 sm:px-7">

                        <span>
                          View Full Bid History
                        </span>

                        <span className="ml-2 text-xs font-semibold text-slate-400">
                          +
                          {
                            remainingBids.length
                          }{" "}
                          more
                        </span>

                      </summary>

                      <div className="divide-y divide-slate-100 border-t border-slate-100">

                        {remainingBids.map(
                          (
                            bid,
                            remainingIndex
                          ) => {

                            const actualIndex =
                              visibleBidCount +
                              remainingIndex;

                            return (
                              <div
                                key={bid.id}
                                className="flex items-center justify-between gap-4 px-6 py-5 sm:px-7"
                              >

                                <div className="flex min-w-0 items-center gap-4">

                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                                    #
                                    {bidHistory.length -
                                      actualIndex}
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

                              </div>
                            );
                          }
                        )}

                      </div>

                    </details>
                  )}

                </>
              )}

            </div>

          </div>

          {/* =================================================
              RIGHT / AUCTION PANEL
              ================================================= */}

          <aside>

            <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">

              {/* AUCTION TOTAL */}

              <div className="bg-[#102a43] p-7 text-white sm:p-8">

                <h2 className="sr-only">
                  Live Business Bidding
                </h2>

                <div className="flex items-center justify-between gap-4">

                  <p className="text-sm font-semibold text-slate-300">
                    Auction total
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

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Every successful bid payment
                  is added to this total.
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

              {/* BID / PAYMENT ACTION */}

              <div className="p-7 sm:p-8">

                {listing.listing_status ===
                  "live" ? (
                  <BidSection
                    listingId={
                      listing.id
                    }
                    currentBid={
                      initialCurrentBid
                    }
                    listingStatus={
                      listing.listing_status
                    }
                  />
                ) : (
                  <CompletePaymentButton
                    listingId={
                      listing.id
                    }
                    businessName={
                      listing.business_name
                    }
                    bidAmount={Number(
                      listing.starting_bid
                    )}
                    listingStatus={
                      listing.listing_status
                    }
                  />
                )}

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
            Outbid<span className="text-[#e4572e]">Ind</span>
          </Link>

          <p className="text-sm text-slate-400">
            © 2026 OutbidInd
          </p>

        </div>

      </footer>

    </main>
  );
}