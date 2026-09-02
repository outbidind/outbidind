"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PanelMobileMenu from "@/components/PanelMobileMenu";

type LiveBusiness = {
  id: string;
  business_name: string;
  category: string | null;
  location: string | null;
  starting_bid: number | string | null;
  current_bid: number | string | null;
  business_website: string | null;
  listing_status: string;
};

const PAGE_SIZE = 15;

export default function LiveBidsPage() {
  const [businesses, setBusinesses] = useState<LiveBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] =
    useState(PAGE_SIZE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= LOAD LIVE BUSINESSES ================= */

  useEffect(() => {
    let mounted = true;

    async function loadLiveBusinesses() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      /*
       * IMPORTANT:
       * Public marketplace data must come through the
       * secure RPC instead of directly querying
       * business_listings from the browser.
       */
      const { data, error: rpcError } = await supabase.rpc(
        "get_public_business_listings"
      );

      if (!mounted) {
        return;
      }

      if (rpcError) {
        console.error(
          "Failed to load public business listings:",
          {
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            code: rpcError.code,
          }
        );

        setError("Unable to load live auctions.");
        setBusinesses([]);
        setLoading(false);

        return;
      }

      /*
       * The public RPC can return marketplace listings.
       * Only live listings belong on this page.
       */
      const liveBusinesses = (
        (data ?? []) as LiveBusiness[]
      ).filter(
        (business) =>
          business.listing_status === "live"
      );

      setBusinesses(liveBusinesses);
      setLoading(false);
    }

    loadLiveBusinesses();

    return () => {
      mounted = false;
    };
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

    return rankedBusinesses.filter((business) =>
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

  /* ================= VISIBLE BUSINESSES ================= */

  const visibleBusinesses = filteredBusinesses.slice(
    0,
    visibleCount
  );

  /* ================= MONEY ================= */

  const formatMoney = (
    value: number | string | null
  ) => {
    return `₹${Number(value ?? 0).toLocaleString(
      "en-IN"
    )}`;
  };

  /* ================= WEBSITE ================= */

  const getWebsiteUrl = (
    website: string | null
  ) => {
    if (!website) {
      return null;
    }

    return website.startsWith("http")
      ? website
      : `https://${website}`;
  };

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
    } catch (trackingError) {
      /*
       * Tracking failure must never block
       * navigation to the business.
       */
      console.error(
        "Click tracking failed:",
        trackingError
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

      <header className="relative z-50 border-b border-slate-200 bg-white">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8"
          aria-label="Main navigation"
        >
          {/* LOGO */}

          <a
            href="/"
            className="flex items-center gap-2.5 sm:gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e4572e] text-sm font-black text-white sm:h-10 sm:w-10">
              O
            </span>

            <span className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">
              OutbidInd
            </span>
          </a>

          {/* DESKTOP / TABLET NAV */}

          <div className="hidden items-center gap-2 sm:flex">
            <a
              href="/user-panel"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 md:px-4"
            >
              My Panel
            </a>

            <a
              href="/"
              className="rounded-lg bg-[#e4572e] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#c94724] md:px-4"
            >
              Marketplace
            </a>
          </div>

          {/* MOBILE MENU */}

          <PanelMobileMenu />
        </nav>
      </header>

      {/* ================= MAIN ================= */}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">

        {/* ================= TITLE ================= */}

        <div className="mb-7 sm:mb-9">

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d94d28] sm:text-sm">
            Marketplace
          </p>

          <div className="mt-2 flex flex-col gap-5 sm:mt-3 md:flex-row md:items-end md:justify-between">

            <div className="min-w-0">

              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Live Auctions
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Explore every active auction. Businesses are
                ranked by their current highest bid.
              </p>

            </div>

            <div className="w-fit rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 sm:px-4 sm:text-sm">
              <span
                className="mr-1.5"
                aria-hidden="true"
              >
                ●
              </span>
              {businesses.length} Live
            </div>

          </div>
        </div>

        {/* ================= SEARCH ================= */}

        <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-5">

          <label
            htmlFor="live-business-search"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Search live businesses
          </label>

          <div className="relative">

            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
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
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e4572e] focus:ring-4 focus:ring-orange-100 sm:py-4"
            />

          </div>

          {!loading && !error && search && (
            <p className="mt-3 text-xs leading-5 text-slate-500 sm:text-sm">
              Showing{" "}
              <strong className="text-slate-700">
                {filteredBusinesses.length}
              </strong>{" "}
              matching business
              {filteredBusinesses.length === 1
                ? ""
                : "es"}
              . Search results keep their original auction
              ranking.
            </p>
          )}

        </div>

        {/* ================= ERROR ================= */}

        {error && (
          <div
            role="alert"
            className="mb-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 sm:mb-8 sm:p-6"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ================= LOADING ================= */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-12">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#e4572e]" />

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading live auctions...
            </p>

          </div>

        ) : !error &&
          visibleBusinesses.length === 0 ? (

          /* ================= EMPTY ================= */

          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">

            <div className="text-4xl" aria-hidden="true">
              🔎
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-950 sm:text-xl">
              {search
                ? "No matching live business"
                : "No live auctions yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {search
                ? "Try another business name, category or location."
                : "Live auctions will appear here when businesses become live."}
            </p>

            {search && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="mt-5 rounded-lg bg-[#e4572e] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#c94724]"
              >
                Clear Search
              </button>
            )}

          </div>

        ) : (

          <>

            {/* ================================================== */}
            {/* DESKTOP TABLE */}
            {/* ================================================== */}

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">

              <div className="border-b border-slate-100 bg-white px-5 py-4 lg:px-6">

                <div className="flex items-center justify-between gap-4">

                  <div>
                    <p className="font-bold text-slate-950">
                      Live auction ranking
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {filteredBusinesses.length === 0
                        ? "No matching live auctions"
                        : `Showing ${Math.min(
                            visibleCount,
                            filteredBusinesses.length
                          )} of ${
                            filteredBusinesses.length
                          } live auctions`}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <span
                      className="h-2 w-2 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    {businesses.length} LIVE
                  </span>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left">

                  <thead className="border-b border-slate-200 bg-slate-50">

                    <tr>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 lg:px-6">
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

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 lg:px-6">
                        Action
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
                            className="transition hover:bg-orange-50/40"
                          >

                            {/* RANK */}

                            <td className="px-5 py-5 lg:px-6">

                              <span
                                className={
                                  business.rank <= 3
                                    ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#102a43] text-sm font-black text-white"
                                    : "inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700"
                                }
                              >
                                #{business.rank}
                              </span>

                            </td>

                            {/* BUSINESS */}

                            <td className="px-5 py-5">

                              <a
                                href={`/business/${business.id}`}
                                onClick={() =>
                                  void trackClick(
                                    business.id,
                                    "detail"
                                  )
                                }
                                className="font-bold text-slate-950 transition hover:text-[#e4572e]"
                              >
                                {business.business_name}
                              </a>

                              <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                {business.location ||
                                  "Location not provided"}
                              </p>

                            </td>

                            {/* CATEGORY */}

                            <td className="px-5 py-5 text-sm font-medium text-slate-600">
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

                            {/* ACTION */}

                            <td className="px-5 py-5 lg:px-6">

                              <div className="flex flex-wrap gap-2">

                                <a
                                  href={`/business/${business.id}`}
                                  onClick={() =>
                                    void trackClick(
                                      business.id,
                                      "detail"
                                    )
                                  }
                                  className="rounded-lg bg-[#e4572e] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#c94724]"
                                >
                                  View & Bid
                                </a>

                                {website && (
                                  <a
                                    href={website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                      void trackClick(
                                        business.id,
                                        "website"
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Website ↗
                                  </a>
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

            {/* ================================================== */}
            {/* MOBILE / SMALL TABLET CARDS */}
            {/* ================================================== */}

            <div className="grid gap-4 md:hidden">

              {visibleBusinesses.map(
                (business) => {

                  const website =
                    getWebsiteUrl(
                      business.business_website
                    );

                  return (
                    <article
                      key={business.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >

                      {/* CARD TOP */}

                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">

                        <div className="flex min-w-0 items-center gap-3">

                          <span
                            className={
                              business.rank <= 3
                                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#102a43] text-xs font-black text-white"
                                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700"
                            }
                          >
                            #{business.rank}
                          </span>

                          <div className="min-w-0">

                            <a
                              href={`/business/${business.id}`}
                              onClick={() =>
                                void trackClick(
                                  business.id,
                                  "detail"
                                )
                              }
                              className="block truncate text-base font-black text-slate-950 transition hover:text-[#e4572e]"
                            >
                              {business.business_name}
                            </a>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {business.location ||
                                "Location not provided"}
                            </p>

                          </div>

                        </div>

                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Live
                        </span>

                      </div>

                      {/* CARD BODY */}

                      <div className="p-4 sm:p-5">

                        <div className="mb-5">

                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Category
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {business.category ||
                              "Uncategorized"}
                          </p>

                        </div>

                        <div className="grid grid-cols-2 gap-3">

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Starting Bid
                            </p>

                            <p className="mt-1 text-base font-bold text-slate-700">
                              {formatMoney(
                                business.starting_bid
                              )}
                            </p>

                          </div>

                          <div className="rounded-xl bg-orange-50 p-3">

                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#d94d28]">
                              Current Bid
                            </p>

                            <p className="mt-1 text-base font-black text-slate-950">
                              {formatMoney(
                                business.current_bid
                              )}
                            </p>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                          <a
                            href={`/business/${business.id}`}
                            onClick={() =>
                              void trackClick(
                                business.id,
                                "detail"
                              )
                            }
                            className="flex flex-1 items-center justify-center rounded-lg bg-[#e4572e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c94724]"
                          >
                            View & Bid
                          </a>

                          {website && (
                            <a
                              href={website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                void trackClick(
                                  business.id,
                                  "website"
                                )
                              }
                              className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              Website ↗
                            </a>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

            {/* ================= SEE MORE ================= */}

            {visibleCount <
              filteredBusinesses.length && (

              <div className="mt-7 text-center sm:mt-8">

                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount(
                      (count) =>
                        count + PAGE_SIZE
                    )
                  }
                  className="w-full rounded-xl bg-[#102a43] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 sm:w-auto"
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

              <p className="mt-7 text-center text-sm text-slate-400 sm:mt-8">
                You&apos;ve reached the end of the live
                auctions.
              </p>

            )}

          </>

        )}

      </section>

    </main>
  );
}