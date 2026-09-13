import { type ReactNode } from "react";

interface CardProps { children: ReactNode; className?: string; }

export function Card({ children, className = "" }: CardProps) {
  return (
    <div data-slot="card" className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div data-slot="card-header" className={`flex flex-col gap-1.5 p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return <h3 data-slot="card-title" className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: CardProps) {
  return <p data-slot="card-description" className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div data-slot="card-content" className={`px-6 pb-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardProps) {
  return <div data-slot="card-footer" className={`flex items-center border-t px-6 py-4 ${className}`}>{children}</div>;
}
