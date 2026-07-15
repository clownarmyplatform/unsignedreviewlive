"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppConstructionGate } from "@/components/app-construction-gate";
import { PwaBoot } from "@/components/pwa-boot";
import { GlobalSearchBar } from "@/components/global-search-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { getNavItemsForRole } from "@/lib/mock-data";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { profile, role, user } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const navItems = getNavItemsForRole(role, !!user);
  const {
    canInstall,
    hasIosInstructions,
    isShowingIosInstructions,
    promptInstall,
    setIsShowingIosInstructions,
  } = usePwaInstall();

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 24) {
        setIsHeaderCollapsed(false);
        return;
      }

      setIsHeaderCollapsed(true);
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
      setIsShowingIosInstructions(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname, setIsShowingIosInstructions]);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-zinc-50">
      <PwaBoot />
      <AppConstructionGate />
      <div className="uk-shell-bg pointer-events-none fixed inset-0" />
      <div className="uk-grid-overlay pointer-events-none fixed inset-0 opacity-35" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,45,166,0.18),transparent_60%)] blur-3xl" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-24 pt-3 sm:px-6 sm:pb-28 sm:pt-4 lg:px-8">
        <header
          className={`uk-panel sticky top-0 z-40 mb-5 rounded-[24px] px-3 py-3 backdrop-blur transition-[padding,transform,background-color,border-radius] duration-300 sm:mb-6 sm:rounded-[28px] sm:px-6 sm:py-4 ${
            isHeaderCollapsed ? "translate-y-0 py-3" : ""
          }`}
        >
          <div className="relative flex items-start justify-between gap-3">
            <Link href="/" className="shrink-0">
              <Image
                src="/assets/UK_logo_optimized.webp"
                alt="uniqueKontent logo"
                width={96}
                height={96}
                className="h-16 w-16 rounded-2xl border border-fuchsia-500/25 object-cover shadow-[0_18px_42px_rgba(142,66,255,0.28)] sm:h-24 sm:w-24 sm:rounded-3xl"
                priority
              />
            </Link>

            <div className="relative flex items-center gap-3">
              <Link
                href="/account"
                aria-label="Open account page"
                className="uk-icon-chip flex h-9 w-9 items-center justify-center rounded-xl transition sm:h-12 sm:w-12 sm:rounded-2xl"
              >
                <span className="sr-only">Open account page</span>
                {profile?.avatarUrl ? (
                  <UserAvatar
                    imageUrl={profile.avatarUrl}
                    name={profile.displayName ?? user?.email ?? "Account"}
                    className="h-7 w-7 border-none sm:h-10 sm:w-10"
                    textClassName="text-[10px] sm:text-xs"
                  />
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 sm:h-6 sm:w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="3.25" />
                    <path d="M5 19.25c1.55-3.1 4.25-4.65 7-4.65s5.45 1.55 7 4.65" />
                  </svg>
                )}
              </Link>

              <button
                type="button"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setIsMenuOpen((open) => !open)}
                className="uk-icon-chip flex h-9 w-9 items-center justify-center rounded-xl transition sm:h-12 sm:w-12 sm:rounded-2xl"
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
                <nav className="uk-panel absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(18rem,calc(100vw-1.5rem))] rounded-[24px] p-3 shadow-2xl shadow-black/50 backdrop-blur sm:w-72 sm:rounded-[28px]">
                  <div className="grid gap-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="uk-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition sm:tracking-[0.16em]"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {canInstall ? (
                      <button
                        type="button"
                        onClick={() => {
                          void promptInstall();
                        }}
                        className="uk-button-secondary rounded-2xl px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.12em] transition sm:tracking-[0.16em]"
                      >
                        {hasIosInstructions ? "Add to Home Screen" : "Install App"}
                      </button>
                    ) : null}
                  </div>
                  {canInstall && hasIosInstructions && isShowingIosInstructions ? (
                    <div className="uk-panel-soft mt-3 rounded-2xl p-4 text-sm leading-6 text-zinc-300">
                      To install: tap Share, then Add to Home Screen.
                    </div>
                  ) : null}
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
            <p className="uk-eyebrow text-xs uppercase tracking-[0.35em]">
              uniqueKontent
            </p>
            <Link
              href="/"
              className="font-display text-2xl uppercase leading-none tracking-[0.06em] text-white sm:text-3xl sm:tracking-[0.08em]"
            >
              <span className="uk-text-gradient">uniqueKontent</span>
            </Link>
          </div>

          <div
            className={`transition-all duration-300 ${
              isHeaderCollapsed
                ? "max-h-0 translate-y-[-8px] overflow-hidden opacity-0"
                : "max-h-80 overflow-visible translate-y-0 opacity-100"
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
