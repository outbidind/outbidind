import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = {
  title: "Deleted Businesses | OutbidInd",
  description:
    "Private OutbidInd administration page for authorized review of deleted business records.",
  robots: {
    index: false,
    follow: false,
  },
};

type DeletedListing = {
  id: string;
  business_name: string;
  category: string | null;
  location: string | null;
  starting_bid: number | null;
  current_bid: number | null;
  listing_status: string;
  deleted_at: string | null;
  created_at: string;
};

export default async function DeletedBusinessesPage() {
  const supabase = await createClient();

  /* ================= AUTH CHECK ================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  /* ================= ADMIN CHECK ================= */

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl">🔒</div>

          <h1 className="text-2xl font-semibold text-zinc-900">
            Access Denied
          </h1>

          <p className="mt-3 text-zinc-600">
            You do not have permission to access deleted businesses.
          </p>
        </div>
      </main>
    );
  }

  /* ================= FETCH DELETED BUSINESSES ================= */

  const {
    data: deletedBusinesses,
    error: deletedBusinessesError,
  } = await supabase
    .from("business_listings")
    .select(
      `
        id,
        business_name,
        category,
        location,
        starting_bid,
        current_bid,
        listing_status,
        deleted_at,
        created_at
      `
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const listings: DeletedListing[] = deletedBusinesses ?? [];

  /* ================= HELPERS ================= */

  const formatMoney = (value: number | null) => {
    return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN");
  };

  return (
    <main className="min-h-screen bg-zinc-50">

      {/* ================= HEADER ================= */}

      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <p className="text-sm font-medium text-zinc-500">
              OutbidInd
            </p>

            <h1 className="text-2xl font-bold text-zinc-900">
              Deleted Businesses
            </h1>
          </div>

          <div className="flex items-center gap-3">

            <a
              href="/admin"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              ← Admin Dashboard
            </a>

            <a
              href="/"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e4572e]"
            >
              Marketplace
            </a>

          </div>

        </div>
      </header>

      {/* ================= MAIN ================= */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Trash / Archive
          </p>

          <h2 className="mt-2 text-3xl font-bold text-zinc-900">
            Deleted Businesses
          </h2>

          <p className="mt-2 max-w-2xl text-zinc-600">
            These businesses have been soft-deleted. Their database records
            are still preserved and can be restored later.
          </p>

        </div>

        {/* ================= ERROR ================= */}

        {deletedBusinessesError && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Unable to load deleted businesses. Please refresh and try again.
          </div>
        )}

        {/* ================= EMPTY STATE ================= */}

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">

            <div className="mb-4 text-5xl">
              🗑️
            </div>

            <h3 className="text-xl font-bold text-zinc-900">
              No Deleted Businesses
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Deleted businesses will appear here.
            </p>

            <a
              href="/admin"
              className="mt-6 inline-flex rounded-lg bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e4572e]"
            >
              Back to Admin Dashboard
            </a>

          </div>
        ) : (

          /* ================= TABLE ================= */

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">

              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Deleted Listings
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {listings.length} deleted business
                  {listings.length === 1 ? "" : "es"}
                </p>
              </div>

              <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700">
                Archived
              </span>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] text-left">

                <thead className="border-b border-zinc-200 bg-zinc-50">

                  <tr>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Business
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Status Before Delete
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Starting Bid
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Current Bid
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Deleted At
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-zinc-100">

                  {listings.map((listing) => (

                    <tr
                      key={listing.id}
                      className="transition hover:bg-zinc-50"
                    >

                      {/* BUSINESS */}

                      <td className="px-5 py-5">

                        <p className="font-bold text-zinc-900">
                          {listing.business_name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {listing.location ?? "Location not provided"}
                        </p>

                      </td>

                      {/* CATEGORY */}

                      <td className="px-5 py-5 text-sm text-zinc-600">
                        {listing.category ?? "—"}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-5">

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize text-zinc-700">
                          {listing.listing_status.replaceAll(
                            "_",
                            " "
                          )}
                        </span>

                      </td>

                      {/* STARTING BID */}

                      <td className="px-5 py-5 text-sm font-semibold text-zinc-700">
                        {formatMoney(listing.starting_bid)}
                      </td>

                      {/* CURRENT BID */}

                      <td className="px-5 py-5 text-sm font-black text-zinc-900">
                        {formatMoney(listing.current_bid)}
                      </td>

                      {/* DELETED DATE */}

                      <td className="px-5 py-5 text-sm text-zinc-500">
                        {formatDate(listing.deleted_at)}
                      </td>

                      {/* ACTION */}

                      <td className="px-5 py-5">

                        <a
                          href={`/business/${listing.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50"
                        >
                          View ↗
                        </a>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </section>

    </main>
  );
}