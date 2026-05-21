"use client";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-pill border border-border bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-pill px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
            active === tab ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
