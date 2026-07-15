"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REMEMBER_KEY = "uniquekontent-submit-rules-remembered";
const SESSION_KEY = "uniquekontent-submit-rules-session";

const rules = [
  "The track must be made by you.",
  "The track must be unsigned.",
  "One track per entry, per show.",
  "Any production workflow is welcome, including hardware and software.",
  "AI generated music is not permitted.",
  "Submitting a track does not guarantee it will be played.",
  "Tracks must be submitted before show start on the date shown.",
  "No pre-listening to tracks in the thread. Save it for the night!",
  "Please make sure submitted links are working and accessible.",
  "By submitting, you confirm you have the right to share the track for review.",
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
            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">
              To submit please accept
            </p>
            <h2 className="mt-3 font-display text-3xl uppercase tracking-[0.06em] text-white">
              Submission Rules
            </h2>

            <div className="mt-5 space-y-3 rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
              {rules.map((rule) => (
                <p key={rule} className="text-sm leading-6 text-zinc-200">
                  {rule}
                </p>
              ))}
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(event) => setRememberChoice(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/10 bg-transparent accent-fuchsia-500"
              />
              <span className="text-sm leading-6 text-zinc-300">
                Remember my choice on this device.
              </span>
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAccept}
                className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDeny}
                className="min-h-12 rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.08]"
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
