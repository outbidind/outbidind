"use client";

import { useEffect, useState } from "react";
import BidForm from "@/components/BidForm";
import { createClient } from "@/lib/supabase/client";

type BidSectionProps = {
  listingId: string;
  currentBid: number;
  listingStatus: string;
};

export default function BidSection({
  listingId,
  currentBid,
  listingStatus,
}: BidSectionProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveCurrentBid, setLiveCurrentBid] = useState(currentBid);

  /*
   * =====================================================
   * KEEP CURRENT BID IN SYNC WITH SERVER PROPS
   * =====================================================
   */

  useEffect(() => {
    setLiveCurrentBid(currentBid);
  }, [currentBid]);

  /*
   * =====================================================
   * REAL-TIME CURRENT BID
   * =====================================================
   */

  useEffect(() => {
    if (listingStatus !== "live") {
      return;
    }

    const supabase = createClient();

    console.log(
      "Realtime: creating channel for listing:",
      listingId
    );

    const channel = supabase
      .channel(`business-listing-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "business_listings",
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          console.log(
            "Realtime update received:",
            payload
          );

          const newCurrentBid = Number(
            (payload.new as { current_bid?: number | string })
              ?.current_bid ?? 0
          );

          console.log(
            "Realtime new current bid:",
            newCurrentBid
          );

          if (newCurrentBid > 0) {
            setLiveCurrentBid(newCurrentBid);
          }
        }
      )
      .subscribe((status) => {
        console.log(
          "Realtime subscription status:",
          status
        );
      });

    return () => {
      console.log(
        "Realtime: removing channel for listing:",
        listingId
      );

      supabase.removeChannel(channel);
    };
  }, [listingId, listingStatus]);

  /*
   * =====================================================
   * AUTHENTICATION
   * =====================================================
   */

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * =====================================================
   * AUCTION STATUS
   * =====================================================
   */

  if (listingStatus !== "live") {
    return (
      <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-bold text-amber-900">
          Auction not live yet
        </p>

        <p className="mt-2 text-xs leading-5 text-amber-800">
          This business has been approved and is waiting for the admin to
          start the auction.
        </p>
      </div>
    );
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-slate-300">
          Checking your account...
        </p>
      </div>
    );
  }

  /*
   * =====================================================
   * LOGIN REQUIRED
   * =====================================================
   */

  if (!user) {
    return (
      <div className="mt-7">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-white">
            Login required to bid
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Please log in to your OutbidInd account before placing a bid.
          </p>

          <a
            href="/?login=true"
            className="mt-5 block w-full rounded-lg bg-[#e4572e] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#c94724]"
          >
            Login to Bid
          </a>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * BID FORM
   * =====================================================
   */

  return (
    <BidForm
      listingId={listingId}
      currentBid={liveCurrentBid}
    />
  );
}