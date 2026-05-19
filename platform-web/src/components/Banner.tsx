import { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
}

export function ComingSoonBanner({ children, className = "" }: Props) {
  return (
    <div
      role="status"
      className={`rounded-md bg-accent-soft border border-border px-4 py-2 text-sm text-ink-2 ${className}`}
    >
      {children ?? "This area is read-only for now — full functionality lands in Slice 2."}
    </div>
  );
}
