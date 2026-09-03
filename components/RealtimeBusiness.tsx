"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Bid = {
  id: string;
  amount: number;
  created_at: string;
};

type RealtimeBusinessContextValue = {
  currentBid: number;
  bids: Bid[];
};

const RealtimeBusinessContext =
  createContext<RealtimeBusinessContextValue | null>(null);

type RealtimeBusinessProps = {
  listingId: string;
  initialCurrentBid: number;
  initialBids: Bid[];
  children: React.ReactNode;
};

export default function RealtimeBusiness({
  listingId,
  initialCurrentBid,
  initialBids,
  children,
}: RealtimeBusinessProps) {
  const router = useRouter();

  const [currentBid, setCurrentBid] =
    useState(initialCurrentBid);

  const [bids, setBids] =
    useState<Bid[]>(initialBids);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`business-${listingId}`)

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "business_listings",
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          const updated = payload.new as {
            current_bid?: number | string;
            listing_status?: string;
          };

          const newCurrentBid = Number(
            updated.current_bid ?? 0
          );

          setCurrentBid(newCurrentBid);

          /*
           * Payment verification changes:
           *
           * approved → live
           *
           * Refresh the Next.js Server Component so the
           * pending payment UI changes to the LIVE auction
           * automatically without a browser reload.
           */
          router.refresh();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const newBid = payload.new as {
            id: string;
            listing_id: string;
            amount: number | string;
            created_at: string;
          };

          const bid: Bid = {
            id: newBid.id,
            amount: Number(newBid.amount),
            created_at: newBid.created_at,
          };

          setBids((existing) => {
            if (
              existing.some(
                (item) => item.id === bid.id
              )
            ) {
              return existing;
            }

            return [bid, ...existing].slice(0, 20);
          });

          setCurrentBid(bid.amount);
        }
      )

      .subscribe((status) => {
        console.log(
          `Realtime business ${listingId}:`,
          status
        );
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listingId, router]);

  return (
    <RealtimeBusinessContext.Provider
      value={{
        currentBid,
        bids,
      }}
    >
      {children}
    </RealtimeBusinessContext.Provider>
  );
}

export function useRealtimeBusiness() {
  const context = useContext(
    RealtimeBusinessContext
  );

  if (!context) {
    throw new Error(
      "useRealtimeBusiness must be used inside RealtimeBusiness."
    );
  }

  return context;
}