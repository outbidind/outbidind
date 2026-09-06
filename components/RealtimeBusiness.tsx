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
  createContext<RealtimeBusinessContextValue | null>(
    null
  );

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
    const handleListingStatusChanged = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          listingId?: string;
          status?: string;
        }>;

      if (
        customEvent.detail?.listingId !==
        listingId
      ) {
        return;
      }

      if (
        customEvent.detail?.status !==
        "live"
      ) {
        return;
      }

      router.refresh();
    };

    window.addEventListener(
      "outbidind:listing-status-changed",
      handleListingStatusChanged
    );

    return () => {
      window.removeEventListener(
        "outbidind:listing-status-changed",
        handleListingStatusChanged
      );
    };
  }, [listingId, router]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `business-${listingId}`
      )

      // ===================================================
      // BUSINESS LISTING UPDATE
      // ===================================================

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "business_listings",
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          const updated =
            payload.new as {
              current_bid?:
                | number
                | string;

              listing_status?:
                | string;
            };

          const newCurrentBid =
            Number(
              updated.current_bid ??
                0
            );

          // IMPORTANT:
          // current_bid is the accumulated
          // auction total.

          setCurrentBid(
            newCurrentBid
          );

          /*
           * Refresh the server-rendered page.
           *
           * This keeps:
           * - payment UI
           * - listing status
           * - bid history
           * - auction data
           *
           * synchronized.
           *
           * This also handles status changes
           * such as approved -> live.
           */

          router.refresh();
        }
      )

      // ===================================================
      // NEW BID INSERT
      // ===================================================

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const newBid =
            payload.new as {
              id: string;
              listing_id: string;
              amount:
                | number
                | string;
              created_at: string;
            };

          const bid: Bid = {
            id: newBid.id,

            amount:
              Number(
                newBid.amount
              ),

            created_at:
              newBid.created_at,
          };

          setBids(
            (existing) => {
              if (
                existing.some(
                  (item) =>
                    item.id ===
                    bid.id
                )
              ) {
                return existing;
              }

              return [
                bid,
                ...existing,
              ].slice(0, 20);
            }
          );

          /*
           * DO NOT:
           *
           * setCurrentBid(bid.amount)
           *
           * because bid.amount is only the
           * latest contribution.
           *
           * The accumulated total comes from
           * business_listings.current_bid.
           */

          router.refresh();
        }
      )

      .subscribe((status) => {
        console.log(
          `Realtime business ${listingId}:`,
          status
        );

        /*
         * Once the realtime subscription is
         * successfully connected, refresh the
         * server-rendered page once.
         *
         * This handles cases where the listing
         * status changed before the realtime
         * connection was established.
         */
        if (status === "SUBSCRIBED") {
          router.refresh();
        }
      });

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    listingId,
    router,
  ]);

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
  const context =
    useContext(
      RealtimeBusinessContext
    );

  if (!context) {
    throw new Error(
      "useRealtimeBusiness must be used inside RealtimeBusiness."
    );
  }

  return context;
}
