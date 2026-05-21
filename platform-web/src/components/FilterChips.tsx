"use client";

export type FilterChip = { label: string; count?: number };

export function FilterChips({
  chips,
  active,
  onChange,
}: {
  chips: FilterChip[];
  active: string;
  onChange: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onChange(chip.label)}
          className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-bold transition-colors ${
            active === chip.label
              ? "border-accent bg-accent-soft text-accent-soft-ink"
              : "border-border bg-card text-ink-2 hover:text-ink"
          }`}
        >
          {chip.label}
          {chip.count !== undefined && (
            <span className="text-[11px] font-semibold text-ink-3">{chip.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
