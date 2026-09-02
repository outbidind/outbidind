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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  if (loading) {
    return (
      <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-slate-300">
          Checking your account...
        </p>
      </div>
    );
  }

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

  return (
    <BidForm
      listingId={listingId}
      currentBid={currentBid}
    />
  );
}

