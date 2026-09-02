"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BidFormProps = {
  listingId: string;
  currentBid: number;
  onSuccess?: (newBid: number) => void;
};

export default function BidForm({
  listingId,
  currentBid,
  onSuccess,
}: BidFormProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minimumBid =
    Math.floor(Number(currentBid)) + 1;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const bidAmount = Number(amount);

    /*
     * =====================================================
     * 1. BASIC AMOUNT VALIDATION
     * =====================================================
     */

    if (
      !Number.isFinite(bidAmount) ||
      bidAmount <= 0
    ) {
      setError(
        "Please enter a valid bid amount."
      );
      return;
    }

    /*
     * =====================================================
     * 2. CURRENT BID CHECK
     * =====================================================
     *
     * User must bid strictly higher than the
     * currently displayed bid.
     */

    if (bidAmount <= Number(currentBid)) {
      setError(
        `Your bid must be higher than ₹${Number(
          currentBid
        ).toLocaleString("en-IN")}.`
      );
      return;
    }

    /*
     * =====================================================
     * 3. AUTHENTICATION
     * =====================================================
     */

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError(
          "You must be logged in to place a bid."
        );
        return;
      }

      /*
       * ===================================================
       * 4. REFRESH THE CURRENT BID FROM DATABASE
       * ===================================================
       *
       * The value displayed in the browser may be old.
       *
       * Therefore we fetch the latest business record
       * before continuing.
       */

      const {
        data: listing,
        error: listingError,
      } = await supabase
        .from("business_listings")
        .select(
          "id, listing_status, current_bid"
        )
        .eq("id", listingId)
        .maybeSingle();

      if (listingError) {
        console.error(
          "Listing lookup error:",
          listingError
        );

        setError(
          "Unable to verify the current bid. Please try again."
        );

        return;
      }

      if (!listing) {
        setError(
          "This business listing could not be found."
        );

        return;
      }

      /*
       * ===================================================
       * 5. LISTING STATUS CHECK
       * ===================================================
       *
       * Only LIVE businesses can receive normal bids.
       */

      if (listing.listing_status !== "live") {
        setError(
          "Bidding is currently unavailable for this business."
        );

        return;
      }

      /*
       * ===================================================
       * 6. SERVER-FRESH CURRENT BID CHECK
       * ===================================================
       */

      const latestCurrentBid =
        Number(listing.current_bid);

      if (
        !Number.isFinite(latestCurrentBid)
      ) {
        setError(
          "Unable to verify the current bid."
        );

        return;
      }

      if (bidAmount <= latestCurrentBid) {
        setError(
          `The current bid has changed to ₹${latestCurrentBid.toLocaleString(
            "en-IN"
          )}. Please enter a higher amount.`
        );

        return;
      }

      /*
       * ===================================================
       * 7. PAYMENT IS NOT EXECUTED HERE
       * ===================================================
       *
       * IMPORTANT:
       *
       * We deliberately DO NOT call:
       *
       * supabase.rpc("place_bid")
       *
       * here.
       *
       * A bid must NOT become LIVE before payment
       * verification.
       *
       * The next payment/security implementation will
       * continue from this point.
       */

      setSuccess(
        `Bid of ₹${bidAmount.toLocaleString(
          "en-IN"
        )} passed the initial bid checks and is ready for security verification.`
      );

      /*
       * Keep the amount in the form for now.
       *
       * onSuccess is intentionally NOT called here
       * because the bid has not become LIVE yet.
       */

    } catch (submitError) {
      console.error(
        "Bid submission error:",
        submitError
      );

      setError(
        "Unable to process your bid. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* ================================================= */}
      {/* CURRENT BID */}
      {/* ================================================= */}

      <div>
        <p className="text-sm text-slate-500">
          Current bid
        </p>

        <p className="mt-1 text-2xl font-bold text-slate-950">
          ₹
          {Number(currentBid).toLocaleString(
            "en-IN"
          )}
        </p>
      </div>

      {/* ================================================= */}
      {/* BID AMOUNT */}
      {/* ================================================= */}

      <div>
        <label
          htmlFor="bid-amount"
          className="block text-sm font-bold text-slate-800"
        >
          Your bid
        </label>

        <div className="relative mt-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
            ₹
          </span>

          <input
            id="bid-amount"
            type="number"
            min={minimumBid}
            step="1"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder={`More than ${Number(
              currentBid
            ).toLocaleString("en-IN")}`}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-8 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e4572e] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Your bid must be higher than the current
          bid.
        </p>
      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {error}
        </p>
      )}

      {/* ================================================= */}
      {/* SUCCESS / NEXT STEP MESSAGE */}
      {/* ================================================= */}

      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
        >
          {success}
        </p>
      )}

      {/* ================================================= */}
      {/* BUTTON */}
      {/* ================================================= */}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting
          ? "Checking..."
          : "Continue"}
      </button>
    </form>
  );
}