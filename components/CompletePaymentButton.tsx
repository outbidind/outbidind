"use client";

import {
  useEffect,
  useState,
} from "react";

import PaymentPage from "@/components/PaymentPage";
import { createClient } from "@/lib/supabase/client";

type CompletePaymentButtonProps = {
  listingId: string;
  businessName: string;
  bidAmount: number;
  listingStatus: string;
};

export default function CompletePaymentButton({
  listingId,
  businessName,
  bidAmount,
  listingStatus,
}: CompletePaymentButtonProps) {
  const [open, setOpen] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  const [paymentRequired, setPaymentRequired] =
    useState(false);

  useEffect(() => {
    let active = true;

    const checkPaymentStatus =
      async () => {
        if (listingStatus !== "approved") {
          if (active) {
            setChecking(false);
          }

          return;
        }

        try {
          const supabase =
            createClient();

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) {
            if (active) {
              setPaymentRequired(false);
              setChecking(false);
            }

            return;
          }

          const {
            data: paymentOrder,
            error,
          } =
            await supabase
              .from("payment_orders")
              .select("id, status")
              .eq(
                "listing_id",
                listingId
              )
              .eq(
                "user_id",
                user.id
              )
              .in("status", [
                "pending",
                "created",
              ])
              .order("created_at", {
                ascending: false,
              })
              .limit(1)
              .maybeSingle();

          if (error) {
            console.error(
              "Failed to check payment status:",
              error
            );

            if (active) {
              setPaymentRequired(false);
              setChecking(false);
            }

            return;
          }

          if (active) {
            setPaymentRequired(
              Boolean(paymentOrder)
            );
            setChecking(false);
          }
        } catch (error) {
          console.error(
            "Payment status check failed:",
            error
          );

          if (active) {
            setPaymentRequired(false);
            setChecking(false);
          }
        }
      };

    void checkPaymentStatus();

    return () => {
      active = false;
    };
  }, [listingId, listingStatus]);

  if (
    checking ||
    !paymentRequired
  ) {
    return null;
  }

  if (open) {
    return (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <PaymentPage
          listingId={listingId}
          businessName={businessName}
          bidAmount={bidAmount}
          onBack={() =>
            setOpen(false)
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-700">
          Payment Required
        </p>

        <h3 className="mt-2 text-xl font-black text-slate-950">
          Complete payment to start your auction
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your business has passed the security check. Complete the
          listing payment to make your auction live.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Listing fee
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              ₹
              {Number(
                bidAmount
              ).toLocaleString(
                "en-IN"
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
            className="rounded-xl bg-[#e4572e] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c94724]"
          >
            Complete Payment &
            Start Auction
          </button>
        </div>
      </div>
    </div>
  );
}