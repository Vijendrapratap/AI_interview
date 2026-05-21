import { ReactNode } from "react";

export function KanbanBoard({ children }: { children: ReactNode }) {
  return <div className="flex gap-4 overflow-x-auto pb-3">{children}</div>;
}

export function KanbanColumn({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-card border border-border-card bg-card/60">
      <div className="flex items-center justify-between border-b border-border-card px-4 py-3">
        <span className="text-card-title">{title}</span>
        <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-2">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 p-3">{children}</div>
    </div>
  );
}

export function KanbanCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-tile border border-border-card bg-card p-3 shadow-card">
      {children}
    </div>
  );
}
