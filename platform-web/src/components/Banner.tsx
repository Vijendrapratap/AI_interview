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

/**
 * Backward-compat shim for the redesign migration. Existing pages import
 * `ComingSoonBanner`; page-rebuild tasks replace it with <Banner>. The final
 * verification task deletes this shim once no page references it.
 */
export function ComingSoonBanner({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Banner tone="neutral">
        {children ?? "This area is read-only for now — full functionality lands in Slice 2."}
      </Banner>
    </div>
  );
}
