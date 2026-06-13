"use client";

import { useState } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export function SectionCard({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[24px] border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/20 sm:rounded-[28px] sm:p-5">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <div className="mb-0">
            <h2 className="font-display text-xl uppercase tracking-[0.04em] text-white sm:text-2xl sm:tracking-[0.06em]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            ) : null}
          </div>
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 sm:h-10 sm:w-10 sm:rounded-2xl">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      ) : (
        <div className="mb-4">
          <h2 className="font-display text-xl uppercase tracking-[0.04em] text-white sm:text-2xl sm:tracking-[0.06em]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          ) : null}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div className={collapsible ? "mt-4" : undefined}>{children}</div>
      )}
    </section>
  );
}
