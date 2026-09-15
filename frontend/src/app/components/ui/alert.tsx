import { type HTMLAttributes, type ReactNode } from "react";

type AlertVariant = "default" | "destructive" | "success" | "warning";

const variants: Record<AlertVariant, string> = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function Alert({ children, variant = "default", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; variant?: AlertVariant }) {
  return <div role="alert" data-slot="alert" className={`relative w-full rounded-lg border p-4 text-sm ${variants[variant]} ${className}`} {...props}>{children}</div>;
}

export function AlertTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>{children}</h5>;
}

export function AlertDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-sm opacity-90 ${className}`}>{children}</div>;
}
