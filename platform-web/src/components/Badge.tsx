import { HTMLAttributes } from "react";

type Tone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";
interface Props extends HTMLAttributes<HTMLSpanElement> { tone?: Tone }

const tones: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-[#E7F0E9] text-success",
  warning: "bg-[#F5E7D3] text-warning",
  danger: "bg-[#F2D9D5] text-danger",
  info: "bg-[#DDE5EE] text-info",
  neutral: "bg-surface-muted text-ink-2",
};

export function Badge({ tone = "neutral", className = "", ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
      {...rest}
    />
  );
}
