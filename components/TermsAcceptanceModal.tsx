"use client";

import { useEffect, useState } from "react";
import TermsContent, { TERMS_VERSION } from "@/components/TermsContent";
import { createClient } from "@/lib/supabase/client";

export default function TermsAcceptanceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let signInTimeout: ReturnType<typeof setTimeout> | null = null;

    const checkTermsAcceptance = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) {
          if (mounted) {
            setIsOpen(false);
            setIsChecked(false);
            setError("");
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("terms_accepted_at, terms_version")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileError) {
          console.error("Failed to check Terms acceptance:", profileError);
          setError(
            "We could not verify your Terms acceptance. Please try again."
          );
          setIsOpen(true);
          return;
        }

        const hasAcceptedCurrentTerms =
          Boolean(data?.terms_accepted_at) &&
          data?.terms_version === TERMS_VERSION;

        if (hasAcceptedCurrentTerms) {
          setIsOpen(false);
          setIsChecked(false);
          setError("");
        } else {
          setIsOpen(true);
          setIsChecked(false);
          setError("");
        }
      } catch (checkError) {
        console.error("Terms acceptance check failed:", checkError);

        if (!mounted) return;

        setError(
          "We could not verify your Terms acceptance. Please try again."
        );
        setIsOpen(true);
      }
    };

    checkTermsAcceptance();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (signInTimeout) {
          clearTimeout(signInTimeout);
        }

        signInTimeout = setTimeout(() => {
          void checkTermsAcceptance();
        }, 1000);

        return;
      }

      if (event === "SIGNED_OUT") {
        if (signInTimeout) {
          clearTimeout(signInTimeout);
          signInTimeout = null;
        }

        if (mounted) {
          setIsOpen(false);
          setIsChecked(false);
          setError("");
        }
      }
    });

    return () => {
      mounted = false;

      if (signInTimeout) {
        clearTimeout(signInTimeout);
      }

      subscription.unsubscribe();
    };
  }, []);

  const handleAccept = async () => {
    if (!isChecked || isAccepting) {
      return;
    }

    setIsAccepting(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      const { error: acceptError } = await supabase.rpc("accept_terms", {
        p_terms_version: TERMS_VERSION,
      });

      if (acceptError) {
        console.error("Failed to save Terms acceptance:", acceptError);
        setError(
          "We could not save your acceptance. Please try again."
        );
        return;
      }

      setIsOpen(false);
      setIsChecked(false);
      setError("");
    } catch (acceptError) {
      console.error("Terms acceptance failed:", acceptError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-acceptance-title"
      >
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-7">
          <h2
            id="terms-acceptance-title"
            className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl"
          >
            Terms & Conditions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Please read the Terms & Conditions before continuing.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <TermsContent />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          {error ? (
            <div
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(event) => setIsChecked(event.target.checked)}
              disabled={isAccepting}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />

            <span>
              I Understand &amp; Agree to the OutbidInd Terms &amp;
              Conditions.
            </span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!isChecked || isAccepting}
            className="mt-4 w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAccepting ? "Saving..." : "Accept & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}