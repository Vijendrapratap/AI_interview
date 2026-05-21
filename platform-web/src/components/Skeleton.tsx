export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-tile bg-surface-muted ${className}`} />;
}
