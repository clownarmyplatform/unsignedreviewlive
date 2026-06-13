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
    <section className="rounded-[28px] border border-white/10 bg-black/30 p-5 shadow-lg shadow-black/20">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <div className="mb-0">
            <h2 className="font-display text-2xl uppercase tracking-[0.06em] text-white">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            ) : null}
          </div>
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
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
          <h2 className="font-display text-2xl uppercase tracking-[0.06em] text-white">
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
