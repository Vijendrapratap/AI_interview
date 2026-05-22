import { ReactNode } from "react";

type Tone = "neutral" | "accent" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral-soft-ink",
  accent: "bg-accent-soft text-accent-soft-ink",
  warning: "bg-warning-soft text-warning-soft-ink",
  danger: "bg-danger-soft text-danger-soft-ink",
};

export function Banner({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-card px-4 py-3 text-[13px] font-medium ${tones[tone]}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
