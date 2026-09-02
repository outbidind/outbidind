"use client";

import { useState } from "react";

type PanelMobileMenuProps = {
  admin?: boolean;
};

export default function PanelMobileMenu({
  admin = false,
}: PanelMobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
      >
        {open ? (
          <span className="text-xl leading-none">×</span>
        ) : (
          <span className="text-xl leading-none">☰</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white shadow-lg">
          <div className="mx-auto max-w-7xl px-5 py-4">
            <div className="flex flex-col gap-2">
              {admin ? (
                <>
                  <a
                    href="/"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View Marketplace
                  </a>

                  <a
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-[#e4572e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c94724]"
                  >
                    Admin Dashboard
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/live-bids"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Live Bids
                  </a>

                  <a
                    href="/"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Marketplace
                  </a>

                  <a
                    href="/user-panel"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-[#e4572e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c94724]"
                  >
                    My Panel
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}