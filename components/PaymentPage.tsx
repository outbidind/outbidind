"use client";

import { useState } from "react";

type PaymentPageProps = {
  listingId: string;
  businessName: string;
  bidAmount: number;
  onBack: () => void;
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;

  handler: (response: RazorpayResponse) => void;

  theme?: {
    color: string;
  };

  modal?: {
    ondismiss?: () => void;
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

        cards?: {
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

type RazorpayInstance = {
  open: () => void;

  on?: (
    event: string,
    callback: (response: unknown) => void
  ) => void;
};

type RazorpayConstructor = new (
  options: RazorpayOptions
) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export default function PaymentPage({
  listingId,
  businessName,
  bidAmount,
  onBack,
}: PaymentPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existingScript) {
        existingScript.addEventListener("load", () =>
          resolve(!!window.Razorpay)
        );

        existingScript.addEventListener("error", () =>
          resolve(false)
        );

        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => {
        resolve(!!window.Razorpay);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setPaymentMessage("");
    setPaymentError("");

    try {
      // 1. Load Razorpay Checkout
      const razorpayLoaded =
        await loadRazorpayScript();

      if (!razorpayLoaded || !window.Razorpay) {
        setPaymentError(
          "Razorpay Checkout could not be loaded. Please check your internet connection and try again."
        );

        setIsLoading(false);
        return;
      }

      // 2. Ask our server to create the order
      // The server verifies the user/listing and gets
      // the real amount from the database.
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
            "Unable to create the payment order."
        );

        setIsLoading(false);
        return;
      }

      // 3. Open Razorpay Checkout
      const options: RazorpayOptions = {
        key: data.keyId,

        amount: data.amount,

        currency: data.currency,

        name: "OutbidInd",

        description:
          `Business listing payment - ${businessName}`,

        order_id: data.orderId,

        // 4. Verify payment on our server
        handler: async (paymentResponse) => {
          try {
            setPaymentMessage(
              "Verifying your payment..."
            );

            setPaymentError("");

            const verifyResponse = await fetch(
              "/api/payments/verify",
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  paymentOrderId:
                    data.paymentOrderId,

                  razorpay_payment_id:
                    paymentResponse.razorpay_payment_id,

                  razorpay_order_id:
                    paymentResponse.razorpay_order_id,

                  razorpay_signature:
                    paymentResponse.razorpay_signature,
                }),
              }
            );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              setPaymentError(
                verifyData.error ||
                  "Payment verification failed. Please contact support."
              );

              setPaymentMessage("");
              setIsLoading(false);

              return;
            }

            setPaymentMessage(
              "Payment verified successfully."
            );

            setIsLoading(false);

            console.log(
              "Payment verified:",
              verifyData
            );
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            setPaymentError(
              "Payment was completed, but verification could not be completed. Please contact support."
            );

            setPaymentMessage("");
            setIsLoading(false);
          }
        },

        theme: {
          color: "#e4572e",
        },

        modal: {
          ondismiss: () => {
            setPaymentMessage(
              "Payment window closed. You can try again."
            );

            setIsLoading(false);
          },
        },

        /*
         * PAYMENT METHODS
         *
         * Only UPI and Cards are explicitly configured.
         *
         * show_default_blocks: false
         * means Razorpay should not add its
         * default payment-method blocks such as:
         *
         * - Netbanking
         * - Wallets
         * - EMI
         * - Other default methods
         *
         * UPI on desktop can appear as a QR code.
         */

        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",

                instruments: [
                  {
                    method: "upi",
                  },
                ],
              },

              cards: {
                name: "Pay via Cards",

                instruments: [
                  {
                    method: "card",
                  },
                ],
              },
            },

            sequence: [
              "block.upi",
              "block.cards",
            ],

            preferences: {
              show_default_blocks: false,
            },
          },
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      console.error(
        "Razorpay checkout error:",
        error
      );

      setPaymentError(
        "Unable to open the payment gateway. Please try again."
      );

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
          Your business passed the required security
          checks. Complete the payment to continue.
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
          ₹{bidAmount.toLocaleString("en-IN")}
        </p>
      </div>

      {/* Payment Methods */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-900">
          Payment Methods
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* UPI */}
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
                  Google Pay, PhonePe, BHIM and other
                  supported UPI apps
                </p>
              </div>
            </div>
          </div>

          {/* Cards */}
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
                  Credit and debit cards through Razorpay
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-semibold">
          Secure Razorpay Payment
        </p>

        <p className="mt-1 text-xs leading-5">
          Your payment order is created securely on our
          server. Payment verification will happen on the
          server before your listing becomes live.
        </p>
      </div>

      {/* Success message */}
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