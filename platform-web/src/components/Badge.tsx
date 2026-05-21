import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "accent";
const tones: Record<Tone, string> = {
  success: "bg-success-soft text-success-soft-ink",
  warning: "bg-warning-soft text-warning-soft-ink",
  danger: "bg-danger-soft text-danger-soft-ink",
  neutral: "bg-neutral-soft text-neutral-soft-ink",
  accent: "bg-accent-soft text-accent-soft-ink",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-bold",
        tones[tone],
        className
      )}
      {...rest}
    />
  );
}
