"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const CONSTRUCTION_GATE_KEY = "clown-army-construction-gate-open";
const ACCESS_PASSPHRASE = "letmein";

export function AppConstructionGate() {
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gateState, setGateState] = useState<"unknown" | "locked" | "unlocked">(
    "unknown",
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasAccess =
        window.sessionStorage.getItem(CONSTRUCTION_GATE_KEY) === "open";
      setGateState(hasAccess ? "unlocked" : "locked");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inputValue.trim().toLowerCase() !== ACCESS_PASSPHRASE) {
      setErrorMessage("Passphrase not recognised.");
      return;
    }

    window.sessionStorage.setItem(CONSTRUCTION_GATE_KEY, "open");
    setErrorMessage(null);
    setGateState("unlocked");
  }

  if (gateState === "unknown" || gateState === "unlocked") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[190] flex min-h-screen w-screen items-center justify-center bg-black px-5 py-8">
      <div className="flex min-h-full w-full max-w-2xl flex-col items-center justify-center text-center">
        <h1 className="font-display text-4xl uppercase tracking-[0.08em] text-white sm:text-5xl">
          Under Construction
        </h1>

        <div className="mt-6 flex justify-center">
          <Image
            src="/clown-army-logo.jpg"
            alt="Clown Army Studio logo"
            width={160}
            height={160}
            className="h-28 w-28 rounded-[24px] border border-white/10 object-cover shadow-lg shadow-black/40 sm:h-36 sm:w-36"
            priority
          />
        </div>

        <form className="mt-8 w-full max-w-md space-y-4" onSubmit={handleSubmit}>
          <label className="block text-left">
            <span className="mb-2 block text-sm font-medium uppercase tracking-[0.14em] text-zinc-300">
              Passphrase
            </span>
            <input
              type="password"
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              autoComplete="off"
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-white outline-none transition focus:border-amber-300/50"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition hover:bg-amber-200"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
