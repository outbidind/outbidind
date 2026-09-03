"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;

  modal?: {
    ondismiss?: () => void;
  };

  theme?: {
    color?: string;
  };

  config?: {
    display?: {
      blocks?: {
        upi?: {
          name: string;
          instruments: {
            method: string;
          }[];
        };

        card?: {
          name: string;
          instruments: {
            method: string;
          }[];
        };
      };

      sequence?: string[];

      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (
  options: RazorpayOptions
) => RazorpayInstance;

type BidFormProps = {
  listingId: string;
  currentBid: number;
  onSuccess?: (newCurrentBid: number) => void;
};

const MINIMUM_BID = 99;

export default function BidForm({
  listingId,
  currentBid,
  onSuccess,
}: BidFormProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD RAZORPAY SCRIPT
  // =====================================================

  const loadRazorpay = async (): Promise<boolean> => {
    if (typeof window === "undefined") {
      return false;
    }

    const razorpayWindow =
      window as Window & {
        Razorpay?: RazorpayConstructor;
      };

    if (razorpayWindow.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const existingScript =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(true),
          { once: true }
        );

        existingScript.addEventListener(
          "error",
          () => resolve(false),
          { once: true }
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  // =====================================================
  // SUBMIT BID
  // =====================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const amount = Number(bidAmount);

    // =====================================================
    // MINIMUM BID VALIDATION
    // =====================================================

    if (
      !Number.isFinite(amount) ||
      amount < MINIMUM_BID
    ) {
      setError(
        "Minimum bid amount is ₹99."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // =====================================================
      // AUTH CHECK
      // =====================================================

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "You must be logged in to place a bid."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // FRESH LISTING CHECK
      // =====================================================

      const {
        data: latestListing,
        error: listingError,
      } = await supabase
        .from("business_listings")
        .select(
          "id, current_bid, listing_status"
        )
        .eq("id", listingId)
        .maybeSingle();

      if (
        listingError ||
        !latestListing
      ) {
        setError(
          "Unable to verify the business listing."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // ONLY LIVE AUCTIONS CAN RECEIVE BIDS
      // =====================================================

      if (
        latestListing.listing_status !==
        "live"
      ) {
        setError(
          "Bidding is only available for live auctions."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // RAZORPAY SCRIPT
      // =====================================================

      const razorpayLoaded =
        await loadRazorpay();

      if (!razorpayLoaded) {
        setError(
          "Unable to load the payment system. Please try again."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // CREATE SERVER-SIDE PAYMENT ORDER
      // =====================================================

      const createOrderResponse =
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
              amount,
            }),
          }
        );

      const createOrderData =
        await createOrderResponse
          .json()
          .catch(() => null);

      if (
        !createOrderResponse.ok ||
        !createOrderData?.success
      ) {
        setError(
          createOrderData?.error ??
            "Unable to create bid payment."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // RAZORPAY OPTIONS
      // =====================================================

      const options: RazorpayOptions = {
        key: createOrderData.keyId,

        amount: createOrderData.amount,

        currency:
          createOrderData.currency ??
          "INR",

        name: "OutbidInd",

        description:
          `Bid payment for ${
            createOrderData.businessName ??
            "business auction"
          }`,

        order_id:
          createOrderData.orderId,

        // ===================================================
        // PAYMENT SUCCESS HANDLER
        // ===================================================

        handler: async (
          response
        ) => {
          try {
            setMessage(
              "Verifying your payment..."
            );

            setError("");

            // ===============================================
            // SERVER-SIDE PAYMENT VERIFICATION
            // ===============================================

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
                      createOrderData.paymentOrderId,

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
              await verifyResponse
                .json()
                .catch(() => null);

            // ===============================================
            // VERIFICATION FAILED
            // ===============================================

            if (
              !verifyResponse.ok ||
              !verifyData?.success
            ) {
              setMessage("");

              setError(
                verifyData?.error ??
                  "Payment was verified but the bid could not be completed."
              );

              setLoading(false);
              return;
            }

            // ===============================================
            // VERIFIED BID AMOUNT
            // ===============================================

            const verifiedBidAmount =
              Number(
                verifyData?.bid?.amount ??
                  amount
              );

            // ===============================================
            // ACCUMULATED AUCTION TOTAL
            // ===============================================

            const newCurrentBid =
              Number(
                verifyData?.newCurrentBid ??
                  verifyData?.bid
                    ?.new_current_bid ??
                  verifyData?.bid
                    ?.current_bid ??
                  Number(currentBid) +
                    verifiedBidAmount
              );

            // ===============================================
            // SUCCESS
            // ===============================================

            setMessage(
              `₹${verifiedBidAmount.toLocaleString(
                "en-IN"
              )} added to the auction total.`
            );

            setBidAmount("");

            onSuccess?.(
              newCurrentBid
            );

            setLoading(false);
          } catch (
            verificationError
          ) {
            console.error(
              "Bid payment verification error:",
              verificationError
            );

            setMessage("");

            setError(
              "Payment verification failed. Please try again."
            );

            setLoading(false);
          }
        },

        // ===================================================
        // RAZORPAY CLOSED
        // ===================================================

        modal: {
          ondismiss: () => {
            setMessage("");
            setLoading(false);
          },
        },

        // ===================================================
        // RAZORPAY THEME
        // ===================================================

        theme: {
          color: "#e4572e",
        },

        // ===================================================
        // ONLY UPI + CARD
        // ===================================================

        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",

                instruments: [
                  {
                    method: "upi",
                  },
                ],
              },

              card: {
                name: "Pay using Card",

                instruments: [
                  {
                    method: "card",
                  },
                ],
              },
            },

            sequence: [
              "block.upi",
              "block.card",
            ],

            preferences: {
              show_default_blocks: false,
            },
          },
        },
      };

      // =====================================================
      // GET RAZORPAY CONSTRUCTOR
      // =====================================================
      //
      // IMPORTANT:
      // We are NOT declaring window.Razorpay globally.
      // This prevents the duplicate declaration conflict
      // with PaymentPage.tsx.
      //

      const razorpayWindow =
        window as Window & {
          Razorpay?: RazorpayConstructor;
        };

      const RazorpayConstructor =
        razorpayWindow.Razorpay;

      if (!RazorpayConstructor) {
        setError(
          "Razorpay is not loaded. Please refresh and try again."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // OPEN RAZORPAY
      // =====================================================

      const razorpay =
        new RazorpayConstructor(
          options
        );

      razorpay.open();
    } catch (submitError) {
      console.error(
        "Bid submission error:",
        submitError
      );

      setError(
        "Unable to start the bid payment."
      );

      setLoading(false);
    }
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* AUCTION TOTAL */}

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
          Auction total
        </p>

        <p className="mt-1 text-2xl font-black text-slate-950">
          ₹
          {Number(
            currentBid
          ).toLocaleString("en-IN")}
        </p>
      </div>

      {/* BID INPUT */}

      <div>
        <label
          htmlFor={`bid-amount-${listingId}`}
          className="text-sm font-bold text-slate-800"
        >
          Your bid amount
        </label>

        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
            ₹
          </span>

          <input
            id={`bid-amount-${listingId}`}
            type="number"
            min={MINIMUM_BID}
            step="1"
            value={bidAmount}
            onChange={(event) =>
              setBidAmount(
                event.target.value
              )
            }
            placeholder="Minimum ₹99"
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e4572e] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          Minimum bid is ₹99. You can bid
          any amount of ₹99 or more.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
        >
          {message}
        </div>
      )}

      {/* BUTTON */}

      <button
        type="submit"
        disabled={
          loading ||
          !bidAmount
        }
        className="w-full rounded-xl bg-[#e4572e] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#c94724] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Processing..."
          : "Pay & Place Bid"}
      </button>

      {/* PAYMENT NOTE */}

      <p className="text-center text-[11px] leading-5 text-slate-400">
        Your bid becomes active only after
        successful payment verification.
      </p>
    </form>
  );
}