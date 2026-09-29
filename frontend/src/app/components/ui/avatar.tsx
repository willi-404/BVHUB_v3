interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-12 text-base" };

export function Avatar({ src, alt, fallback, className = "", size = "md" }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div data-slot="avatar" className={`relative flex shrink-0 overflow-hidden rounded-full bg-secondary ${sizes[size]} ${className}`}>
      {src && src !== failedSrc ? (
        <img src={src} alt={alt ?? ""} onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
      ) : (
        <span data-slot="avatar-fallback" className="flex size-full items-center justify-center font-semibold text-secondary-foreground">
          {fallback ?? "?"}
        </span>
      )}
    </div>
  );
}
import { useState } from "react";
