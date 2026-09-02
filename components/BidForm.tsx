"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BidFormProps = {
  listingId: string;
  currentBid: number;
  onSuccess?: (newBid: number) => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (
  options: RazorpayOptions
) => RazorpayInstance;

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

  const loadRazorpay = async () => {
    const existingRazorpay = (
      window as Window & {
        Razorpay?: RazorpayConstructor;
      }
    ).Razorpay;

    if (existingRazorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const bidAmount = Number(amount);

    if (
      !Number.isFinite(bidAmount) ||
      bidAmount <= 0
    ) {
      setError(
        "Please enter a valid bid amount."
      );
      return;
    }

    if (bidAmount <= Number(currentBid)) {
      setError(
        `Your bid must be higher than ₹${Number(
          currentBid
        ).toLocaleString("en-IN")}.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // ===================================================
      // 1. VERIFY LOGGED-IN USER
      // ===================================================

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

      // ===================================================
      // 2. GET LATEST LISTING DATA
      // ===================================================

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

      if (listing.listing_status !== "live") {
        setError(
          "Bidding is currently unavailable for this business."
        );

        return;
      }

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

      // ===================================================
      // 3. LOAD RAZORPAY CHECKOUT
      // ===================================================

      const razorpayLoaded =
        await loadRazorpay();

      const Razorpay = (
        window as Window & {
          Razorpay?: RazorpayConstructor;
        }
      ).Razorpay;

      if (
        !razorpayLoaded ||
        !Razorpay
      ) {
        setError(
          "Unable to load the payment system. Please try again."
        );

        return;
      }

      // ===================================================
      // 4. CREATE BID PAYMENT ORDER
      // ===================================================

      const orderResponse =
        await fetch(
          "/api/bids/create-order",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              listingId,
              amount: bidAmount,
            }),
          }
        );

      const orderData =
        await orderResponse.json();

      if (
        !orderResponse.ok ||
        !orderData?.success
      ) {
        setError(
          orderData?.error ||
            "Unable to create bid payment order."
        );

        return;
      }

      // ===================================================
      // 5. OPEN RAZORPAY CHECKOUT
      // ===================================================

      const razorpayOptions: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "OutbidInd",
        description:
          `Bid for ${orderData.businessName}`,
        order_id: orderData.orderId,

        handler: async (response) => {
  try {
    setSuccess(
      "Payment received. Verifying your bid..."
    );

    const verifyResponse =
      await fetch(
        "/api/bids/verify-payment",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            paymentOrderId:
              orderData.paymentOrderId,
            razorpay_payment_id:
              response.razorpay_payment_id,
            razorpay_order_id:
              response.razorpay_order_id,
            razorpay_signature:
              response.razorpay_signature,
          }),
        }
      );

    const verifyData =
      await verifyResponse.json();

    if (
      !verifyResponse.ok ||
      !verifyData?.success
    ) {
      setError(
        verifyData?.error ||
          "Payment verification failed."
      );

      setSuccess("");
      return;
    }

    const verifiedBidAmount =
      Number(
        verifyData?.bid?.amount ??
          bidAmount
      );

    setSuccess(
      `Bid of ₹${verifiedBidAmount.toLocaleString(
        "en-IN"
      )} is now live.`
    );

    setAmount("");
    onSuccess?.(verifiedBidAmount);
  } catch (verificationError) {
    console.error(
      "Bid payment verification error:",
      verificationError
    );

    setError(
      "Payment was received, but bid verification failed. Please try again."
    );

    setSuccess("");
  } finally {
    setIsSubmitting(false);
  }
},

        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setSuccess("");
          },
        },
      };

      const razorpay =
        new Razorpay(
          razorpayOptions
        );

      razorpay.open();

    } catch (submitError) {
      console.error(
        "Bid payment error:",
        submitError
      );

      setError(
        "Unable to process your bid. Please try again."
      );

      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
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

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting
          ? "Opening Payment..."
          : "Continue"}
      </button>
    </form>
  );
}