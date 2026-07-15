"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const CONSTRUCTION_GATE_KEY = "uniquekontent-construction-gate-open";
const ACCESS_PASSPHRASE = "ukplatform1";
const ASSET_VERSION = "2026-07-15";

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
    <div className="fixed inset-0 z-[190] min-h-screen w-screen overflow-hidden bg-black">
      <Image
        src={`/assets/construction-gate-bg.png?v=${ASSET_VERSION}`}
        alt="Construction gate background"
        fill
        priority
        className="object-cover object-top sm:object-center"
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,3,14,0.08),rgba(6,3,14,0.7)_68%,rgba(6,3,14,0.92)_100%)]" />

      <div className="relative z-10 flex min-h-screen w-full items-end justify-center px-4 py-5 sm:px-6 sm:py-6">
        <div className="uk-panel w-full max-w-md rounded-[24px] p-4 backdrop-blur-[2px]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-left">
              <span className="uk-eyebrow mb-2 block text-sm font-medium uppercase tracking-[0.14em]">
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
                className="uk-input min-h-12 w-full rounded-2xl px-4 text-white outline-none transition"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              className="uk-button-primary min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] transition"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
