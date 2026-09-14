interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function Progress({ value, max = 100, className = "", color }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div data-slot="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%`, background: color ?? "var(--primary)" }}
      />
    </div>
  );
}
