import { type ReactNode } from "react";

export function Breadcrumb({ children }: { children: ReactNode }) {
  return <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm text-muted-foreground">{children}</nav>;
}
export function BreadcrumbList({ children }: { children: ReactNode }) { return <ol className="flex min-w-0 items-center gap-2">{children}</ol>; }
export function BreadcrumbItem({ children }: { children: ReactNode }) { return <li className="min-w-0">{children}</li>; }
export function BreadcrumbLink({ children, href }: { children: ReactNode; href: string }) { return <a className="hover:text-foreground" href={href}>{children}</a>; }
export function BreadcrumbPage({ children }: { children: ReactNode }) { return <span className="truncate font-medium text-foreground">{children}</span>; }
export function BreadcrumbSeparator() { return <li aria-hidden="true">/</li>; }
