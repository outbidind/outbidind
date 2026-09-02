"use client";

import { useEffect, useId, useRef } from "react";

type ModalProps = { isOpen: boolean; title: string; onClose: () => void; children: React.ReactNode };

export default function Modal({ isOpen, title, onClose, children }: ModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = previousOverflow; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 sm:px-8"><h2 id={titleId} className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2><button ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Close ${title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-orange-100">×</button></div><div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-6 py-6 sm:px-8">{children}</div></div></div>;
}