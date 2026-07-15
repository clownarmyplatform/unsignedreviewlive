const toneClasses = {
  accent:
    "border-fuchsia-400/25 bg-[linear-gradient(90deg,rgba(255,45,166,0.18),rgba(142,66,255,0.18),rgba(29,183,255,0.18))] text-fuchsia-100",
  warning: "bg-rose-400/15 text-rose-200 border-rose-400/20",
  neutral: "border-violet-400/15 bg-[rgba(20,15,36,0.72)] text-zinc-200",
  success: "bg-emerald-400/15 text-emerald-200 border-emerald-400/20",
} as const;

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
