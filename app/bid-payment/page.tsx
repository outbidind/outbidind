"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BidPaymentPage() {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("Verifying your bid payment...");

  useEffect(() => {
    let cancelled = false;

    async function verifyBidPayment() {
      try {
        const params = new URLSearchParams(window.location.search);
        const paymentOrderId = params.get("paymentOrderId");

        if (!paymentOrderId) {
          if (!cancelled) {
            setStatus("error");
            setMessage("Payment order information is missing.");
          }
          return;
        }

        const response = await fetch("/api/bids/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentOrderId,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          if (!cancelled) {
            setStatus("error");
            setMessage(
              data?.error ??
                "Payment was received, but your bid could not be confirmed."
            );
          }
          return;
        }

        if (!cancelled) {
          setStatus("success");
          setMessage(
            `Your bid of ₹${Number(data.bidAmount ?? 0).toLocaleString(
              "en-IN"
            )} has been placed successfully.`
          );
        }
      } catch (error) {
        console.error("Bid payment verification error:", error);

        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Unable to verify your bid payment. Please try again."
          );
        }
      }
    }

    void verifyBidPayment();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {status === "processing" && (
          <>
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

            <h1 className="text-2xl font-semibold text-gray-900">
              Verifying Payment
            </h1>

            <p className="mt-3 text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">
              Bid Placed Successfully
            </h1>

            <p className="mt-3 text-gray-600">{message}</p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Back to OutbidInd
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">
              !
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">
              Payment Verification Issue
            </h1>

            <p className="mt-3 text-gray-600">{message}</p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Back to OutbidInd
            </Link>
          </>
        )}
      </div>
    </main>
  );
}