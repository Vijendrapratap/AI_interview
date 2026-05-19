import { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-card border border-border-card rounded-md shadow-card p-6 ${className}`}
      {...rest}
    />
  );
}
