"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuction } from "./actions";

type Props = {
  listingId: string;
};

export default function StartAuctionButton({ listingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    const confirmed = window.confirm(
      "Are you sure you want to start the auction for this business?"
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    const result = await startAuction(listingId);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[#e4572e] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#c94724] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Auction"}
      </button>

      {error && (
        <p className="mt-2 text-xs leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
