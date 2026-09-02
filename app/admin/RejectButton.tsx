"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rejectListing } from "./actions";

type Props = {
  listingId: string;
};

export default function RejectButton({ listingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function openRejectForm() {
    setError("");
    setReason("");
    setOpen(true);
  }

  function closeRejectForm() {
    if (!loading) {
      setOpen(false);
      setError("");
    }
  }

  async function handleReject() {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError("Please enter a rejection reason.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await rejectListing(listingId, trimmedReason);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openRejectForm}
        disabled={loading}
        className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reject
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-listing-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="reject-listing-title"
              className="text-xl font-bold text-zinc-900"
            >
              Reject Business Listing
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              Please provide a reason for rejecting this listing.
            </p>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter rejection reason..."
              rows={5}
              disabled={loading}
              className="mt-5 w-full resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeRejectForm}
                disabled={loading}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}