import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "compact" | "flush";
const pad: Record<CardVariant, string> = {
  default: "p-5",
  compact: "p-4",
  flush: "p-0",
};

export function Card({
  variant = "default",
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "bg-card border border-border-card rounded-card shadow-card",
        pad[variant],
        className
      )}
      {...rest}
    />
  );
}
