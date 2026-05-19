import { ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  title: string;
  body?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  icon?: ReactNode;
}

export function EmptyState({ title, body, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      {icon && <div className="text-[var(--color-ink-3)] mb-4">{icon}</div>}
      <h3 className="font-serif italic text-2xl text-[var(--color-ink)] mb-2 tracking-tight">{title}</h3>
      {body && <p className="text-[var(--color-ink-2)] max-w-md mb-6">{body}</p>}
      {action && (action.href ? (
        <a href={action.href}><Button variant="primary">{action.label}</Button></a>
      ) : (
        <Button variant="primary" onClick={action.onClick}>{action.label}</Button>
      ))}
    </div>
  );
}
