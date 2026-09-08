import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f5] px-5 py-12 text-slate-900">
      <div className="w-full max-w-2xl text-center">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="OutbidInd"
            className="h-12 w-12 rounded-xl"
          />

          <span className="text-2xl font-bold tracking-tight text-slate-950">
            Outbid
            <span className="text-[#e4572e]">
              Ind
            </span>
          </span>
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
            <span
              className="text-4xl"
              aria-hidden="true"
            >
              🛠️
            </span>
          </div>

          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-[#e4572e]">
            Maintenance Mode
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            We&apos;ll Be Back Soon
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
            OutbidInd is currently undergoing
            some improvements. We&apos;re working
            to make your experience better and
            will be back shortly.
          </p>

          <div className="mt-8 rounded-2xl bg-slate-50 px-5 py-4">
            <p className="text-sm font-semibold text-slate-700">
              Thank you for your patience.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Please check back again soon.
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} OutbidInd.
          All rights reserved.
        </p>
      </div>
    </main>
  );
}