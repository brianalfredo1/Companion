"use client";

import type { ReactNode } from "react";

/**
 * Mobile: full-bleed app. Desktop (md+): the app floats as a phone-like
 * rounded card on a soft gradient, with its own internal scroll.
 */
export default function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 md:flex md:min-h-screen md:flex-col md:items-center md:justify-center md:bg-gradient-to-br md:from-rose-50 md:via-neutral-50 md:to-amber-50 md:py-8">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white md:h-[calc(100vh-7.5rem)] md:min-h-0 md:overflow-y-auto md:rounded-[2.25rem] md:border md:border-neutral-200 md:shadow-2xl md:shadow-rose-100/80">
        {children}
      </div>
      <p className="mt-5 hidden text-xs tracking-widest text-neutral-400 md:block">
        US&ensp;🤍&ensp;BRIAN & NATASYA
      </p>
    </div>
  );
}
