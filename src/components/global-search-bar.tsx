"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatGlobalSearchDate,
  getGlobalSearchTypeLabel,
  GLOBAL_SEARCH_DEBOUNCE_MS,
  groupGlobalSearchResults,
  MIN_GLOBAL_SEARCH_QUERY_LENGTH,
  type GlobalSearchResult,
} from "@/lib/global-search";

export function GlobalSearchBar() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestSequenceRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_GLOBAL_SEARCH_QUERY_LENGTH) {
      return;
    }

    const currentRequest = requestSequenceRef.current + 1;
    requestSequenceRef.current = currentRequest;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          setIsLoading(true);
          setErrorMessage(null);
          setHasSearched(true);

          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase.rpc("search_global_content", {
            p_query: trimmedQuery,
          });

          if (requestSequenceRef.current !== currentRequest) {
            return;
          }

          if (error) {
            setErrorMessage(error.message);
            setResults([]);
            return;
          }

          setResults(data ?? []);
        } catch (error) {
          if (requestSequenceRef.current !== currentRequest) {
            return;
          }

          setErrorMessage(
            error instanceof Error ? error.message : "Could not run global search.",
          );
          setResults([]);
        } finally {
          if (requestSequenceRef.current === currentRequest) {
            setIsLoading(false);
          }
        }
      })();
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const groupedResults = groupGlobalSearchResults(results);
  const shouldShowPanel = isPanelOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative mt-4">
      <label
        htmlFor="global-search"
        className="mb-2 block text-xs uppercase tracking-[0.28em] text-zinc-500"
      >
        Global Search
      </label>
      <div className="relative">
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;

            setQuery(nextQuery);
            setIsPanelOpen(true);

            if (nextQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH) {
              setResults([]);
              setErrorMessage(null);
              setHasSearched(false);
              setIsLoading(false);
            }
          }}
          onFocus={() => setIsPanelOpen(true)}
          placeholder="Search shows, noticeboard posts, or tracks"
          className="min-h-12 w-full rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-12 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-500/40 focus:bg-white/[0.06]"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      {shouldShowPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-[26px] border border-white/10 bg-[#12141a]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
          {query.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
              Type at least {MIN_GLOBAL_SEARCH_QUERY_LENGTH} characters to search.
            </div>
          ) : isLoading ? (
            <div className="rounded-[20px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 text-sm leading-6 text-zinc-300">
              Searching Supabase...
            </div>
          ) : errorMessage ? (
            <div className="rounded-[20px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
              {errorMessage}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
              No results found.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedResults
                .filter((group) => group.results.length > 0)
                .map((group) => (
                  <section key={group.key} className="space-y-2">
                    <p className="px-1 text-xs uppercase tracking-[0.28em] text-zinc-500">
                      {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.results.map((result) => {
                        const formattedDate = formatGlobalSearchDate(result.result_date);

                        return (
                          <Link
                            key={result.result_id}
                            href={result.href}
                            onClick={() => {
                              setIsPanelOpen(false);
                              setQuery("");
                            }}
                            className="block rounded-[20px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 transition hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                                {getGlobalSearchTypeLabel(result.result_type)}
                              </span>
                              {formattedDate ? (
                                <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  {formattedDate}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-base font-semibold text-white">
                              {result.title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-zinc-300">
                              {result.snippet}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
