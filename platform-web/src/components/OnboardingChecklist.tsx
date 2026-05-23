import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "./Card";

type Totals = { jobs: number; candidates: number };

function CheckStep({
  done,
  label,
  href,
  disabled,
}: {
  done: boolean;
  label: string;
  href?: string;
  disabled?: boolean;
}) {
  const icon = done ? (
    <CheckCircle2 size={18} className="shrink-0 text-success-soft-ink" />
  ) : (
    <Circle size={18} className="shrink-0 text-ink-3" />
  );

  const text = (
    <span
      className={
        done
          ? "text-[13px] line-through text-ink-3"
          : "text-[13px] font-medium text-ink"
      }
    >
      {label}
    </span>
  );

  if (disabled || done || !href) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-1">
        {icon}
        {text}
        {disabled && (
          <span className="ml-auto text-[11px] text-ink-3 border border-border-card rounded-pill px-2 py-0.5">
            Available soon
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2.5 px-1 rounded-tile hover:bg-surface transition-colors group"
    >
      {icon}
      {text}
      <span className="ml-auto text-[11px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Go &rarr;
      </span>
    </Link>
  );
}

export function OnboardingChecklist({ totals }: { totals: Totals }) {
  const steps = [
    {
      label: "Post your first job",
      href: "/dashboard/jobs/new",
      done: totals.jobs > 0,
    },
    {
      label: "Add your first candidate",
      href: "/dashboard/candidates",
      done: totals.candidates > 0,
    },
    {
      label: "Invite a teammate",
      href: "/dashboard/settings",
      done: false,
    },
    {
      label: "Load sample data",
      done: false,
      disabled: true,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card variant="default" className="max-w-lg">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent mb-1">
          Getting Started
        </p>
        <h2 className="text-[16px] font-bold text-ink">
          Welcome to ReCruItAI
        </h2>
        <p className="mt-1 text-[13px] text-ink-3">
          Complete these steps to set up your recruiting workspace.{" "}
          <span className="font-semibold text-ink">
            {doneCount}/{steps.length} done
          </span>
        </p>
      </div>

      <div className="divide-y divide-border-card">
        {steps.map((step) => (
          <CheckStep key={step.label} {...step} />
        ))}
      </div>
    </Card>
  );
}
