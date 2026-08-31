import { type ReactNode } from "react";

interface CardProps { children: ReactNode; className?: string; }

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`p-4 pb-2 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return <h3 className={`font-600 text-sm text-[var(--foreground)] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: CardProps) {
  return <p className={`text-xs text-[var(--muted-foreground)] mt-0.5 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardProps) {
  return <div className={`px-4 pb-4 pt-2 border-t border-[var(--border)] flex items-center ${className}`}>{children}</div>;
}
