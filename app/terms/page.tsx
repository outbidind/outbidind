import Link from "next/link";
import TermsContent, {
  TERMS_VERSION,
} from "@/components/TermsContent";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <img
              src="/logo.png"
              alt="OutbidInd"
              className="h-10 w-10 rounded-xl"
            />

            <span className="text-xl font-bold tracking-tight text-slate-950">
              OutbidInd
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d94d28]">
              Legal
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Terms & Conditions
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Please review the terms governing your use of OutbidInd.
            </p>

            <p className="mt-2 text-xs font-medium text-slate-400">
              Version {TERMS_VERSION} · Last updated: September 2026
            </p>
          </div>

          <TermsContent />
        </div>
      </div>
    </main>
  );
}