import { HTMLAttributes } from "react";

type Tone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";
interface Props extends HTMLAttributes<HTMLSpanElement> { tone?: Tone }

const tones: Record<Tone, string> = {
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]",
  success: "bg-[#E7F0E9] text-[var(--color-success)]",
  warning: "bg-[#F5E7D3] text-[var(--color-warning)]",
  danger: "bg-[#F2D9D5] text-[var(--color-danger)]",
  info: "bg-[#DDE5EE] text-[var(--color-info)]",
  neutral: "bg-[var(--color-surface-muted)] text-[var(--color-ink-2)]",
};

export function Badge({ tone = "neutral", className = "", ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
      {...rest}
    />
  );
}
