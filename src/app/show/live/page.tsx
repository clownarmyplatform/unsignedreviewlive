import Link from "next/link";

type LiveShowPageProps = {
  searchParams: Promise<{
    src?: string;
    title?: string;
  }>;
};

export default async function LiveShowPage({
  searchParams,
}: LiveShowPageProps) {
  const params = await searchParams;
  const src = params.src;
  const title = params.title ?? "Live Show";

  if (!src) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] p-5">
          <p className="text-sm text-zinc-300">No live show link was provided.</p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/85">
              Live Show
            </p>
            <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-[0.06em] text-white sm:text-5xl">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
            >
              Open External
            </a>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
            >
              Back Home
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
        <iframe
          title={title}
          src={src}
          className="h-[75vh] w-full bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>
    </div>
  );
}
