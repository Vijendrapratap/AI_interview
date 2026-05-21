import { ReactNode } from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";

type Tone = "accent" | "success" | "warning" | "danger" | "neutral";
const tile: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-soft-ink",
  success: "bg-success-soft text-success-soft-ink",
  warning: "bg-warning-soft text-warning-soft-ink",
  danger: "bg-danger-soft text-danger-soft-ink",
  neutral: "bg-neutral-soft text-neutral-soft-ink",
};

export function StatCard({
  icon,
  value,
  label,
  chip,
  tone = "neutral",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  chip?: string;
  tone?: Tone;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-tile ${tile[tone]}`}>
          {icon}
        </div>
        {chip && <Badge tone={tone}>{chip}</Badge>}
      </div>
      <p className="text-metric">{value}</p>
      <p className="text-meta mt-0.5">{label}</p>
    </Card>
  );
}
