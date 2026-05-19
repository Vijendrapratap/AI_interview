import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "./Button";

interface Props {
  title: string;
  body?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  icon?: ReactNode;
}

const primaryLinkClasses =
  "inline-flex items-center justify-center font-medium transition-colors h-10 px-5 text-sm rounded-full bg-accent text-accent-ink hover:brightness-95";

export function EmptyState({ title, body, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      {icon && <div className="text-ink-3 mb-4">{icon}</div>}
      <h3 className="font-serif italic text-2xl text-ink mb-2 tracking-tight">{title}</h3>
      {body && <p className="text-ink-2 max-w-md mb-6">{body}</p>}
      {action && (action.href ? (
        <Link href={action.href} className={primaryLinkClasses}>{action.label}</Link>
      ) : (
        <Button variant="primary" onClick={action.onClick}>{action.label}</Button>
      ))}
    </div>
  );
}
