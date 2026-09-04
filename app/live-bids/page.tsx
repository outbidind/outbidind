"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type LiveBusiness = {
  id: string;
  business_name: string;
  category: string | null;
  location: string | null;
  starting_bid: number | string | null;
  current_bid: number | string | null;
  business_website: string | null;
  listing_status: string;
  click_count?: number | string | null;
};

const PAGE_SIZE = 15;

function getWebsiteUrl(website: string | null) {
  if (!website) {
    return null;
  }

  const value = website.trim();

  if (!value) {
    return null;
  }

  try {
    return new URL(
      /^https?:\/\//i.test(value)
        ? value
        : `https://${value}`
    ).toString();
  } catch {
    return null;
  }
}

function getFaviconUrl(website: string | null) {
  const websiteUrl = getWebsiteUrl(website);

  if (!websiteUrl) {
    return null;
  }

  try {
    const origin = new URL(websiteUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function BusinessLogo({
  businessName,
  website,
}: {
  businessName: string;
  website: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const faviconUrl = getFaviconUrl(website);

  if (!faviconUrl || imageFailed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-[#d94d28]">
        {businessName.trim().charAt(0).toUpperCase() || "B"}
      </span>
    );
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
      <img
        src={faviconUrl}
        alt=""
        className="h-7 w-7 object-contain"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </span>
  );
}

export default function LiveBidsPage() {
  const [businesses, setBusinesses] = useState<
    LiveBusiness[]
  >([]);

  const [search, setSearch] = useState("");

  const [visibleCount, setVisibleCount] =
    useState(PAGE_SIZE);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLiveBusinesses() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      /*
       * Public marketplace data is loaded through the
       * secure RPC instead of exposing direct table
       * queries in the browser.
       */
      const { data, error } = await supabase.rpc(
        "get_public_business_listings"
      );

      if (error) {
        console.error(
          "Failed to load live businesses:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        setError("Unable to load live auctions.");
        setBusinesses([]);
        setLoading(false);

        return;
      }

      const liveBusinesses = (
        (data ?? []) as LiveBusiness[]
      )
        .filter(
          (business) =>
            business.listing_status === "live"
        )
        .sort(
          (a, b) =>
            Number(b.current_bid ?? 0) -
            Number(a.current_bid ?? 0)
        );

      setBusinesses(liveBusinesses);
      setLoading(false);
    }

    loadLiveBusinesses();
  }, []);

  /* ================= RANKING ================= */

  const rankedBusinesses = useMemo(() => {
    return [...businesses]
      .sort(
        (a, b) =>
          Number(b.current_bid ?? 0) -
          Number(a.current_bid ?? 0)
      )
      .map((business, index) => ({
        ...business,
        rank: index + 1,
      }));
  }, [businesses]);

  /* ================= SEARCH ================= */

  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rankedBusinesses;
    }

    return rankedBusinesses.filter(
      (business) =>
        [
          business.business_name,
          business.category,
          business.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
    );
  }, [rankedBusinesses, search]);

  const visibleBusinesses =
    filteredBusinesses.slice(
      0,
      visibleCount
    );

  /* ================= MONEY ================= */

  const formatMoney = (
    value: number | string | null
  ) =>
    `₹${Number(value ?? 0).toLocaleString(
      "en-IN"
    )}`;

  /* ================= CLICK TRACKING ================= */

  async function trackClick(
    listingId: string,
    type: "detail" | "website"
  ) {
    try {
      const supabase = createClient();

      await supabase.rpc(
        "track_business_click",
        {
          p_listing_id: listingId,
          p_click_type: type,
        }
      );
    } catch (error) {
      console.error(
        "Click tracking failed:",
        error
      );
    }
  }

  /* ================= SEARCH HANDLER ================= */

  function handleSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-slate-900">

      {/* ================= HEADER ================= */}

      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

          <a
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
          </a>

          <div className="flex items-center gap-3">

            <a
              href="/user-panel"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              My Panel
            </a>

            <a
              href="/"
              className="rounded-lg bg-[#e4572e] px-4 py-2 text-sm font-bold text-white hover:bg-[#c94724]"
            >
              Marketplace
            </a>

          </div>
        </nav>
      </header>

      {/* ================= MAIN ================= */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">

        {/* ================= TITLE ================= */}

        <div className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#d94d28]">
            Marketplace
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Live Auctions
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Explore every active auction. Businesses are ranked by their
                current highest bid.
              </p>

            </div>

            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              ● {businesses.length} Live
            </div>

          </div>
        </div>

        {/* ================= SEARCH ================= */}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          <label
            htmlFor="live-business-search"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Search live businesses
          </label>

          <div className="relative">

            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>

            <input
              id="live-business-search"
              type="search"
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
              placeholder="Search by business name, category or location..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#e4572e] focus:ring-4 focus:ring-orange-100"
            />

          </div>

          {search && !loading && (
            <p className="mt-3 text-sm text-slate-500">
              Showing{" "}
              {filteredBusinesses.length} matching business
              {filteredBusinesses.length === 1
                ? ""
                : "es"}.
              Search results keep their original auction ranking.
            </p>
          )}

        </div>

        {/* ================= ERROR ================= */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {/* ================= CONTENT ================= */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#e4572e]" />

            <p className="mt-4 font-semibold text-slate-600">
              Loading live auctions...
            </p>

          </div>

        ) : !error &&
          visibleBusinesses.length === 0 ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="text-4xl">
              🔎
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-950">
              {search
                ? "No matching live business"
                : "No live auctions yet"}
            </h2>

            <p className="mt-2 text-slate-500">
              {search
                ? "Try another business name, category or location."
                : "Live auctions will appear here when an admin starts them."}
            </p>

          </div>

        ) : (

          <>

            {/* ================= DESKTOP TABLE ================= */}

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">

              <div className="overflow-x-auto">

                <table className="w-full text-left">

                  <thead className="border-b border-slate-200 bg-slate-50">

                    <tr>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Rank
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Business
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Category
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Starting Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Bid
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Website
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {visibleBusinesses.map(
                      (business) => {

                        const website =
                          getWebsiteUrl(
                            business.business_website
                          );

                        return (
                          <tr
                            key={business.id}
                            className="group transition hover:bg-orange-50/40"
                          >

                            {/* RANK */}

                            <td className="px-5 py-5">

                              <a
                                href={`/business/${business.id}`}
                                onClick={() =>
                                  trackClick(
                                    business.id,
                                    "detail"
                                  )
                                }
                                aria-label={`Open ${business.business_name}`}
                                className="flex items-center gap-3"
                              >

                                <span
                                  className={
                                    business.rank <= 3
                                      ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#102a43] text-sm font-black text-white transition group-hover:bg-[#e4572e]"
                                      : "inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700 transition group-hover:bg-orange-50 group-hover:text-[#d94d28]"
                                  }
                                >
                                  #{business.rank}
                                </span>

                              </a>

                            </td>

                            {/* BUSINESS */}

                            <td className="px-5 py-5">

                              <a
                                href={`/business/${business.id}`}
                                onClick={() =>
                                  trackClick(
                                    business.id,
                                    "detail"
                                  )
                                }
                                className="flex items-center gap-3 rounded-lg"
                              >

                                <BusinessLogo
                                  businessName={
                                    business.business_name
                                  }
                                  website={
                                    business.business_website
                                  }
                                />

                                <span className="min-w-0">

                                  <span className="block font-bold text-slate-950 transition group-hover:text-[#e4572e]">
                                    {business.business_name}
                                  </span>

                                  <span className="mt-1 block text-xs text-slate-500">
                                    {business.location ||
                                      "Location not provided"}
                                  </span>

                                </span>

                              </a>

                            </td>

                            {/* CATEGORY */}

                            <td className="px-5 py-5 text-sm text-slate-600">
                              {business.category || "—"}
                            </td>

                            {/* STARTING BID */}

                            <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                              {formatMoney(
                                business.starting_bid
                              )}
                            </td>

                            {/* CURRENT BID */}

                            <td className="px-5 py-5">

                              <p className="text-lg font-black text-slate-950">
                                {formatMoney(
                                  business.current_bid
                                )}
                              </p>

                              <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                Live
                              </span>

                            </td>

                            {/* WEBSITE */}

                            <td className="px-5 py-5">

                              {website ? (

                                <a
                                  href={website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() =>
                                    trackClick(
                                      business.id,
                                      "website"
                                    )
                                  }
                                  className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Website ↗
                                </a>

                              ) : (

                                <span className="text-xs text-slate-400">
                                  —
                                </span>

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

            {/* ================= MOBILE CARDS ================= */}

            <div className="space-y-3 md:hidden">

              {visibleBusinesses.map(
                (business) => {

                  const website =
                    getWebsiteUrl(
                      business.business_website
                    );

                  return (
                    <div
                      key={business.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition active:scale-[0.995]"
                    >

                      {/* Entire business area is clickable */}

                      <a
                        href={`/business/${business.id}`}
                        onClick={() =>
                          trackClick(
                            business.id,
                            "detail"
                          )
                        }
                        className="block p-4"
                      >

                        <div className="flex items-center gap-3">

                          {/* RANK */}

                          <span
                            className={
                              business.rank <= 3
                                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#102a43] text-xs font-black text-white"
                                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700"
                            }
                          >
                            #{business.rank}
                          </span>

                          {/* LOGO */}

                          <BusinessLogo
                            businessName={
                              business.business_name
                            }
                            website={
                              business.business_website
                            }
                          />

                          {/* BUSINESS */}

                          <div className="min-w-0 flex-1">

                            <h3 className="truncate text-base font-black text-slate-950">
                              {business.business_name}
                            </h3>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {business.location ||
                                "Location not provided"}
                            </p>

                          </div>

                          {/* CURRENT BID */}

                          <div className="shrink-0 text-right">

                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Current
                            </p>

                            <p className="mt-0.5 text-base font-black text-slate-950">
                              {formatMoney(
                                business.current_bid
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">

                          <span className="text-xs font-semibold text-slate-500">
                            {business.category || "Business"}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            LIVE
                          </span>

                        </div>

                      </a>

                      {/* WEBSITE ONLY */}

                      {website && (
                        <div className="border-t border-slate-100 px-4 py-3">

                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackClick(
                                business.id,
                                "website"
                              )
                            }
                            className="inline-flex text-xs font-bold text-[#d94d28]"
                          >
                            Visit official website ↗
                          </a>

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

            {/* ================= SEE MORE ================= */}

            {visibleCount <
              filteredBusinesses.length && (

              <div className="mt-8 text-center">

                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount(
                      (count) =>
                        count + PAGE_SIZE
                    )
                  }
                  className="rounded-xl bg-[#102a43] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  See More Live Bids
                </button>

                <p className="mt-3 text-xs text-slate-500">
                  Showing{" "}
                  {visibleBusinesses.length} of{" "}
                  {filteredBusinesses.length}
                </p>

              </div>
            )}

            {/* ================= END ================= */}

            {visibleCount >=
              filteredBusinesses.length &&
              filteredBusinesses.length >
                PAGE_SIZE && (

                <p className="mt-8 text-center text-sm text-slate-400">
                  You&apos;ve reached the end of the live auctions.
                </p>
              )}

          </>
        )}

      </section>
    </main>
  );
}