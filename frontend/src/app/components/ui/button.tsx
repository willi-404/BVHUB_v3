import { type ReactNode, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "bg-transparent text-foreground hover:bg-muted hover:text-foreground",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-3 text-xs",
  md: "h-9 rounded-md px-4 text-sm",
  lg: "h-11 rounded-md px-6 text-sm",
  icon: "size-9 rounded-md p-0",
};

export function Button({ children, variant = "default", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:shrink-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
