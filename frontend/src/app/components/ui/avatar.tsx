interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-12 text-base" };

export function Avatar({ src, alt, fallback, className = "", size = "md" }: AvatarProps) {
  return (
    <div data-slot="avatar" className={`relative flex shrink-0 overflow-hidden rounded-full bg-secondary ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span data-slot="avatar-fallback" className="flex size-full items-center justify-center font-semibold text-secondary-foreground">
          {fallback ?? "?"}
        </span>
      )}
    </div>
  );
}
