"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GlobalSearchBar } from "@/components/global-search-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { getNavItemsForRole } from "@/lib/mock-data";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { role, user } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const navItems = getNavItemsForRole(role, !!user);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const hasMovedEnough = Math.abs(currentScrollY - lastScrollY) > 8;

      if (currentScrollY < 24) {
        setIsHeaderCollapsed(false);
        lastScrollY = currentScrollY;
        return;
      }

      if (!hasMovedEnough) {
        return;
      }

      setIsHeaderCollapsed(isScrollingDown);
      lastScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsHeaderCollapsed(false);
      setIsMenuOpen(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,107,53,0.18),_transparent_30%),linear-gradient(180deg,_#0f1115_0%,_#08090c_100%)] text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <header
          className={`sticky top-4 z-40 mb-6 rounded-[28px] border border-white/10 bg-black/30 px-4 py-4 backdrop-blur transition-[padding,transform,background-color] duration-300 sm:px-6 ${
            isHeaderCollapsed ? "translate-y-0 py-3" : ""
          }`}
        >
          <div className="relative flex items-start justify-between gap-3">
            <Link href="/" className="shrink-0">
              <Image
                src="/clown-army-logo.jpg"
                alt="Clown Army logo"
                width={96}
                height={96}
                className="h-20 w-20 rounded-3xl border border-white/10 object-cover shadow-lg shadow-black/40 sm:h-24 sm:w-24"
                priority
              />
            </Link>

            <div className="relative flex items-center gap-3">
              <Link
                href="/account"
                aria-label="Open account page"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-amber-300/40 hover:bg-amber-300/10 sm:h-12 sm:w-12"
              >
                <span className="sr-only">Open account page</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5 19.25c1.55-3.1 4.25-4.65 7-4.65s5.45 1.55 7 4.65" />
                </svg>
              </Link>

              <button
                type="button"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-amber-300/40 hover:bg-amber-300/10 sm:h-12 sm:w-12"
              >
                <span className="sr-only">
                  {isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                </span>
                <span className="flex flex-col gap-1.5">
                  <span
                    className={`block h-0.5 w-5 rounded-full bg-current transition sm:w-6 ${
                      isMenuOpen ? "translate-y-2 rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-5 rounded-full bg-current transition sm:w-6 ${
                      isMenuOpen ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-5 rounded-full bg-current transition sm:w-6 ${
                      isMenuOpen ? "-translate-y-2 -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>

              {isMenuOpen ? (
                <nav className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-72 rounded-[28px] border border-white/10 bg-[#12141a]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
                  <div className="grid gap-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </nav>
              ) : null}
            </div>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isHeaderCollapsed
                ? "max-h-0 translate-y-[-8px] opacity-0"
                : "mt-4 max-h-60 translate-y-0 opacity-100"
            }`}
            aria-hidden={isHeaderCollapsed}
          >
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
              Unsigned Review Live
            </p>
            <Link
              href="/"
              className="font-display text-3xl uppercase tracking-[0.08em] text-white"
            >
              Clown Army Studio
            </Link>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isHeaderCollapsed
                ? "max-h-0 translate-y-[-8px] opacity-0"
                : "max-h-80 translate-y-0 opacity-100"
            }`}
            aria-hidden={isHeaderCollapsed}
          >
            <GlobalSearchBar key={pathname} />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
