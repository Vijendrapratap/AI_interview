import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none";
const sizes = { sm: "h-8 px-3.5 text-xs", md: "h-10 px-5 text-[13px]" };
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "border border-border bg-card text-ink hover:bg-surface-muted",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-muted",
  danger: "bg-danger text-card hover:brightness-95",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className = "", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  )
);
Button.displayName = "Button";
