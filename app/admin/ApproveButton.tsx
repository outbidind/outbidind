"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveListing } from "./actions";

type Props = {
  listingId: string;
};

export default function ApproveButton({ listingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    const confirmed = window.confirm(
      "Are you sure you want to approve this business listing?",
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    const result = await approveListing(listingId);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Approving..." : "Approve"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}