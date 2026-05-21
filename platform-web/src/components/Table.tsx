import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-card bg-card">
      <table className="w-full text-left text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-border-card">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border-card">{children}</tbody>;
}

export function TR({ className = "", ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-surface/60", className)} {...rest} />;
}

export function Th({ className = "", ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap bg-surface px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3",
        className
      )}
      {...rest}
    />
  );
}

export function Td({ className = "", ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-ink-2", className)} {...rest} />;
}
