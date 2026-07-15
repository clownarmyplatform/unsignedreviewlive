type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
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
    <section className="uk-panel mb-5 rounded-[24px] p-4 sm:mb-6 sm:rounded-[32px] sm:p-7">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="uk-eyebrow text-xs uppercase tracking-[0.35em]">{eyebrow}</p>
        {badge ? (
          <span className="uk-badge rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl uppercase leading-none tracking-[0.04em] sm:text-4xl sm:tracking-[0.06em] lg:text-5xl">
            <span className="uk-text-gradient">{title}</span>
          </h1>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-zinc-300 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
