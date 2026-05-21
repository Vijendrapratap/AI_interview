import { ReactNode } from "react";
import { Card } from "./Card";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card variant="flush" className={className}>
      <div className="flex items-start justify-between gap-3 border-b border-border-card px-5 py-4">
        <div>
          <h2 className="text-card-title">{title}</h2>
          {subtitle && <p className="text-meta mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
