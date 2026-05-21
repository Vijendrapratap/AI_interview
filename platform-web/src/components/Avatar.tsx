import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  initials,
  size = "md",
  className = "",
}: {
  initials: string;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill bg-neutral-soft font-bold text-ink-2",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
