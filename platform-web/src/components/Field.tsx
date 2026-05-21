import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-field border border-border bg-card px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-accent";

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[12px] font-bold text-ink-2">
      {children}
      {required && <span className="text-danger"> *</span>}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...rest} />;
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24", className)} {...rest} />;
}

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, className)} {...rest} />;
}

export function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11.5px] font-medium text-danger">{children}</p>;
}
