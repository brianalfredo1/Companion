"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import AppFrame from "./AppFrame";

export default function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <AppFrame>
      <div className="px-5 pb-24 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
            aria-label="Back to dashboard"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
            {subtitle && (
              <p className="text-xs text-neutral-500">{subtitle}</p>
            )}
          </div>
        </header>
        {children}
      </div>
    </AppFrame>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs uppercase tracking-widest text-neutral-400">
      {children}
    </p>
  );
}

export function Loading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-2xl bg-neutral-100"
        />
      ))}
    </div>
  );
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 px-6 py-10 text-center">
      <span className="mb-2 text-3xl">{emoji}</span>
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  );
}
