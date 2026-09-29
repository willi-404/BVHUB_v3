interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  label: string;
}

export function Progress({ value, max = 100, className = "", color, label }: ProgressProps) {
  const boundedValue = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (boundedValue / max) * 100 : 0;
  return (
    <div data-slot="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={boundedValue} className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%`, background: color ?? "var(--primary)" }}
      />
    </div>
  );
}
