import Link from "next/link";

export function LegalLinks() {
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <Link
        href="/terms"
        className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-200"
      >
        Terms of Service
      </Link>
      <Link
        href="/privacy"
        className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-200"
      >
        Privacy Policy
      </Link>
    </div>
  );
}
