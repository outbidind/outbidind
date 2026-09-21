"use client";

import { useState } from "react";

type PaymentPageProps = {
  listingId: string;
  businessName: string;
  bidAmount: number;
  onBack: () => void;
};

export default function PaymentPage({
  listingId,
  businessName,
  bidAmount,
  onBack,
}: PaymentPageProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [paymentMessage, setPaymentMessage] = useState("");

  const [paymentError, setPaymentError] = useState("");

  /*
   * =====================================================
   * HANDLE PAYMENT
   * =====================================================
   *
   * Dodo owns the hosted checkout.
   *
   * Payment success is NOT trusted from the browser.
   * Dodo's signed webhook is the source of truth.
   */

  const handlePayment = async () => {
    setIsLoading(true);

    setPaymentMessage("");

    setPaymentError("");

    try {
      /*
       * 1. CREATE PAYMENT SESSION
       */

      const response = await fetch(
        "/api/payments/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            listingId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPaymentError(
          data.error ||
            "Unable to create the payment session."
        );

        setIsLoading(false);

        return;
      }

      /*
       * 2. OPEN DODO HOSTED CHECKOUT
       */

      if (
        !data.checkoutUrl ||
        typeof data.checkoutUrl !== "string"
      ) {
        setPaymentError(
          "Dodo checkout could not be opened. Please try again."
        );

        setIsLoading(false);

        return;
      }

      setPaymentMessage(
        "Opening secure Dodo payment..."
      );

      /*
       * Dodo handles the payment on its hosted
       * checkout page.
       *
       * The browser does NOT verify payment.
       * The Dodo webhook is responsible for
       * confirming successful payment server-side.
       */

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error(
        "Dodo checkout error:",
        error
      );

      setPaymentError(
        "Unable to open the payment gateway. Please try again."
      );

      setPaymentMessage("");

      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <p className="text-sm font-semibold text-orange-600">
          Security Check Passed
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Complete Your Payment
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Your business passed
          the required security
          checks. Complete the
          payment to continue.
        </p>
      </div>

      {/* Business */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Business
        </p>

        <p className="mt-1 text-lg font-bold text-slate-900">
          {businessName}
        </p>
      </div>

      {/* Amount */}

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
        <p className="text-sm font-semibold text-slate-600">
          Amount to Pay
        </p>

        <p className="mt-2 text-3xl font-extrabold text-slate-900">
          ₹
          {bidAmount.toLocaleString(
            "en-IN"
          )}
        </p>
      </div>

      {/* Payment Methods */}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-900">
          Payment Methods
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-lg">
                UPI
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  UPI + QR
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Google Pay,
                  PhonePe, BHIM
                  and other
                  supported UPI
                  apps
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">
                💳
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Cards
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Credit and debit
                  cards through
                  Dodo Payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-semibold">
          Secure Dodo Payment
        </p>

        <p className="mt-1 text-xs leading-5">
          Your payment session
          is created securely
          on our server.
          Payment confirmation
          happens through
          secure server-side
          webhook verification
          before your listing
          becomes live.
        </p>
      </div>

      {/* Message */}

      {paymentMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {paymentMessage}
        </div>
      )}

      {/* Error */}

      {paymentError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {paymentError}
        </div>
      )}

      {/* Buttons */}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handlePayment}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-70"
        >
          {isLoading
            ? "Opening Payment..."
            : "Pay Now"}
        </button>
      </div>
    </div>
  );
}