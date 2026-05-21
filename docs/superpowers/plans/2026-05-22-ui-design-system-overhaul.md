# ReCruItAI UI Design System Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin every surface of the `platform-web/` Next.js app to one consistent "Warm + Sage" design system, eliminating the inconsistent white/blue look.

**Architecture:** Token-first. Rewrite `globals.css` design tokens, build a shared theme-locked component library, then rebuild every page on those components. Consistency becomes structural — pages cannot drift because they reuse the same components. Visual/layout only; no new product functionality.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (`@theme` tokens), TypeScript, lucide-react icons. Helper: `cn()` from `@/lib/utils`.

**Verification model:** `platform-web/` has no test runner, and this is a presentational restyle — there is no unit-test-shaped behavior to TDD. Each task is verified by `npm run lint` (ESLint + TypeScript) and, at phase boundaries, `npm run build`. The final task runs a grep gate proving no raw Tailwind palette colors remain. Do **not** add a test framework — that is out of scope.

**Spec:** `docs/superpowers/specs/2026-05-22-ui-design-system-overhaul-design.md`

**Conventions for every task:**
- Run all `npm` commands from `platform-web/`.
- Before any commit, ensure git identity: `git config user.name "Vijendrapratap"` and `git config user.email "44225657+Vijendrapratap@users.noreply.github.com"`.
- `git add` only the files the task changed — never `git add .`.
- After every reskinned file: **no raw Tailwind palette colors** (`blue-*`, `gray-*`, `slate-*`, `green-50`, `red-50`, `yellow-50`, etc.). Use only theme tokens.
- Page rebuilds must **preserve every existing `Link` href, `mockData` import, and data/logic expression**. This is a restyle, not a rewrite of behavior.

---

## Phase 1 — Foundation

### Task 1: Design tokens

**Files:**
- Modify: `platform-web/src/app/globals.css`

- [ ] **Step 1: Replace the entire contents of `globals.css`**

```css
@import "tailwindcss";

@theme {
  /* Canvas */
  --color-surface: #EFE7DC;
  --color-surface-deep: #EBDBCC;
  --color-surface-muted: #E6DDD0;
  --color-card: #FFFFFF;

  /* Ink */
  --color-ink: #1F1E1C;
  --color-ink-2: #57544E;
  --color-ink-3: #908C82;

  /* Borders */
  --color-border: #E4DBCC;
  --color-border-card: #ECE4D6;

  /* Sage accent */
  --color-accent: #4F6B45;
  --color-accent-hover: #445D3C;
  --color-accent-ink: #F3F6EE;
  --color-accent-soft: #E7EEE0;
  --color-accent-soft-ink: #46603E;

  /* Status */
  --color-success: #4F8A5B;
  --color-success-soft: #E7EEE0;
  --color-success-soft-ink: #46603E;
  --color-warning: #9A7430;
  --color-warning-soft: #F6EEDC;
  --color-warning-soft-ink: #9A7430;
  --color-danger: #B5503F;
  --color-danger-soft: #F2E3DE;
  --color-danger-soft-ink: #B5503F;
  --color-neutral: #57544E;
  --color-neutral-soft: #EDE6D9;
  --color-neutral-soft-ink: #57544E;

  /* Radius */
  --radius-card: 16px;
  --radius-field: 12px;
  --radius-tile: 10px;
  --radius-pill: 999px;

  /* Elevation */
  --shadow-card: 0 1px 2px rgba(31,30,28,.05), 0 1px 1px rgba(31,30,28,.03);
  --shadow-pop: 0 8px 28px rgba(31,30,28,.12);

  /* Fonts */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-fraunces), Georgia, serif;
}

html, body {
  background: linear-gradient(160deg, #F5F0E8 0%, #EFE7DC 52%, #EBDBCC 100%);
  background-attachment: fixed;
  min-height: 100vh;
  color: var(--color-ink);
}

@layer components {
  .text-eyebrow {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.14em; color: var(--color-ink-3);
  }
  .text-page-title {
    font-family: var(--font-serif); font-size: 30px; font-weight: 600;
    letter-spacing: -0.01em; color: var(--color-ink);
  }
  .text-card-title { font-size: 14px; font-weight: 700; color: var(--color-ink); }
  .text-metric { font-size: 28px; font-weight: 800; color: var(--color-ink); line-height: 1.1; }
  .text-meta { font-size: 11.5px; font-weight: 500; color: var(--color-ink-3); }
}
```

- [ ] **Step 2: Verify the build compiles the CSS**

Run: `cd platform-web && npm run build`
Expected: build succeeds (the old `.shadow-card` manual class is now a generated `shadow-card` utility from `--shadow-card`).

- [ ] **Step 3: Commit**

```bash
git add platform-web/src/app/globals.css
git commit -m "feat(web): replace design tokens with Warm + Sage system"
```

---

## Phase 2 — Component Library

All components live in `platform-web/src/components/`. Use `cn()` from `@/lib/utils` for class merging.

### Task 2: Core primitives — Card, SectionCard, Button, Badge, Avatar, barrel

**Files:**
- Modify: `platform-web/src/components/Card.tsx`
- Modify: `platform-web/src/components/Button.tsx`
- Modify: `platform-web/src/components/Badge.tsx`
- Create: `platform-web/src/components/SectionCard.tsx`
- Create: `platform-web/src/components/Avatar.tsx`

- [ ] **Step 1: Replace `Card.tsx`**

```tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "compact" | "flush";
const pad: Record<CardVariant, string> = {
  default: "p-5",
  compact: "p-4",
  flush: "p-0",
};

export function Card({
  variant = "default",
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "bg-card border border-border-card rounded-card shadow-card",
        pad[variant],
        className
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 2: Create `SectionCard.tsx`**

```tsx
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
```

- [ ] **Step 3: Replace `Button.tsx`**

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none";
const sizes = { sm: "h-8 px-3.5 text-xs", md: "h-10 px-5 text-[13px]" };
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "border border-border bg-card text-ink hover:bg-surface-muted",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-muted",
  danger: "bg-danger text-card hover:brightness-95",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className = "", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 4: Replace `Badge.tsx`**

```tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "accent";
const tones: Record<Tone, string> = {
  success: "bg-success-soft text-success-soft-ink",
  warning: "bg-warning-soft text-warning-soft-ink",
  danger: "bg-danger-soft text-danger-soft-ink",
  neutral: "bg-neutral-soft text-neutral-soft-ink",
  accent: "bg-accent-soft text-accent-soft-ink",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-bold",
        tones[tone],
        className
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 5: Create `Avatar.tsx`**

```tsx
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  initials,
  size = "md",
  className = "",
}: {
  initials: string;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill bg-neutral-soft font-bold text-ink-2",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add platform-web/src/components/Card.tsx platform-web/src/components/SectionCard.tsx platform-web/src/components/Button.tsx platform-web/src/components/Badge.tsx platform-web/src/components/Avatar.tsx
git commit -m "feat(web): add core UI primitives (Card, Button, Badge, Avatar)"
```

> The `@/components` barrel is created last (Task 7) once every component file exists, so per-task linting never hits an unresolved import.

### Task 3: Display primitives — PageHeader, StatCard, Banner, EmptyState, Skeleton

**Files:**
- Create: `platform-web/src/components/PageHeader.tsx`
- Create: `platform-web/src/components/StatCard.tsx`
- Modify: `platform-web/src/components/Banner.tsx`
- Modify: `platform-web/src/components/EmptyState.tsx`
- Create: `platform-web/src/components/Skeleton.tsx`

- [ ] **Step 1: Create `PageHeader.tsx`**

```tsx
import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow && <div className="text-eyebrow">{eyebrow}</div>}
        <h1 className="text-page-title mt-1.5">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `StatCard.tsx`**

```tsx
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
```

> `h-full` + a parent grid with `items-stretch` (default for grid) gives all KPI cards equal height.

- [ ] **Step 3: Replace `Banner.tsx`**

```tsx
import { ReactNode } from "react";

type Tone = "neutral" | "accent" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral-soft-ink",
  accent: "bg-accent-soft text-accent-soft-ink",
  warning: "bg-warning-soft text-warning-soft-ink",
  danger: "bg-danger-soft text-danger-soft-ink",
};

export function Banner({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-card px-4 py-3 text-[13px] font-medium ${tones[tone]}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
```

- [ ] **Step 4: Replace `EmptyState.tsx`**

```tsx
import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-surface-muted text-ink-3">
          {icon}
        </div>
      )}
      <h3 className="text-card-title">{title}</h3>
      {description && <p className="text-meta mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Create `Skeleton.tsx`**

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-tile bg-surface-muted ${className}`} />;
}
```

- [ ] **Step 6: Commit**

```bash
git add platform-web/src/components/PageHeader.tsx platform-web/src/components/StatCard.tsx platform-web/src/components/Banner.tsx platform-web/src/components/EmptyState.tsx platform-web/src/components/Skeleton.tsx
git commit -m "feat(web): add display primitives (PageHeader, StatCard, Banner, EmptyState, Skeleton)"
```

### Task 4: Interactive primitives — Toast, Tabs, FilterChips

**Files:**
- Create: `platform-web/src/components/Toast.tsx`
- Create: `platform-web/src/components/Tabs.tsx`
- Create: `platform-web/src/components/FilterChips.tsx`

- [ ] **Step 1: Create `Toast.tsx`**

```tsx
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastItem = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-card bg-card px-4 py-3 text-[13px] font-semibold text-ink shadow-pop"
          >
            <CheckCircle2 size={16} className="text-success" />
            {t.message}
            <button
              type="button"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="ml-1 text-ink-3 hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 2: Create `Tabs.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `FilterChips.tsx`**

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add platform-web/src/components/Toast.tsx platform-web/src/components/Tabs.tsx platform-web/src/components/FilterChips.tsx
git commit -m "feat(web): add interactive primitives (Toast, Tabs, FilterChips)"
```

### Task 5: Table primitives

**Files:**
- Create: `platform-web/src/components/Table.tsx`

- [ ] **Step 1: Create `Table.tsx`**

```tsx
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
```

> Sticky first column: a page passes `className="sticky left-0 bg-card"` (and `bg-surface` for the header `Th`) to the first cell in each row.

- [ ] **Step 2: Commit**

```bash
git add platform-web/src/components/Table.tsx
git commit -m "feat(web): add themed Table primitives"
```

### Task 6: Form Field primitives

**Files:**
- Create: `platform-web/src/components/Field.tsx`

- [ ] **Step 1: Create `Field.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add platform-web/src/components/Field.tsx
git commit -m "feat(web): add themed form Field primitives"
```

### Task 7: Kanban primitives + component barrel

**Files:**
- Create: `platform-web/src/components/Kanban.tsx`
- Create: `platform-web/src/components/index.ts`

- [ ] **Step 1: Create `Kanban.tsx`**

```tsx
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
```

- [ ] **Step 2: Create the `index.ts` barrel**

```ts
export * from "./Card";
export * from "./SectionCard";
export * from "./Button";
export * from "./Badge";
export * from "./Avatar";
export * from "./PageHeader";
export * from "./StatCard";
export * from "./Banner";
export * from "./EmptyState";
export * from "./Skeleton";
export * from "./Toast";
export * from "./Tabs";
export * from "./FilterChips";
export * from "./Table";
export * from "./Field";
export * from "./Kanban";
```

- [ ] **Step 3: Lint and build the whole component library**

Run: `cd platform-web && npm run lint && npm run build`
Expected: both succeed. The `index.ts` barrel now resolves all 16 component files.

- [ ] **Step 4: Commit**

```bash
git add platform-web/src/components/Kanban.tsx platform-web/src/components/index.ts
git commit -m "feat(web): add Kanban primitives and component barrel"
```

---

## Phase 3 — App Shell

### Task 8: Dashboard layout (sidebar, header, nav fix, ToastProvider)

**Files:**
- Modify: `platform-web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Users, Briefcase, Settings, Search, Bell, TrendingUp,
    LogOut, Kanban, CalendarClock, MessageSquare, Mail, Bot, Radar, Route
} from "lucide-react";
import { ToastProvider } from "@/components";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <div className="flex min-h-screen text-ink">
                <aside className="fixed z-10 hidden h-full w-64 border-r border-border bg-card/70 backdrop-blur-xl md:block">
                    <div className="flex h-16 items-center gap-3 border-b border-border px-6">
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-tile bg-accent text-sm font-black text-accent-ink">
                                R
                            </div>
                            <span className="text-[15px] font-black tracking-tight text-ink">ReCruItAI</span>
                        </Link>
                    </div>

                    <nav className="flex h-[calc(100%-4rem)] flex-col justify-between space-y-1 p-4">
                        <div className="space-y-0.5">
                            <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />}>Dashboard</NavItem>
                            <NavItem href="/dashboard/hiring-flow" icon={<Route size={18} />}>Hiring Flow</NavItem>
                            <NavItem href="/dashboard/jobs" icon={<Briefcase size={18} />}>Jobs</NavItem>
                            <NavItem href="/dashboard/pipeline" icon={<Kanban size={18} />}>Pipeline</NavItem>
                            <NavItem href="/dashboard/candidates" icon={<Users size={18} />}>Candidates</NavItem>
                            <NavItem href="/dashboard/interviews" icon={<CalendarClock size={18} />}>Interviews</NavItem>
                            <NavItem href="/dashboard/collaboration" icon={<MessageSquare size={18} />}>Collaboration</NavItem>
                            <NavItem href="/dashboard/communications" icon={<Mail size={18} />}>Comms</NavItem>
                            <NavItem href="/dashboard/sourcing" icon={<Radar size={18} />}>Sourcing</NavItem>
                            <NavItem href="/dashboard/automations" icon={<Bot size={18} />}>Automations</NavItem>
                            <NavItem href="/dashboard/analytics" icon={<TrendingUp size={18} />}>Analytics</NavItem>
                            <NavItem href="/dashboard/settings" icon={<Settings size={18} />}>Settings</NavItem>
                        </div>

                        <div className="border-t border-border pt-4">
                            <Link href="/" className="flex items-center gap-3 rounded-pill px-3 py-2 text-[13px] font-bold text-danger transition-colors hover:bg-danger-soft">
                                <LogOut size={18} />
                                Sign Out
                            </Link>
                        </div>
                    </nav>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col md:ml-64">
                    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-8 backdrop-blur-xl">
                        <div className="flex items-center gap-3 rounded-pill border border-border-card bg-card px-4 py-2 text-ink-3 shadow-card">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search candidates, jobs, actions..."
                                className="w-64 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/notifications" className="relative rounded-pill border border-border-card bg-card p-2 text-ink-2 transition-colors hover:bg-surface-muted">
                                <Bell size={18} />
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-pill bg-danger ring-2 ring-card" />
                            </Link>
                            <Link href="/dashboard/profile" className="block">
                                <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-accent text-[13px] font-bold text-accent-ink transition-transform hover:-translate-y-0.5">
                                    DR
                                </div>
                            </Link>
                        </div>
                    </header>

                    <main className="flex-1">{children}</main>
                </div>
            </div>
        </ToastProvider>
    );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive =
        href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname?.startsWith(href + "/");

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-pill px-3 py-2 text-[13px] font-bold transition-colors ${
                isActive ? "bg-accent-soft text-accent-soft-ink" : "text-ink-2 hover:bg-surface-muted hover:text-ink"
            }`}
        >
            {icon}
            {children}
        </Link>
    );
}
```

> Key fixes: the `/dashboard` root nav item now matches **only** `/dashboard` (no longer highlights on every sub-page); active state uses the sage-soft pill; `ToastProvider` wraps the dashboard so save actions can confirm.

- [ ] **Step 2: Lint**

Run: `cd platform-web && npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/(dashboard)/layout.tsx"
git commit -m "fix(web): reskin dashboard shell and fix always-active nav bug"
```

### Task 9: Root layout + Footer

**Files:**
- Modify: `platform-web/src/app/layout.tsx`
- Modify: `platform-web/src/components/layout/Footer.tsx`

- [ ] **Step 1: Reskin `app/layout.tsx`**

Read the current file. Keep the Fraunces + Inter font setup and metadata exactly as-is. Remove any hard-coded background color on `<body>` (the gradient now comes from `globals.css`). Ensure `<body>` keeps only `className` referencing the font variables (e.g. `${inter.variable} ${fraunces.variable} antialiased`). Do not change font wiring.

- [ ] **Step 2: Reskin `Footer.tsx`**

Read the current file. Replace every raw color (`blue-*`, `gray-*`, etc.) with theme tokens: backgrounds → `bg-surface`/`bg-card`, text → `text-ink`/`text-ink-2`/`text-ink-3`, borders → `border-border`, links hover → `text-accent`. Keep all link hrefs and copy.

- [ ] **Step 3: Lint and build**

Run: `cd platform-web && npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add platform-web/src/app/layout.tsx platform-web/src/components/layout/Footer.tsx
git commit -m "feat(web): reskin root layout and footer"
```

---

## Phase 4 — Dashboard Pages

**Every page task follows the same recipe.** For each file: read it, then rebuild the markup so it imports from `@/components` and uses only theme tokens. Each task lists the page-specific work. Run `npm run lint` after each, then commit.

### Task 10: Dashboard home

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Rebuild the page**

- Wrap the page header in `<PageHeader eyebrow="AI-first ATS workspace" title="Recruiter Command Center" subtitle="..." actions={<Link href="/dashboard/jobs/new">...New Job</Link>} />`. The New Job action uses sage `Button` styling (or a `Link` styled `bg-accent text-accent-ink rounded-pill`).
- Replace the four inline `StatCard` divs with the `<StatCard>` component. Map tones: Needs Review → `accent`, SLA Risks → `danger`, Interviews Pending → `neutral`, Offers Pending → `success`. Use `chip` for the short trend word; the metric stays the hero.
- "Simple hiring flow" panel and "Active Requisition Health" table → use `SectionCard`. The 5 step cards: wrap in a grid and add `items-stretch` + `h-full` so all five are equal height.
- Priority Queue → `SectionCard`; each row uses `<Avatar>`; give the candidate name and AI-fit score equal weight (name `text-[14px] font-bold`, score `text-[18px] font-extrabold text-accent-soft-ink` — not larger than today's `text-2xl`).
- Requisition Health table → rebuild with `TableWrap/THead/TBody/TR/Th/Td`.
- Replace all `bg-red-50/bg-green-50/bg-yellow-50/bg-gray-*` in `RiskBadge`/`SLABadge` with `<Badge tone=...>`.
- Preserve all `mockData` imports, filters, sorts, and `Link` hrefs.

- [ ] **Step 2: Lint** — `cd platform-web && npm run lint` → passes.
- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(web): reskin dashboard home"
```

### Task 11: Hiring Flow

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/hiring-flow/page.tsx`

- [ ] **Step 1: Rebuild the page**

- `PageHeader` at top.
- Dark hero card: keep a dark panel but use `bg-ink text-card` (tokens), `rounded-card`. The "Start a hiring run" CTA: give the pill a fixed comfortable width / `whitespace-nowrap` so text no longer wraps to three lines.
- The five step cards: grid with `items-stretch`, each card `h-full`, identical padding via `Card`.
- Replace all raw colors with tokens; status pills → `Badge`.
- Preserve all hrefs and data.

- [ ] **Step 2: Lint** → passes.
- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/hiring-flow/page.tsx"
git commit -m "feat(web): reskin hiring flow page"
```

### Task 12: Jobs (list, new, detail)

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`

- [ ] **Step 1: Rebuild `jobs/page.tsx`**

- `PageHeader` with a sage `Button` "New Job" action.
- Job cards → `Card`; consistent hierarchy (title `text-card-title`, salary/location `text-meta`); status → `Badge`.
- Any read-only notice → `<Banner>`; add an `<EmptyState>` for the no-jobs case.
- Preserve hrefs (including each job's detail link) and `mockData`.

- [ ] **Step 2: Rebuild `jobs/new/page.tsx`**

- `PageHeader`.
- Rebuild the form using `Label` + `Input`/`Textarea`/`Select` from `@/components`. Mark genuinely required fields with `<Label required>`.
- **Fix the typo:** "Key Requirements (Comma shared)" → "Key Requirements (Comma separated)".
- Department: if it is a free-text `Input`, convert to `<Select>` with a small managed list (e.g. Engineering, Design, Product, Marketing, Sales, Operations, People).
- Location: remove `"Remote"` as a pre-filled `value`; make it the `placeholder` instead.
- Submit button → sage `Button variant="primary"`.
- Preserve any existing state/handlers.

- [ ] **Step 3: Rebuild `jobs/[id]/page.tsx`**

- `PageHeader`; content sections → `SectionCard`; status → `Badge`; all raw colors → tokens. Preserve params usage, `mockData`, hrefs.

- [ ] **Step 4: Lint** → passes.
- [ ] **Step 5: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx" "platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx" "platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx"
git commit -m "feat(web): reskin jobs pages and fix new-job form"
```

### Task 13: Pipeline (horizontal Kanban)

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/pipeline/page.tsx`

- [ ] **Step 1: Rebuild the page**

- `PageHeader`.
- Replace the vertically stacked full-width stage columns with `<KanbanBoard>` containing one `<KanbanColumn title={stage} count={n}>` per stage, laid out **horizontally** (the `KanbanBoard` flex row scrolls horizontally).
- Each candidate becomes a `<KanbanCard>` with `Avatar`, name (`text-[13px] font-bold`), role (`text-meta`), and an AI-fit `Badge`.
- No drag-and-drop — visual structure only.
- Preserve all `mockData` grouping logic and hrefs.

- [ ] **Step 2: Lint** → passes.
- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/pipeline/page.tsx"
git commit -m "feat(web): rebuild pipeline as horizontal kanban"
```

### Task 14: Candidates (list, detail, scorecard)

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/scorecard/page.tsx`

- [ ] **Step 1: Rebuild `candidates/page.tsx`**

- `PageHeader`.
- Rebuild the table with `TableWrap/THead/TBody/TR/Th/Td`. Make the first column (Candidate) sticky: pass `className="sticky left-0 bg-card"` to the first `Td` of each row and `className="sticky left-0 bg-surface"` to the first `Th`.
- The AI Fit cell currently holds a long explanation paragraph — move that into a `title` attribute (tooltip) on a short element, or a `<details>`/expandable; the cell shows just the score `Badge` + a one-line summary.
- Filter chips → `<FilterChips>` with a `count` per chip (compute counts from `mockData`).
- Status/risk cells → `<Badge>`. All raw colors → tokens.
- Add an `<EmptyState>` for a filtered-to-empty result.
- Preserve all `Link` hrefs (each row's candidate link) and `mockData`.

- [ ] **Step 2: Rebuild `candidates/[id]/page.tsx`**

- `PageHeader` (candidate name as title, `Avatar` nearby); content blocks → `SectionCard`; badges via `Badge`; tokens only. Preserve params, `mockData`, hrefs.

- [ ] **Step 3: Rebuild `candidates/[id]/scorecard/page.tsx`**

- `PageHeader`; scorecard sections → `SectionCard`; tokens only. Preserve params and data.

- [ ] **Step 4: Lint** → passes.
- [ ] **Step 5: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx" "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx" "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/scorecard/page.tsx"
git commit -m "feat(web): reskin candidate pages and fix table overflow"
```

### Task 15: Interviews + Collaboration

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/interviews/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/collaboration/page.tsx`

- [ ] **Step 1: Rebuild `interviews/page.tsx`**

- `PageHeader`; interview cards → `Card`/`SectionCard`; status → `Badge`; action buttons → `Button` (`secondary`/`ghost`); tokens only. Preserve hrefs and data.

- [ ] **Step 2: Rebuild `collaboration/page.tsx`**

- `PageHeader`; feedback-queue cards → `Card`; `Avatar` for people; status → `Badge`; buttons → `Button`; tokens only. Preserve hrefs and data.

- [ ] **Step 3: Lint** → passes.
- [ ] **Step 4: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/interviews/page.tsx" "platform-web/src/app/(dashboard)/dashboard/collaboration/page.tsx"
git commit -m "feat(web): reskin interviews and collaboration pages"
```

### Task 16: Communications + Automations + Sourcing

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/communications/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/automations/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/sourcing/page.tsx`

- [ ] **Step 1: Rebuild `communications/page.tsx`**

- `PageHeader`; the three top cards and template cards → `Card` (consistent radius/padding); buttons → `Button`; tokens only. Preserve hrefs and data.

- [ ] **Step 2: Rebuild `automations/page.tsx`**

- `PageHeader`; rule cards → `Card`/`SectionCard`; status → `Badge`; tokens only. Preserve hrefs and data.

- [ ] **Step 3: Rebuild `sourcing/page.tsx`**

- `PageHeader`; the 2×2 channel grid → `Card`s with `items-stretch` equal height; buttons → `Button` (primary = sage — this page currently uses blue "Publish selected"); tokens only. Preserve hrefs and data.

- [ ] **Step 4: Lint** → passes.
- [ ] **Step 5: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/communications/page.tsx" "platform-web/src/app/(dashboard)/dashboard/automations/page.tsx" "platform-web/src/app/(dashboard)/dashboard/sourcing/page.tsx"
git commit -m "feat(web): reskin communications, automations, sourcing pages"
```

### Task 17: Analytics (with conversion-bar fix)

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/analytics/page.tsx`

- [ ] **Step 1: Rebuild the page**

- `PageHeader`.
- KPI cards → `<StatCard>`.
- **Fix the Pipeline Conversion bars:** each bar's width must be normalized against the **same maximum** (the largest stage value, e.g. Received). Compute `width = (stageValue / maxStageValue) * 100 + "%"`. This makes a smaller stage visually shorter, so the funnel reads truthfully. Bars use `bg-accent` on a `bg-surface-muted` track.
- All raw colors → tokens; chart accents use `accent`/`success`/`warning`/`danger` tokens only.
- Preserve all `mockData` and computed values.

- [ ] **Step 2: Lint** → passes.
- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/analytics/page.tsx"
git commit -m "feat(web): reskin analytics and fix conversion bar normalization"
```

### Task 18: Settings + Notifications + Profile

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/settings/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/notifications/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/profile/page.tsx`

- [ ] **Step 1: Rebuild `settings/page.tsx`**

- `PageHeader`.
- Tab strip → `<Tabs>` (it is a client component; `settings/page.tsx` already is or must add `"use client"` and `useState` for the active tab).
- Enterprise-control cards → `Card`.
- Wire the "Save Changes" button to call `useToast()` and show e.g. `"Settings saved"` on click. Button → sage `Button variant="primary"`.
- Tokens only. Preserve any existing content.

- [ ] **Step 2: Rebuild `notifications/page.tsx`**

- `PageHeader`; notification rows → `Card variant="compact"` or list inside a `SectionCard`; unread marker uses `bg-accent`; tokens only. Preserve hrefs and data.

- [ ] **Step 3: Rebuild `profile/page.tsx`**

- `PageHeader`.
- **Fix the avatar/name overlap:** rebuild the header with a clean flex row — `<Avatar size="lg">` then a separate text block (name + role) with proper `gap`; no negative margins / overlap. Remove the empty cover-gradient block.
- Complete the cut-off Personal Information card using `SectionCard` + `Label`/`Input` (read-only display is fine; this is a restyle).
- Buttons → `Button`. Tokens only.

- [ ] **Step 4: Lint and build**

Run: `cd platform-web && npm run lint && npm run build`
Expected: both succeed (all dashboard pages now reskinned).

- [ ] **Step 5: Commit**

```bash
git add "platform-web/src/app/(dashboard)/dashboard/settings/page.tsx" "platform-web/src/app/(dashboard)/dashboard/notifications/page.tsx" "platform-web/src/app/(dashboard)/dashboard/profile/page.tsx"
git commit -m "feat(web): reskin settings, notifications, profile pages"
```

---

## Phase 5 — Public, Portal & Interview Surfaces

### Task 19: Marketing landing + Login

**Files:**
- Modify: `platform-web/src/app/page.tsx`
- Modify: `platform-web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Rebuild `app/page.tsx`**

- Reskin the marketing landing to Warm + Sage: gradient canvas (inherited), `Card`s for feature blocks, sage `Button`/CTA styling, serif `text-page-title` for the hero headline, tokens only — no `blue-*`/`gray-*`.
- Preserve all section copy and `Link` hrefs.

- [ ] **Step 2: Rebuild `(auth)/login/page.tsx`**

- Reskin to a centered `Card` on the gradient canvas; inputs → `Input`/`Label`; submit → sage `Button`; tokens only.
- Preserve form fields, any handlers, and hrefs.

- [ ] **Step 3: Lint** → passes.
- [ ] **Step 4: Commit**

```bash
git add platform-web/src/app/page.tsx "platform-web/src/app/(auth)/login/page.tsx"
git commit -m "feat(web): reskin marketing landing and login"
```

### Task 20: Candidate portal

**Files:**
- Modify: `platform-web/src/app/(portal)/layout.tsx`
- Modify: `platform-web/src/app/(portal)/portal/page.tsx`
- Modify: `platform-web/src/app/(portal)/portal/reports/layout.tsx`
- Modify: `platform-web/src/app/(portal)/portal/reports/page.tsx`
- Modify: `platform-web/src/app/(portal)/portal/reports/resume/page.tsx`
- Modify: `platform-web/src/app/(portal)/portal/reports/interview/page.tsx`
- Modify: `platform-web/src/app/(portal)/portal/reports/career/page.tsx`
- Modify: `platform-web/src/app/(portal)/portal/reports/skills/page.tsx`

- [ ] **Step 1: Rebuild each portal file**

For every file above: reskin to Warm + Sage — `PageHeader` where there is a page title, `SectionCard`/`Card` for content blocks, `Badge` for status, `Tabs` for any report navigation, tokens only (no `blue-*`/`gray-*`). The `reports/layout.tsx` report-section nav uses the sage-soft active-pill pattern. Preserve every `Link` href, route param, and `mockData` import.

- [ ] **Step 2: Lint** → passes.
- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/(portal)/"
git commit -m "feat(web): reskin candidate portal"
```

### Task 21: Interview runner

**Files:**
- Modify: `platform-web/src/app/interview/[id]/page.tsx`

- [ ] **Step 1: Rebuild the page**

- Reskin the interview runner to Warm + Sage: gradient canvas, `Card`/`SectionCard` for question/answer blocks, sage `Button` for primary actions, `Badge` for state, tokens only.
- Preserve route params, any timer/state logic, handlers, and hrefs.

- [ ] **Step 2: Lint and build**

Run: `cd platform-web && npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add "platform-web/src/app/interview/[id]/page.tsx"
git commit -m "feat(web): reskin interview runner"
```

---

## Phase 6 — Verification

### Task 22: Final verification sweep

**Files:** none modified unless the gate finds leftovers.

- [ ] **Step 1: Raw-color grep gate**

Run from repo root:
```bash
grep -rnE '\b(blue|indigo|sky|slate|gray|zinc|neutral|stone|cyan|teal|emerald|lime|amber|orange|yellow|red|green|rose|pink|fuchsia|violet|purple)-(50|100|200|300|400|500|600|700|800|900)\b' platform-web/src/app platform-web/src/components
```
Expected: **no output**. Any match is a raw Tailwind palette color that must be replaced with a theme token in the offending file, then re-committed.

> Note: theme tokens like `text-ink`, `bg-accent-soft`, `border-border-card`, `bg-neutral-soft` do **not** match this pattern (no numeric suffix), so they are fine.

- [ ] **Step 2: Full lint + build**

Run: `cd platform-web && npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 3: Visual pass**

Run: `cd platform-web && npm run dev` and open each route. Confirm on every surface: warm gradient canvas, white cards with one consistent radius, sage as the only accent/active color, no blue anywhere, KPI/cards equal height, the dashboard nav highlights only the current page, the Profile header has no avatar/name overlap, the Pipeline shows horizontal lanes, the Candidates table does not overflow the viewport, and the New Job form reads "Comma separated".

- [ ] **Step 4: Commit any gate fixes** (only if Step 1 found leftovers)

```bash
git add <fixed files>
git commit -m "fix(web): replace remaining raw palette colors with theme tokens"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```

Then verify the deploy at `https://recruitai-test.vercel.app` and `https://recruitai-test.vercel.app/dashboard`.

---

## Self-Review Notes

- **Spec coverage:** tokens (Task 1); component library — all 16 spec components (Tasks 2–7); shell + nav fix (Task 8); root layout + footer (Task 9); all 18 dashboard pages (Tasks 10–18); marketing/login (Task 19); portal, 8 files (Task 20); interview runner (Task 21); bug fixes — typo, avatar overlap, nav active, KPI crowding, table overflow, horizontal Kanban, conversion bars, unified CTA color (Tasks 8, 10, 12, 13, 14, 17, 18); states — EmptyState/Skeleton/Toast/Banner created and applied (Tasks 3, 4, 10, 12, 14, 18); grep gate (Task 22).
- **Out of scope (correctly excluded):** no new functionality, no drag-and-drop, no integrations — these are spec Appendix A.
- **Type consistency:** component prop names (`variant`, `tone`, `size`, `eyebrow`, `chip`) are used identically across tasks; `ToastProvider`/`useToast`, `KanbanBoard`/`KanbanColumn`/`KanbanCard`, `TableWrap`/`THead`/`TBody`/`TR`/`Th`/`Td` names match between definition and usage.
