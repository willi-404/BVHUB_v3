export function Separator({ className = "" }: { className?: string }) {
  return <div data-slot="separator" role="separator" className={`h-px w-full shrink-0 bg-border ${className}`} />;
}
