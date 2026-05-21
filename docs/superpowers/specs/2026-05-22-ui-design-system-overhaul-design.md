# ReCruItAI — UI/UX Design System Overhaul

**Date:** 2026-05-22
**Status:** Approved design — ready for implementation planning
**Scope:** Visual redesign of every surface in `platform-web/`. No new product functionality (that is the separate backlog in Appendix A).

---

## 1. Problem

A recruiter evaluation found the product reads as a high-fidelity prototype with an inconsistent, "basic white-and-blue" look. The root cause is concrete: a warm theme is defined in `globals.css`, but pages bypass it — there are **732 raw Tailwind color uses** (`blue-`, `gray-`, `green-50`, `red-50`, etc.) across 31 files versus only **77 uses** of the theme tokens. Cards also vary in radius, padding, height, and text scale from page to page.

The result: no consistency, a cold blue/white palette the user explicitly rejected, and visible bugs (always-green nav, avatar overlap, table overflow, a typo).

## 2. Goal

Make every surface look **simple, modern, elegant, and consistent**, matching the warm, calm aesthetic of the reference image (warm neutral canvas, white cards, generous space, minimal accent color). Consistency must become *structural* — enforced by shared components — not a matter of per-page discipline.

This is a visual + layout-structure pass only. Making non-functional buttons work, building scheduling, true Kanban drag-and-drop, etc. is **out of scope** here and captured in Appendix A for later, incremental work.

## 3. Chosen Direction — "Warm + Sage"

Decided during brainstorming (option B of three):

- Warm sand gradient canvas, white cards — no flat white, no blue.
- A single refined **muted-sage** brand color for primary actions and active navigation.
- Color used sparingly; status meaning carried by small chips only.
- Fraunces serif reserved for page titles as a consistent brand element; Inter everywhere else.

## 4. Design Tokens (`platform-web/src/app/globals.css`)

All tokens replace the current `@theme` block. Every color below is intentional; **no raw Tailwind palette colors may be used in components or pages after this work.**

### 4.1 Color

```
/* Canvas */
--color-surface:        #EFE7DC   /* warm sand base */
--color-surface-deep:   #EBDBCC   /* gradient deep corner */
--color-surface-muted:  #E6DDD0   /* hover / inset fills */

/* Cards & ink */
--color-card:           #FFFFFF
--color-ink:            #1F1E1C   /* primary text */
--color-ink-2:          #57544E   /* secondary text */
--color-ink-3:          #908C82   /* meta / placeholder */
--color-border:         #E4DBCC   /* general border */
--color-border-card:    #ECE4D6   /* card border */

/* Sage accent — primary actions, active nav */
--color-accent:         #4F6B45
--color-accent-hover:   #445D3C
--color-accent-ink:     #F3F6EE   /* text on accent */
--color-accent-soft:    #E7EEE0   /* sage tint fill */
--color-accent-soft-ink:#46603E   /* text on accent-soft */

/* Status — soft fill + ink pairs, used in chips only */
--color-success / -soft / -soft-ink   #4F8A5B / #E7EEE0 / #46603E
--color-warning / -soft / -soft-ink   #9A7430 / #F6EEDC / #9A7430
--color-danger  / -soft / -soft-ink   #B5503F / #F2E3DE / #B5503F
--color-neutral / -soft / -soft-ink   #57544E / #EDE6D9 / #57544E   /* replaces all "info"/blue */
```

The app background is a fixed gradient: `linear-gradient(160deg, #F5F0E8 0%, #EFE7DC 52%, #EBDBCC 100%)`.

### 4.2 Radius

```
--radius-card:  16px   /* all cards & panels */
--radius-field: 12px   /* inputs, textareas, selects, dropdowns */
--radius-tile:  10px   /* small icon tiles inside cards */
--radius-pill:  999px  /* buttons, nav items, chips, badges, avatars, search */
```

### 4.3 Elevation

```
--shadow-card:  0 1px 2px rgba(31,30,28,.05), 0 1px 1px rgba(31,30,28,.03)
--shadow-pop:   0 8px 28px rgba(31,30,28,.12)   /* dropdowns, popovers, toasts */
```

One shadow level for cards. No multi-layer glow.

### 4.4 Type ramp

Fixed scale — nothing renders text outside it.

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Page title | Fraunces serif | 30px | 600 | every page H1 |
| Section / card title | Inter | 14px | 700 | |
| Metric value | Inter | 28px | 800 | KPI numbers |
| Eyebrow | Inter | 11px | 700 | uppercase, tracking .14em, ink-3 |
| Body | Inter | 13px | 500 | ink-2 |
| Meta | Inter | 11.5px | 500 | ink-3 |
| Button / nav | Inter | 12.5–13px | 700 | |

### 4.5 Card constants

- Padding: `20px` standard, `16px` compact.
- Border: `1px var(--color-border-card)`; shadow: `--shadow-card`.
- Cards in a row **stretch to equal height**.
- Standard in-card header: title (14/700) + optional subtitle (meta) + optional right-aligned action link (sage, 12px).

## 5. Component Library (`platform-web/src/components/`)

Existing primitives (`Badge`, `Banner`, `Button`, `Card`, `EmptyState`) are rewritten to the tokens; new ones added. Every page is rebuilt to consume **only** these — pages must not hand-roll card/badge/button markup.

| Component | Purpose |
|---|---|
| `Card` | Base card. Variants: `default`, `compact`, `flush` (no padding, for tables/lists). |
| `SectionCard` | `Card` with standard header (title + subtitle + action slot) and body. |
| `PageHeader` | Eyebrow + serif title + subtitle + right-side actions slot. Top of every page. |
| `StatCard` | KPI card: icon tile + metric + label + optional status chip. Fixed layout, equal height. |
| `Button` | Variants: `primary` (sage), `secondary` (outline), `ghost`, `danger`. Sizes `sm`/`md`. Pill radius. |
| `Badge` / `Chip` | Status pill. Tones: `success`, `warning`, `danger`, `neutral`, `accent`. |
| `Avatar` | Initials avatar, sizes `sm`/`md`/`lg`. Consistent — fixes Profile overlap. |
| `Table` | Themed table: header style, row dividers, hover, contained horizontal scroll, sticky first column; collapses to stacked cards on narrow widths. |
| `FilterChips` | Segmented filter row with per-chip counts. |
| `Tabs` | Themed tab strip (Settings, report sections). |
| `Banner` | Notice banner (e.g. the "read-only / Slice 2" banner), tones reuse status set. |
| `EmptyState` | Icon + title + description + optional action. |
| `Skeleton` | Loading placeholder blocks. |
| `Toast` + provider | Confirmation feedback (e.g. "Save Changes"). Lightweight context. |
| `Field` set | `Input`, `Textarea`, `Select`, `Label`, `FieldError` — themed form primitives with required-field markers. |
| `KanbanColumn` / `KanbanCard` | Pipeline lane + candidate card (visual only; drag-and-drop is backlog). |

`NavItem` stays in the dashboard layout; its active logic is fixed (see §7).

## 6. Surfaces in Scope (all of `platform-web/src/app`)

Every page is reskinned to the tokens and rebuilt on the component library. Listed with the specific work each needs.

### 6.1 Shell & shared

- **`(dashboard)/layout.tsx`** — gradient canvas; restyle sidebar (white/translucent, sage logo tile, sage active pill) and header (pill search, bell, avatar); **fix the always-active nav bug** (§7).
- **`app/layout.tsx`** — confirm Fraunces + Inter font wiring; apply gradient background.
- **`components/layout/Footer.tsx`** — retheme to tokens.

### 6.2 Recruiter dashboard pages

- **`dashboard/page.tsx`** — `PageHeader`; 4 equal-height `StatCard`s (fix label crowding); make the 5-step flow cards equal height; equalize the AI-fit-score vs. candidate-name hierarchy in the priority queue.
- **`dashboard/hiring-flow`** — retheme dark hero; fix the "Start a hiring run" CTA wrapping; equal-height step cards.
- **`dashboard/jobs`** — themed job cards; consistent salary/location hierarchy; themed `Banner`; `EmptyState`.
- **`dashboard/jobs/new`** — rebuild form on `Field` primitives; **fix "Comma shared" → "Comma separated"**; required-field markers; remove "Remote" placeholder-as-value.
- **`dashboard/jobs/[id]`** — retheme; consistent section cards.
- **`dashboard/pipeline`** — **restructure into horizontal Kanban lanes** (`KanbanColumn`s side-by-side, horizontal scroll) with `KanbanCard`s. No drag-and-drop yet.
- **`dashboard/candidates`** — rebuild on `Table` (contained scroll, sticky first column, stacked-card fallback); move the long AI-fit explanation out of the cell into a tooltip/expandable; add per-chip counts to `FilterChips`.
- **`dashboard/candidates/[id]`** and **`/scorecard`** — retheme to section cards + tokens.
- **`dashboard/interviews`** — retheme; consistent cards.
- **`dashboard/collaboration`** — retheme feedback queue cards.
- **`dashboard/communications`** — retheme template cards consistently.
- **`dashboard/sourcing`** — retheme 2×2 channel grid (already the strongest page — light touch).
- **`dashboard/automations`** — retheme rule cards.
- **`dashboard/analytics`** — retheme KPIs; **fix the Pipeline Conversion bars** to normalize against a single max (funnel), so widths read truthfully.
- **`dashboard/settings`** — themed `Tabs`; retheme enterprise-control cards; add a Save confirmation `Toast`.
- **`dashboard/notifications`** — retheme list.
- **`dashboard/profile`** — **fix the avatar/name overlap**; rebuild header; complete the cut-off Personal Information card; remove the empty cover gradient.

### 6.3 Public, auth, portal, interview

- **`app/page.tsx`** — marketing landing retheme to Warm + Sage.
- **`(auth)/login`** — retheme.
- **`(portal)/layout.tsx`**, **`portal/page.tsx`**, **`portal/reports/*`** (page, layout, resume, interview, career, skills) — retheme the candidate portal consistently.
- **`interview/[id]/page.tsx`** — retheme the interview runner.

## 7. Specific bug fixes (folded into the above)

- **Always-active nav:** in `NavItem`, the `/dashboard` root item currently matches every `/dashboard/*` route. Fix: exact match for the root (`pathname === "/dashboard"`); prefix match only for sub-routes.
- **Profile avatar overlap** → corrected `Avatar` + header layout.
- **"Comma shared" typo** → "Comma separated".
- **KPI label crowding** → fixed `StatCard` layout.
- **Candidates table overflow** → `Table` responsive behavior.
- **Pipeline not horizontal** → `KanbanColumn` lanes.
- **Analytics misleading bars** → single-max normalization.
- **Inconsistent CTA color** → all primary actions use sage `Button variant="primary"`.

## 8. States

Add across the app, using the new components:

- **Empty states** — `EmptyState` wherever a list/table/queue can be empty.
- **Loading** — `Skeleton` placeholders for data regions.
- **Error** — simple error panel pattern (reuses `EmptyState` styling, danger tone).
- **Confirmation** — `Toast` on save/apply actions.

## 9. Out of Scope

No behavioral/functional change: non-functional buttons stay non-functional, no new pages, no API or data wiring, no real drag-and-drop, no integrations. Those are Appendix A, tackled "one by one" after this pass.

## 10. Verification

- `npm run lint` and `npm run build` pass clean from `platform-web/`.
- Grep gate: **zero** raw `blue-/indigo-/sky-/slate-/gray-/cyan-` and zero `-50/-100` raw-palette status colors remain in `src/app` and `src/components`.
- Visual pass on every surface at desktop and narrow widths.
- Spot-check the deployed `https://recruitai-test.vercel.app` after deploy.

## 11. Risks

- **Regressions:** reskinning 26 surfaces risks dropping content/links. Mitigation — rebuild page-by-page, preserve every existing link/prop, diff-review each.
- **Scale:** large change set. Mitigation — token + component foundation lands first; pages then sweep in small batches.

---

## Appendix A — Feature Backlog (the "build one by one" list)

Distilled from the recruiter evaluation. **Not part of this redesign** — this is the prioritized roadmap to work through afterward. Grouped by area; tiered P0 (highest leverage) → P2.

### P0 — Core flow works end-to-end
1. Make navigation + primary actions functional on one full persona flow: post job → receive candidate → screen → schedule → offer.
2. Candidate detail page: timeline, resume preview, scorecards, comms history (so "Review" leads somewhere).
3. Interview **scheduling module**: calendar integration, self-scheduling links, panel coordination, time zones, Zoom/Meet/Teams creation, reschedule.
4. True Kanban with drag-and-drop on Pipeline (builds on §6.2 visual lanes).
5. Working email/templates system with two-way sync.
6. Global search + cmd+K command palette.

### P1 — Recruiter depth
7. Sourcing: Chrome extension, Boolean/X-ray search, enrichment, outreach sequences with reply detection.
8. Resume intake: bulk drag-and-drop, email-forwarding inbox, parsing preview/edit, duplicate-merge, LinkedIn import.
9. Communications: two-way inbox per candidate, SMS/WhatsApp, threads, scheduled sends, merge-tag preview, bounce/opt-out/GDPR.
10. Offer builder + approval chain + e-signature; reference-check workflow.
11. Collaboration: @mentions/inline comments, shared vs. private notes, mobile scorecards, debrief/calibration, Slack/Teams two-way.
12. Jobs: status filters/tabs, requisition approval, headcount/budget, hiring-team assignment, templates/cloning, structured must-have/nice-to-have skills, screening/knockout questions, salary bands.
13. Automations: editable thresholds, per-rule on/off, run history, dry-run, rule-creation UI.

### P2 — Scale, intelligence, compliance
14. Analytics depth: time-in-stage, source-of-hire vs. cost-per-hire, recruiter productivity, DEI/EEO funnel, decline-reason analytics, drill-downs, date-range picker, scheduled exports.
15. Compliance: consent capture, right-to-be-forgotten, anonymized review mode, EEO survey, audit-log viewer, AI bias/adverse-impact reporting (NYC LL144 / EU AI Act).
16. AI features: JD generation, interview-question generation, per-candidate "why this person" summary, AI reply drafts, sourcing suggestions, recruiter copilot chat.
17. Integrations: Google/Microsoft Calendar, Gmail/Outlook, Slack/Teams, Zoom/Meet, LinkedIn Recruiter, Greenhouse/Workday/BambooHR, DocuSign, Checkr/HireRight, Zapier/webhooks.
18. Candidate experience: candidate portal status tracking, document nudges, NPS.
19. Settings/admin: roles editor, SSO/SAML/SCIM, custom pipeline stages, custom candidate fields, email-signature management, career-site/branding.
20. Mobile/accessibility: responsive review across the app; mobile scorecard submission.
