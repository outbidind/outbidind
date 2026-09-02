"use client";

import { useEffect, useMemo, useState } from "react";
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
};

const PAGE_SIZE = 15;

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

      const { data, error } = await supabase
        .from("business_listings")
        .select(
          "id, business_name, category, location, starting_bid, current_bid, business_website, listing_status"
        )
        .eq("listing_status", "live")
        .is("deleted_at", null)
        .order("current_bid", {
          ascending: false,
        });

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

      setBusinesses(
        (data ?? []) as LiveBusiness[]
      );

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

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e4572e] text-sm font-black text-white">
              O
            </span>

            <span className="text-lg font-bold tracking-tight text-slate-950">
              OutbidInd
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
                handleSearch(
                  event.target.value
                )
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
                : "es"}
              .
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

            {/* ================= TABLE ================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left">

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
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {visibleBusinesses.map(
                      (business) => {

                        const website =
                          business.business_website
                            ? business.business_website.startsWith(
                                "http"
                              )
                              ? business.business_website
                              : `https://${business.business_website}`
                            : null;

                        return (

                          <tr
                            key={business.id}
                            className="transition hover:bg-slate-50"
                          >

                            {/* RANK */}

                            <td className="px-5 py-5">

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
                                  trackClick(
                                    business.id,
                                    "detail"
                                  )
                                }
                                className="font-bold text-slate-950 hover:text-[#e4572e]"
                              >
                                {business.business_name}
                              </a>

                              <p className="mt-1 text-xs text-slate-500">
                                {business.location ||
                                  "Location not provided"}
                              </p>

                            </td>

                            {/* CATEGORY */}

                            <td className="px-5 py-5 text-sm text-slate-600">
                              {business.category ||
                                "—"}
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

                            <td className="px-5 py-5">

                              <div className="flex flex-wrap gap-2">

                                <a
                                  href={`/business/${business.id}`}
                                  onClick={() =>
                                    trackClick(
                                      business.id,
                                      "detail"
                                    )
                                  }
                                  className="rounded-lg bg-[#e4572e] px-3 py-2 text-xs font-bold text-white hover:bg-[#c94724]"
                                >
                                  View & Bid
                                </a>

                                {website && (

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
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
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