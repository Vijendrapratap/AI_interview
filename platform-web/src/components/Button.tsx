import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const base = "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-5 text-sm" };
const variants: Record<Variant, string> = {
  primary: "rounded-full bg-accent text-accent-ink hover:brightness-95",
  secondary: "rounded-md border border-border bg-transparent text-ink hover:bg-surface-muted",
  ghost: "rounded-md text-ink-2 hover:text-ink hover:bg-surface-muted",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className = "", ...rest }, ref) => (
    <button ref={ref} type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest} />
  )
);
Button.displayName = "Button";
