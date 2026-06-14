import { getAvatarInitials } from "@/lib/avatar";

type UserAvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
};

export function UserAvatar({
  imageUrl,
  name,
  className = "h-12 w-12",
  textClassName = "text-sm",
}: UserAvatarProps) {
  const initials = getAvatarInitials(name);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.05] ${className}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name ? `${name} avatar` : "User avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-amber-300/10 text-amber-100">
          <span className={`font-semibold uppercase tracking-[0.12em] ${textClassName}`}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
