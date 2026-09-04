"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Modal from "@/components/Modal";
import { LoginForm, SignupForm } from "@/components/ModalForms";
import { BusinessListingForm } from "@/components/BusinessListingForm";
import { createClient } from "@/lib/supabase/client";

type ModalName = "login" | "signup" | "listing" | "bid" | null;

type BusinessListing = {
  id: string;
  business_name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  starting_bid: number | null;
  current_bid: number | null;
  business_website: string | null;
  listing_status: string;
  click_count?: number | null;
};

function Arrow() {
  return (
    <span aria-hidden="true" className="text-[#e4572e]">
      ↗
    </span>
  );
}

function getWebsiteUrl(website: string | null) {
  if (!website) return null;

  return website.startsWith("http")
    ? website
    : `https://${website}`;
}

function getFaviconUrl(website: string | null) {
  const websiteUrl = getWebsiteUrl(website);

  if (!websiteUrl) return null;

  try {
    const url = new URL(websiteUrl);
    return `${url.origin}/favicon.ico`;
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

  const initials = businessName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!faviconUrl || imageFailed) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-black text-[#d94d28]">
        {initials || "B"}
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
      <img
        src={faviconUrl}
        alt=""
        className="h-7 w-7 object-contain"
        onError={() => setImageFailed(true)}
      />
    </span>
  );
}

export default function Home() {
  const [activeModal, setActiveModalState] =
    useState<ModalName>(null);

  const [userEmail, setUserEmail] =
    useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [authMessage, setAuthMessage] = useState("");

  const [approvedBusinesses, setApprovedBusinesses] =
    useState<BusinessListing[]>([]);

  const [bidCounts, setBidCounts] =
    useState<Record<string, number>>({});

  const [liveBidSearch, setLiveBidSearch] = useState("");

  const [liveBidsVisibleCount, setLiveBidsVisibleCount] =
    useState(15);

  const [businessesLoading, setBusinessesLoading] =
    useState(true);

  const [businessesError, setBusinessesError] =
    useState("");

  /* ================= AUTH ================= */

  const setActiveModal = (modal: ModalName) => {
    if (modal === "listing" && !userEmail) {
      setActiveModalState("login");
      return;
    }

    setActiveModalState(modal);
  };

  const closeModal = () => {
    setActiveModalState(null);
  };

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email ?? null);

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const {
        data: adminStatus,
        error: adminStatusError,
      } = await supabase.rpc("is_current_user_admin");

      if (adminStatusError) {
        console.error(
          "Failed to check admin status:",
          adminStatusError
        );
        setIsAdmin(false);
      } else {
        setIsAdmin(adminStatus === true);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user;

        setUserEmail(user?.email ?? null);

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const {
          data: adminStatus,
          error: adminStatusError,
        } = await supabase.rpc("is_current_user_admin");

        if (adminStatusError) {
          console.error(
            "Failed to check admin status:",
            adminStatusError
          );
          setIsAdmin(false);
        } else {
          setIsAdmin(adminStatus === true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* ================= LOGIN URL HANDLING ================= */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("login") === "true") {
      setActiveModalState("login");

      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  /* ================= APPROVED BUSINESSES ================= */

  useEffect(() => {
    const supabase = createClient();

    const loadApprovedBusinesses = async (
      showLoading = false
    ) => {
      if (showLoading) {
        setBusinessesLoading(true);
      }

      setBusinessesError("");

      const { data, error } = await supabase.rpc(
        "get_public_business_listings"
      );

      if (error) {
        console.error(
          "Failed to load approved businesses:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        setBusinessesError(
          "Unable to load businesses right now."
        );

        setBusinessesLoading(false);
        return;
      }

      const listings = (data ?? []) as BusinessListing[];

      setApprovedBusinesses(listings);

      const liveListings = listings.filter(
        (listing) => listing.listing_status === "live"
      );

      if (liveListings.length === 0) {
        setBidCounts({});
      } else {
        const bidCountResults = await Promise.all(
          liveListings.map(async (listing) => {
            const { data: bidRows, error: bidHistoryError } =
              await supabase.rpc(
                "get_public_bid_history",
                {
                  p_listing_id: listing.id,
                }
              );

            if (bidHistoryError) {
              console.error(
                "Failed to load bid history for count:",
                listing.id,
                bidHistoryError
              );
              return {
                listingId: listing.id,
                count: 0,
              };
            }

            return {
              listingId: listing.id,
              count: (bidRows ?? []).length,
            };
          })
        );

        const counts: Record<string, number> = {};

        for (const result of bidCountResults) {
          counts[result.listingId] = result.count;
        }

        setBidCounts(counts);
      }

      setBusinessesLoading(false);
    };

    // Initial secure public marketplace load.
    void loadApprovedBusinesses(true);

    // Realtime is used only as a change signal. We do NOT use
    // the database payload directly because the homepage must
    // continue receiving public marketplace data through the
    // secure get_public_business_listings() RPC.
    const channel = supabase
      .channel("homepage-business-listings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_listings",
        },
        () => {
          void loadApprovedBusinesses(false);
        }
      )
      .subscribe((status) => {
        console.log(
          "Homepage business realtime:",
          status
        );
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  /* ================= ACTIONS ================= */

  const handleLogout = async () => {
    await createClient().auth.signOut();

    setUserEmail(null);
    setIsAdmin(false);
  };

  const openListing = () => {
    setAuthMessage("");

    setActiveModalState(
      userEmail ? "listing" : "login"
    );
  };

  const handleSignupSuccess = (message: string) => {
    setAuthMessage(message);
    setActiveModalState(null);
  };

  const handleLoginSuccess = () => {
    setAuthMessage("You are now signed in.");
    setActiveModalState(null);
  };

  /* ================= TOP BUSINESSES ================= */

  const topBusinesses = [...approvedBusinesses]
    .filter(
      (business) =>
        business.listing_status === "live"
    )
    .sort(
      (a, b) =>
        Number(b.current_bid ?? 0) -
        Number(a.current_bid ?? 0)
    )
    .slice(0, 3);

  const topBusiness = topBusinesses[0];

  /* ================= LIVE BIDS ================= */

  const liveBids = [...approvedBusinesses]
    .filter(
      (business) =>
        business.listing_status === "live"
    )
    .sort(
      (a, b) =>
        Number(b.current_bid ?? 0) -
        Number(a.current_bid ?? 0)
    );

  const normalizedLiveBidSearch =
    liveBidSearch.trim().toLowerCase();

  const filteredLiveBids = normalizedLiveBidSearch
    ? liveBids.filter((business) =>
        [
          business.business_name,
          business.category,
          business.location,
        ]
          .filter(Boolean)
          .some((value) =>
            value!
              .toLowerCase()
              .includes(normalizedLiveBidSearch)
          )
      )
    : liveBids;

  const visibleLiveBids =
    filteredLiveBids.slice(
      0,
      liveBidsVisibleCount
    );

  /* ================= CLICK TRACKING ================= */

  const trackBusinessClick = (
    listingId: string,
    clickType: "detail" | "website"
  ) => {
    const supabase = createClient();

    void supabase.rpc("track_business_click", {
      p_listing_id: listingId,
      p_click_type: clickType,
    });
  };

  const handleLiveBidSearchChange = (
    value: string
  ) => {
    setLiveBidSearch(value);
    setLiveBidsVisibleCount(15);
  };

  /* ================= UI ================= */

  return (
    <main className="overflow-hidden bg-[#f6f7f5] text-slate-900">

      {/* ================= HEADER ================= */}

      <header className="relative z-50 border-b border-slate-200/80 bg-[#f6f7f5]/95 backdrop-blur">

        <nav
          className="mx-auto max-w-7xl px-5 py-4 sm:px-8 sm:py-5"
          aria-label="Main navigation"
        >

          <div className="flex items-center justify-between">

            <a
              href="#top"
              className="flex items-center gap-3"
              onClick={() =>
                setMobileMenuOpen(false)
              }
            >

              <Image
                src="/logo.png"
                alt="OutbidInd"
                width={36}
                height={36}
                priority
                className="h-9 w-9 object-contain"
              />

              <span className="text-lg font-bold tracking-tight text-slate-950">
                Outbid<span className="text-[#e4572e]">Ind</span>
              </span>

            </a>

            {/* Desktop Navigation */}

            <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">

              <a
                className="transition hover:text-[#d94d28]"
                href="#explore"
              >
                Explore
              </a>

              <a
                className="transition hover:text-[#d94d28]"
                href="#live-bids"
              >
                Live Bids
              </a>

              <a
                className="transition hover:text-[#d94d28]"
                href="#how-it-works"
              >
                How It Works
              </a>

              <button
                type="button"
                className="transition hover:text-[#d94d28]"
                onClick={openListing}
              >
                List Your Business
              </button>

            </div>

            {/* Desktop Account */}

            <div className="hidden items-center gap-3 md:flex">

              {userEmail ? (
                <>
                  {isAdmin ? (
                    <a
                      href="/admin"
                      className="rounded-lg bg-[#e4572e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#c94724]"
                    >
                      Dashboard
                    </a>
                  ) : (
                    <>
                      <a
                        href="/user-panel"
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        My Panel
                      </a>

                      <span className="max-w-36 truncate rounded-lg px-3 py-2 text-sm font-semibold text-slate-500">
                        {userEmail}
                      </span>
                    </>
                  )}

                  <button
                    type="button"
                    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50"
                    onClick={() =>
                      setActiveModal("login")
                    }
                  >
                    Login
                  </button>

                  <button
                    type="button"
                    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    onClick={() =>
                      setActiveModal("signup")
                    }
                  >
                    Sign up
                  </button>
                </>
              )}

            </div>

            {/* Mobile Menu Button */}

            <button
              type="button"
              aria-label={
                mobileMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              onClick={() =>
                setMobileMenuOpen(
                  (open) => !open
                )
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50 md:hidden"
            >

              <span className="sr-only">
                {mobileMenuOpen
                  ? "Close menu"
                  : "Open menu"}
              </span>

              <span
                className="text-xl leading-none"
                aria-hidden="true"
              >
                {mobileMenuOpen
                  ? "×"
                  : "☰"}
              </span>

            </button>

          </div>

          {/* Mobile Navigation */}

          {mobileMenuOpen && (
            <div className="mt-4 border-t border-slate-200 pt-4 md:hidden">

              <div className="flex flex-col gap-1 text-sm font-semibold text-slate-700">

                <a
                  href="#explore"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="rounded-lg px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94d28]"
                >
                  Explore
                </a>

                <a
                  href="#live-bids"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="rounded-lg px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94d28]"
                >
                  Live Bids
                </a>

                <a
                  href="#how-it-works"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="rounded-lg px-4 py-3 transition hover:bg-orange-50 hover:text-[#d94d28]"
                >
                  How It Works
                </a>

                <button
                  type="button"
                  className="rounded-lg px-4 py-3 text-left transition hover:bg-orange-50 hover:text-[#d94d28]"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openListing();
                  }}
                >
                  List Your Business
                </button>

                <div className="my-2 border-t border-slate-200" />

                {userEmail ? (
                  <>
                    {isAdmin ? (
                      <a
                        href="/admin"
                        onClick={() =>
                          setMobileMenuOpen(false)
                        }
                        className="rounded-lg bg-[#e4572e] px-4 py-3 text-center font-bold text-white transition hover:bg-[#c94724]"
                      >
                        Dashboard
                      </a>
                    ) : (
                      <>
                        <a
                          href="/user-panel"
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          My Panel
                        </a>

                        <div className="truncate px-4 py-3 text-center text-xs font-semibold text-slate-500">
                          {userEmail}
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      className="rounded-lg bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await handleLogout();
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-lg px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-orange-50"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveModal("login");
                      }}
                    >
                      Login
                    </button>

                    <button
                      type="button"
                      className="rounded-lg bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveModal("signup");
                      }}
                    >
                      Sign up
                    </button>
                  </>
                )}

              </div>

            </div>
          )}

        </nav>

      </header>

      {/* ================= AUTH MESSAGE ================= */}

      {authMessage && (
        <p
          role="status"
          className="mx-auto max-w-7xl px-5 pt-5 text-sm font-medium text-emerald-700 sm:px-8"
        >
          {authMessage}
        </p>
      )}

      {/* ================= HERO ================= */}

      <section
        id="top"
        className="mx-auto grid w-full min-w-0 max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:pb-28"
      >

        <div className="min-w-0 animate-rise">

          <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[#d94d28]">
            The new way to discover ownership
          </p>

          <h1 className="max-w-2xl text-5xl font-bold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-7xl">
            Discover businesses.
            <br />

            <span className="text-[#e4572e]">
              Bid. Compete.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Explore approved businesses across India and
            take part in a transparent, continuous bidding
            marketplace built for serious opportunities.
          </p>

          {/* ================= HERO CTA ================= */}

          <div className="mt-9 flex w-full flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={() =>
                setActiveModal("listing")
              }
              className="w-full rounded-lg bg-[#e4572e] px-6 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 sm:w-auto"
            >
              List Your Business
            </button>

          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5 text-sm text-slate-500">

            <span>
              <strong className="block text-xl text-slate-950">
                Curated
              </strong>
              listings
            </span>

            <span>
              <strong className="block text-xl text-slate-950">
                Clear
              </strong>
              bid activity
            </span>

            <span>
              <strong className="block text-xl text-slate-950">
                India-wide
              </strong>
              discovery
            </span>

          </div>

        </div>

        {/* ================= MARKETPLACE PREVIEW ================= */}

        <div className="relative min-w-0 w-full animate-float">

          <div
            className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-orange-100/70 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative w-full min-w-0 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-6">

            <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 pb-5">

              <div className="min-w-0">

                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Marketplace
                </p>

                <p className="mt-1 break-words font-bold text-slate-950">
                  {businessesLoading
                    ? "Loading..."
                    : topBusiness
                    ? topBusiness.business_name
                    : "No approved businesses yet"}
                </p>

              </div>

              <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                TOP BID

              </span>

            </div>

            <div className="mt-6 rounded-xl bg-[#102a43] p-5 text-white sm:p-7">

              {businessesLoading ? (

                <div className="py-10 text-center">

                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />

                  <p className="mt-4 text-sm text-slate-300">
                    Loading marketplace...
                  </p>

                </div>

              ) : topBusiness ? (

                <>

                  <div className="flex items-end justify-between">

                    <div>

                      <p className="text-sm text-slate-300">
                        Current bid
                      </p>

                      <p className="mt-2 text-4xl font-bold tracking-tight">
                        ₹
                        {Number(
                          topBusiness.current_bid ?? 0
                        ).toLocaleString("en-IN")}
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-sm text-slate-300">
                        Starting bid
                      </p>

                      <p className="mt-1 text-xs text-orange-200">
                        ₹
                        {Number(
                          topBusiness.starting_bid ?? 0
                        ).toLocaleString("en-IN")}
                      </p>

                    </div>

                  </div>

                  <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/15">

                    <div
                      className="h-full rounded-full bg-[#f28c62]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            5,
                            (Number(
                              topBusiness.current_bid ?? 0
                            ) /
                              Math.max(
                                Number(
                                  topBusiness.starting_bid ?? 0
                                ),
                                1
                              )) *
                              50
                          )
                        )}%`,
                      }}
                    />

                  </div>

                  <div className="mt-3 flex justify-between text-xs text-slate-400">

                    <span>
                      {topBusiness.category ??
                        "Uncategorized"}
                    </span>

                    <span>
                      {topBusiness.location ??
                        "Location not provided"}
                    </span>

                  </div>

                </>

              ) : (

                <div className="py-10 text-center">

                  <p className="text-lg font-bold">
                    No approved businesses yet.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Approved businesses will appear here.
                  </p>

                </div>

              )}

            </div>

            <div className="mt-5">

              <div className="mb-3 flex items-center justify-between">

                <p className="text-sm font-bold text-slate-950">
                  Top current bids
                </p>

                <span className="text-xs text-slate-400">
                  Approved listings
                </span>

              </div>

              {businessesError ? (

                <div className="border-t border-slate-100 py-5 text-sm text-red-600">
                  Unable to load businesses.
                </div>

              ) : topBusinesses.length === 0 ? (

                <div className="border-t border-slate-100 py-5 text-sm text-slate-400">
                  No live auctions available yet.
                </div>

              ) : (

                topBusinesses.map(
                  (business, index) => (
                    <div
                      key={business.id}
                      className="flex items-center justify-between gap-4 border-t border-slate-100 py-3"
                    >

                      <a
                        href={`/business/${business.id}`}
                        onClick={() =>
                          trackBusinessClick(
                            business.id,
                            "detail"
                          )
                        }
                        className="flex min-w-0 items-center gap-3"
                      >

                        <span className="text-xs font-bold text-[#d94d28]">
                          #{index + 1}
                        </span>

                        <BusinessLogo
                          businessName={
                            business.business_name
                          }
                          website={
                            business.business_website
                          }
                        />

                        <div className="min-w-0">

                          <p className="break-words text-sm font-semibold text-slate-700 transition hover:text-[#d94d28]">
                            {business.business_name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            {business.category ??
                              "Uncategorized"}{" "}
                            ·{" "}
                            {business.location ??
                              "Location not provided"}
                          </p>

                        </div>

                      </a>

                      <div className="shrink-0 text-right">

                        <strong className="text-sm font-black text-[#d94d28]">
                          ₹
                          {Number(
                            business.current_bid ?? 0
                          ).toLocaleString("en-IN")}
                        </strong>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">
                          {bidCounts[business.id] ?? 0}{" "}
                          {bidCounts[business.id] === 1 ? "bid" : "bids"}
                        </p>

                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          {Number(
                            business.click_count ?? 0
                          ).toLocaleString("en-IN")}{" "}
                          clicks
                        </p>

                      </div>

                    </div>
                  )
                )

              )}

            </div>

          </div>

        </div>

      </section>

      {/* ================= LIVE BIDS ================= */}

      <section
        id="live-bids"
        className="border-y border-slate-200 bg-[#f6f7f5]"
      >

        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d94d28]">
                Live marketplace
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                All Live Bids
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Live auctions ranked from the highest current bid to the lowest.
                Search any business to find its current marketplace position.
              </p>

            </div>

            <div className="w-full lg:max-w-md">

              <label
                htmlFor="live-bid-search"
                className="sr-only"
              >
                Search live businesses
              </label>

              <div className="relative">

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  ⌕
                </span>

                <input
                  id="live-bid-search"
                  type="search"
                  value={liveBidSearch}
                  onChange={(event) =>
                    handleLiveBidSearchChange(
                      event.target.value
                    )
                  }
                  placeholder="Search business, category or location..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e4572e] focus:ring-4 focus:ring-orange-100"
                />

              </div>

            </div>

          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border-2 border-[#e4572e]/25 bg-white shadow-[0_24px_70px_rgba(228,87,46,0.14)] ring-1 ring-orange-100">

            <div className="flex flex-col gap-3 border-b border-orange-100 bg-orange-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <div>

                <p className="font-bold text-slate-950">
                  Live auction ranking
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {filteredLiveBids.length === 0
                    ? "No matching live auctions"
                    : `Showing ${Math.min(
                        liveBidsVisibleCount,
                        filteredLiveBids.length
                      )} of ${
                        filteredLiveBids.length
                      } matching auctions`}
                </p>

              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                {liveBids.length} LIVE

              </span>

            </div>

            {businessesLoading ? (

              <div className="px-6 py-14 text-center">

                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#e4572e]" />

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Loading live auctions...
                </p>

              </div>

            ) : businessesError ? (

              <div className="px-6 py-14 text-center text-sm font-semibold text-red-600">
                Unable to load live auctions.
              </div>

            ) : filteredLiveBids.length === 0 ? (

              <div className="px-6 py-14 text-center">

                <p className="font-bold text-slate-950">
                  {normalizedLiveBidSearch
                    ? "No live business matches your search."
                    : "No live auctions yet."}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {normalizedLiveBidSearch
                    ? "Try another business name, category or location."
                    : "Live auctions will appear here after an admin starts them."}
                </p>

              </div>

            ) : (

              <>

                {/* Desktop table */}

                <div className="hidden overflow-x-auto sm:block">

                  <table className="w-full min-w-[760px] text-left">

                    <thead className="border-b border-slate-100 bg-slate-50/80">

                      <tr>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 sm:px-6">
                          Rank
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          Business
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          Category
                        </th>

                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          Current Bid
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          Clicks
                        </th>
</tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {visibleLiveBids.map(
                        (business) => {

                          const globalRank =
                            liveBids.findIndex(
                              (item) =>
                                item.id ===
                                business.id
                            ) + 1;

                          return (
                            <tr
                              key={business.id}
                              className="cursor-pointer transition hover:bg-orange-50/60"
                            >

                              <td className="px-5 py-5 sm:px-6">

                                <span
                                  className={
                                    globalRank <= 3
                                      ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-[#d94d28]"
                                      : "inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500"
                                  }
                                >
                                  #{globalRank}
                                </span>

                              </td>

                              <td className="px-5 py-5">

                                <a
                                  href={`/business/${business.id}`}
                                  onClick={() =>
                                    trackBusinessClick(
                                      business.id,
                                      "detail"
                                    )
                                  }
                                  className="flex min-w-[240px] items-center gap-3"
                                >

                                  <BusinessLogo
                                    businessName={
                                      business.business_name
                                    }
                                    website={
                                      business.business_website
                                    }
                                  />

                                  <div className="min-w-0">

                                    <p className="break-words font-bold text-slate-950 transition hover:text-[#d94d28]">
                                      {business.business_name}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                      {business.location ??
                                        "Location not provided"}
                                    </p>

                                  </div>

                                </a>

                              </td>

                              <td className="px-5 py-5 text-sm font-medium text-slate-600">
                                {business.category ??
                                  "Uncategorized"}
                              </td>

                              <td className="px-5 py-5">

                                <p className="font-black text-slate-950">
                                  ₹
                                  {Number(
                                    business.current_bid ?? 0
                                  ).toLocaleString(
                                    "en-IN"
                                  )}
                                </p>

                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {bidCounts[business.id] ?? 0}{" "}
                                  {bidCounts[business.id] === 1 ? "bid" : "bids"}
                                </p>

                              </td>

                              <td className="px-5 py-5 text-right">

                                <span className="text-xs font-semibold text-slate-400">
                                  {Number(
                                    business.click_count ?? 0
                                  ).toLocaleString(
                                    "en-IN"
                                  )}{" "}
                                  clicks
                                </span>

                              </td>
</tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

                {/* Mobile compact marketplace rows */}

                <div className="divide-y divide-slate-100 sm:hidden">

                  {visibleLiveBids.map(
                    (business) => {

                      const globalRank =
                        liveBids.findIndex(
                          (item) =>
                            item.id ===
                            business.id
                        ) + 1;

                      return (
                        <div
                          key={business.id}
                          className="px-4 py-4 transition active:bg-orange-50/50"
                        >

                          <div className="flex items-start gap-3">

                            <div className="flex w-11 shrink-0 flex-col items-center gap-2">

                              <span
                                className={
                                  globalRank <= 3
                                    ? "flex h-9 w-9 items-center justify-center rounded-full bg-[#102a43] text-xs font-black text-white"
                                    : "flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500"
                                }
                              >
                                #{globalRank}
                              </span>

                              <BusinessLogo
                                businessName={
                                  business.business_name
                                }
                                website={
                                  business.business_website
                                }
                              />

                            </div>

                            <a
                              href={`/business/${business.id}`}
                              onClick={() =>
                                trackBusinessClick(
                                  business.id,
                                  "detail"
                                )
                              }
                              className="min-w-0 flex-1"
                            >

                              <p className="break-words text-[15px] font-black leading-5 text-slate-950 transition hover:text-[#d94d28]">
                                {business.business_name}
                              </p>

                              <p className="mt-1 break-words text-xs leading-4 text-slate-500">
                                {business.category ??
                                  "Uncategorized"}

                                {business.location
                                  ? ` · ${business.location}`
                                  : ""}
                              </p>

                              <p className="mt-2 text-[11px] font-semibold text-slate-400">
                                {Number(
                                  business.click_count ?? 0
                                ).toLocaleString(
                                  "en-IN"
                                )}{" "}
                                clicks
                              </p>

                            </a>

                            <div className="shrink-0 text-right">

                              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                                Current
                              </p>

                              <p className="mt-1 text-lg font-black leading-none text-[#d94d28]">
                                ₹
                                {Number(
                                  business.current_bid ?? 0
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </p>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

                {liveBidsVisibleCount <
                  filteredLiveBids.length && (

                  <div className="border-t border-slate-100 px-5 py-5 text-center sm:px-6">

                    <button
                      type="button"
                      onClick={() =>
                        setLiveBidsVisibleCount(
                          (count) =>
                            count + 15
                        )
                      }
                      className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-[#e4572e]"
                    >
                      See More Live Bids
                    </button>

                  </div>
                )}

                {liveBidsVisibleCount >=
                  filteredLiveBids.length &&
                  filteredLiveBids.length > 15 && (

                  <div className="border-t border-slate-100 px-5 py-4 text-center text-xs font-medium text-slate-400 sm:px-6">
                    You have reached the end of the live auction list.
                  </div>
                )}

              </>

            )}

          </div>

        </div>

      </section>

      {/* ================= EXPLORE ================= */}

      <section
        id="explore"
        className="hidden border-y border-slate-200 bg-white"
      >

        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d94d28]">
                Explore the marketplace
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Businesses worth looking closer at.
              </h2>

            </div>

            <p className="max-w-sm text-sm leading-6 text-slate-500">
              Only approved businesses are displayed here.
              New listings appear after admin review.
            </p>

          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">

            {businessesLoading && (
              <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-10 text-center">

                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#e4572e]" />

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Loading approved businesses...
                </p>

              </div>
            )}

            {!businessesLoading &&
              businessesError && (
                <div className="lg:col-span-3 rounded-2xl border border-red-200 bg-red-50 p-10 text-center">

                  <p className="text-sm font-semibold text-red-700">
                    {businessesError}
                  </p>

                </div>
              )}

            {!businessesLoading &&
              !businessesError &&
              approvedBusinesses.length === 0 && (
                <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-10 text-center">

                  <p className="text-lg font-bold text-slate-950">
                    No approved businesses yet.
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Approved businesses will appear here once
                    they are available.
                  </p>

                </div>
              )}

            {!businessesLoading &&
              !businessesError &&
              approvedBusinesses.map(
                (business) => {

                  const initials =
                    business.business_name
                      .split(" ")
                      .map(
                        (word) => word[0]
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                  const website =
                    business.business_website
                      ? business.business_website.startsWith(
                          "http"
                        )
                        ? business.business_website
                        : `https://${business.business_website}`
                      : null;

                  return (
                    <article
                      key={business.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >

                      <div className="flex h-40 items-end justify-between bg-orange-100 p-6">

                        <span className="text-5xl font-black tracking-[-0.08em] text-slate-950/15">
                          {initials}
                        </span>

                        <span
                          className={
                            business.listing_status ===
                            "live"
                              ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                              : "rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
                          }
                        >
                          {business.listing_status ===
                          "live"
                            ? "LIVE AUCTION"
                            : "APPROVED"}
                        </span>

                      </div>

                      <div className="p-6">

                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d94d28]">
                          {business.category ??
                            "Uncategorized"}
                        </p>

                        <a
                          href={`/business/${business.id}`}
                          className="mt-2 block text-xl font-bold text-slate-950 transition hover:text-[#d94d28]"
                        >
                          {business.business_name}
                        </a>

                        <p className="mt-1 text-sm text-slate-500">
                          {business.location ??
                            "Location not provided"}
                        </p>

                        {business.description && (
                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                            {business.description}
                          </p>
                        )}

                        <div className="mt-7 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">

                          <div>

                            <p className="text-xs text-slate-400">
                              Starting bid
                            </p>

                            <p className="mt-1 font-bold text-slate-700">
                              ₹
                              {Number(
                                business.starting_bid ?? 0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="text-xs text-slate-400">
                              Current bid
                            </p>

                            <p className="mt-1 font-bold text-slate-950">
                              ₹
                              {Number(
                                business.current_bid ?? 0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">

                          {website ? (
                            <a
                              href={website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackBusinessClick(
                                  business.id,
                                  "website"
                                )
                              }
                              className="font-bold text-[#d94d28] transition hover:text-[#102a43]"
                            >
                              Visit Website{" "}
                              <Arrow />
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Website unavailable
                            </span>
                          )}

                          <a
                            href={`/business/${business.id}`}
                            onClick={() =>
                              trackBusinessClick(
                                business.id,
                                "detail"
                              )
                            }
                            className="rounded-lg bg-[#e4572e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#c94724]"
                          >
                            Bid
                          </a>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

          </div>

        </div>

      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8"
      >

        <div className="max-w-2xl">

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d94d28]">
            A clearer path forward
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            From discovery to opportunity.
          </h2>

        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-4">

          {[
            [
              "01",
              "Discover",
              "Find businesses available on OutbidInd.",
            ],
            [
              "02",
              "Review",
              "Explore the business information and official website.",
            ],
            [
              "03",
              "Bid",
              "Participate in continuous competitive bidding.",
            ],
            [
              "04",
              "Win",
              "Become the successful bidder when the bidding process ends.",
            ],
          ].map(
            ([number, title, copy]) => (
              <div
                key={number}
                className="border-t-2 border-slate-200 pt-5"
              >

                <span className="text-sm font-bold text-[#d94d28]">
                  {number}
                </span>

                <h3 className="mt-5 text-xl font-bold text-slate-950">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {copy}
                </p>

              </div>
            )
          )}

        </div>

      </section>

      {/* ================= TRUST ================= */}

      <section className="bg-[#102a43] text-white">

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-200">
              Built with care
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Trust should be part of the product.
            </h2>

            <p className="mt-5 max-w-md leading-7 text-slate-300">
              Business listings are reviewed before going live.
              OutbidInd uses account-based access, with more
              security and verification features added as the
              platform evolves.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-white/15 bg-white/5 p-5">

              <p className="text-2xl font-bold text-orange-200">
                01
              </p>

              <p className="mt-8 text-sm font-semibold">
                Reviewed listings
              </p>

            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-5">

              <p className="text-2xl font-bold text-orange-200">
                02
              </p>

              <p className="mt-8 text-sm font-semibold">
                Account-based access
              </p>

            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-5">

              <p className="text-2xl font-bold text-orange-200">
                03
              </p>

              <p className="mt-8 text-sm font-semibold">
                Evolving safeguards
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* ================= CTA ================= */}

      <section
        id="coming-soon"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8"
      >

        <div className="relative overflow-hidden rounded-2xl bg-[#e4572e] px-7 py-12 text-white sm:px-12">

          <div className="relative z-10 max-w-2xl">

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-100">
              For business owners
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Your business could be the next opportunity.
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-orange-50">
              Submit your business for review. Approved listings
              can become active on the OutbidInd marketplace.
            </p>

            <button
              onClick={() =>
                setActiveModal("listing")
              }
              className="mt-8 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-[#c94724] transition hover:bg-orange-50 focus:outline-none focus:ring-4 focus:ring-white/40"
            >
              List Your Business <Arrow />
            </button>

          </div>

          <div
            className="absolute -bottom-20 -right-8 h-56 w-56 rounded-full border-[28px] border-white/15"
            aria-hidden="true"
          />

        </div>

      </section>

      {/* ================= FOOTER ================= */}

      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">

          <div>

            <a
              href="#top"
              className="flex items-center gap-3"
            >

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e4572e] text-xs font-black text-white">
                O
              </span>

              <span className="font-bold text-slate-950">
                OutbidInd
              </span>

            </a>

            <p className="mt-3 text-sm text-slate-500">
              A thoughtful marketplace for business opportunity.
            </p>

          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">

            <a
              href="#explore"
              className="hover:text-[#d94d28]"
            >
              Explore
            </a>

            <a
              href="#live-bids"
              className="hover:text-[#d94d28]"
            >
              Live Bids
            </a>

            <button
              onClick={() =>
                setActiveModal("listing")
              }
              className="hover:text-[#d94d28]"
            >
              List Your Business
            </button>

            <a
              href="#how-it-works"
              className="hover:text-[#d94d28]"
            >
              How It Works
            </a>

            <a
              href="#coming-soon"
              className="hover:text-[#d94d28]"
            >
              Privacy
            </a>

            <a
              href="#coming-soon"
              className="hover:text-[#d94d28]"
            >
              Terms
            </a>

          </div>

          <p className="text-sm text-slate-400">
            © 2026 OutbidInd
          </p>

        </div>

      </footer>

      {/* ================= MODALS ================= */}

      <Modal
        isOpen={activeModal === "login"}
        title="Welcome back"
        onClose={closeModal}
      >
        <LoginForm
          onSignup={() =>
            setActiveModal("signup")
          }
          onSuccess={handleLoginSuccess}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "signup"}
        title="Create your account"
        onClose={closeModal}
      >
        <SignupForm
          onLogin={() =>
            setActiveModal("login")
          }
          onSuccess={handleSignupSuccess}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "listing"}
        title="List your business"
        onClose={closeModal}
      >
        <BusinessListingForm />
      </Modal>

      <Modal
        isOpen={activeModal === "bid"}
        title="Participate in bidding"
        onClose={closeModal}
      >
        <DemoNotice />
      </Modal>

    </main>
  );
}

/* ================= BID DEMO ================= */

function DemoNotice() {
  return (
    <div className="space-y-5">

      <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
        Bidding is coming soon. This preview is not connected
        to live auctions or accounts.
      </p>

      <button
        type="button"
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white"
        disabled
      >
        Coming soon
      </button>

    </div>
  );
}