const toneClasses = {
  accent: "bg-amber-300/15 text-amber-200 border-amber-300/20",
  warning: "bg-rose-400/15 text-rose-200 border-rose-400/20",
  neutral: "bg-white/8 text-zinc-200 border-white/10",
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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
