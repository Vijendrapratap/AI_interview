import { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-[var(--color-card)] border border-[var(--color-border-card)] rounded-md shadow-card p-6 ${className}`}
      {...rest}
    />
  );
}
