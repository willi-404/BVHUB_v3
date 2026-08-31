interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };

export function Avatar({ src, alt, fallback, className = "", size = "md" }: AvatarProps) {
  return (
    <div className={`relative flex shrink-0 overflow-hidden rounded-full bg-[var(--secondary)] ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-600 text-[var(--secondary-foreground)]">
          {fallback ?? "?"}
        </span>
      )}
    </div>
  );
}
