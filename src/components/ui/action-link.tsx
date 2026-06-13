import Link from "next/link";

export function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-amber-300 text-black hover:bg-amber-200"
      : "border border-white/10 bg-white/5 text-white hover:bg-white/10";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] transition sm:w-auto sm:px-5 sm:tracking-[0.12em] ${styles}`}
    >
      {children}
    </Link>
  );
}
