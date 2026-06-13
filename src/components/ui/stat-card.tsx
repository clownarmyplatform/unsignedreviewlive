import Link from "next/link";

export function StatCard({
  label,
  value,
  tone = "neutral",
  href,
  featured = false,
}: {
  label: string;
  value: string;
  tone?: "accent" | "warning" | "neutral" | "success";
  href?: string;
  featured?: boolean;
}) {
  const toneClasses = featured
    ? "border-white/20 bg-white/[0.09]"
    : tone === "accent"
      ? "border-amber-300/20 bg-amber-300/[0.06]"
      : tone === "success"
        ? "border-emerald-300/15 bg-emerald-300/[0.04]"
        : tone === "warning"
          ? "border-rose-200/12 bg-white/[0.05]"
          : "border-white/10 bg-white/[0.04]";

  const content = (
    <div
      className={`flex min-h-[10.5rem] flex-col justify-between rounded-[24px] border p-4 ${toneClasses}`}
    >
      <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p className="mt-4 text-3xl font-bold leading-tight text-white">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:scale-[1.01]">
        {content}
      </Link>
    );
  }

  return content;
}
