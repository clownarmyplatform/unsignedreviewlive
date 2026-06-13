type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  badge?: string;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: PageIntroProps) {
  return (
    <section className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 sm:p-7">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300/85">
          {eyebrow}
        </p>
        {badge ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl uppercase leading-none tracking-[0.06em] text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300 sm:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
