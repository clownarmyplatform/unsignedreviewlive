import { StatusPill } from "@/components/ui/status-pill";

type TrackRow = {
  id: string;
  artist: string;
  title: string;
  meta: string;
  status: string;
  tone?: "accent" | "warning" | "neutral" | "success";
};

export function TrackList({
  items,
}: {
  items: TrackRow[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">{item.title}</p>
              <p className="text-sm text-zinc-400">
                {item.artist} • {item.meta}
              </p>
            </div>
            <StatusPill tone={item.tone ?? "neutral"}>{item.status}</StatusPill>
          </div>
        </div>
      ))}
    </div>
  );
}
