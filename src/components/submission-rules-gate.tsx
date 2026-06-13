"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REMEMBER_KEY = "acid-clowns-submit-rules-remembered";
const SESSION_KEY = "acid-clowns-submit-rules-session";

const rules = [
  "The track must be made by you.",
  "The track must be unsigned.",
  "One track per entry, per show.",
  "Use whatever you like to make your track; hardware, software, infinity, music is music.",
  "AI generated music is not permitted.",
  "Submitting a track does not guarantee it will be played.",
  "Call someone a kunt at all times.",
  "Rate in cats.",
  "My show, my rules. No bitching!",
  "The URL goes live every Tuesday at 7:30 PM, except when the URL is on tour; in that case, it will go live on a Saturday at 5 PM.",
  "Tracks must be submitted before show start on the date shown.",
  "No pre-listening to tracks in the thread. Save it for the night!",
];

type SubmissionRulesGateProps = {
  children: React.ReactNode;
};

export function SubmissionRulesGate({ children }: SubmissionRulesGateProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const rememberedChoice = window.localStorage.getItem(REMEMBER_KEY);
      const sessionChoice = window.sessionStorage.getItem(SESSION_KEY);

      if (rememberedChoice === "accepted" || sessionChoice === "accepted") {
        setHasAccepted(true);
        setRememberChoice(rememberedChoice === "accepted");
      }

      setIsChecking(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  function handleAccept() {
    if (rememberChoice) {
      window.localStorage.setItem(REMEMBER_KEY, "accepted");
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }

    window.sessionStorage.setItem(SESSION_KEY, "accepted");
    setHasAccepted(true);
  }

  function handleDeny() {
    window.localStorage.removeItem(REMEMBER_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    router.push("/");
  }

  return (
    <div className="relative">
      <div className={!isChecking && !hasAccepted ? "pointer-events-none select-none opacity-20 blur-[2px]" : ""}>
        {children}
      </div>

      {!isChecking && !hasAccepted ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#120f12] p-5 shadow-2xl shadow-black/60 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/15 sm:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200">
              To submit please accept
            </p>
            <h2 className="mt-3 font-display text-3xl uppercase tracking-[0.06em] text-white">
              The Acid Clown&apos;s URL Rules...
            </h2>

            <div className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              {rules.map((rule) => (
                <p key={rule} className="text-sm leading-6 text-zinc-200">
                  {rule}
                </p>
              ))}
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(event) => setRememberChoice(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/10 bg-transparent accent-amber-300"
              />
              <span className="text-sm leading-6 text-zinc-300">
                Remember my choice on this device.
              </span>
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAccept}
                className="min-h-12 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDeny}
                className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.08]"
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
