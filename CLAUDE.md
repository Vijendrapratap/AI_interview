# ReCruItAI Claude Code Operating Rules

## Critical deployment context

- Production/test Vercel project deploys the Next.js app in `platform-web/`.
- The public URL is `https://recruitai-test.vercel.app`.
- The visible public surfaces users judge first are:
  - `platform-web/src/app/page.tsx`
  - `platform-web/src/app/(dashboard)/layout.tsx`
  - `platform-web/src/app/(dashboard)/dashboard/page.tsx`
  - `platform-web/src/components/layout/Footer.tsx`
- There is also a legacy React/Vite app in `frontend/`. Do not assume changes there affect the Vercel URL unless the Vercel root is intentionally changed.

## Git identity — do not break Vercel deploys

Vercel blocks deployments when commit emails cannot be matched to a GitHub account.

Before any commit, verify repo-local git identity is:

```bash
git config user.name "Vijendrapratap"
git config user.email "44225657+Vijendrapratap@users.noreply.github.com"
```

Never commit as:

```text
AI Bot <bot@example.com>
bot@example.com
```

If a commit was made with the wrong identity, fix it before pushing:

```bash
git config user.name "Vijendrapratap"
git config user.email "44225657+Vijendrapratap@users.noreply.github.com"
git commit --amend --reset-author --no-edit
git push --force-with-lease origin main
```

## Required workflow before pushing or deploying

From repo root:

```bash
git status --short --branch --untracked-files=all
```

For visible web app changes, run from `platform-web/`:

```bash
npm run lint
npm run build
```

Then commit from repo root and push:

```bash
git add <specific changed files>
git commit -m "type(scope): concise description"
git push origin main
```

If the user needs an immediate test link, deploy from the app root:

```bash
cd platform-web
vercel deploy --prod --yes --force --archive=tgz
```

Then verify:

```text
https://recruitai-test.vercel.app
https://recruitai-test.vercel.app/dashboard
```

## Product/UI direction

- Use the warm cream/lime/ink theme already defined in `platform-web/src/app/globals.css`.
- Avoid reverting visible pages to the older blue/gray theme.
- Keep recruiter-facing UX calm, premium, and decision-oriented.
- When asked for UI/UX changes, update the visible deployed app in `platform-web/`, not only docs or the legacy `frontend/` app.

## Safe development rules

- Do not overwrite user changes. Check `git status` first.
- Stage specific files, not broad `git add .`, unless the change set is intentionally reviewed.
- Do not commit `.env*`, Vercel output, build output, logs, or local scratch files.
- If Vercel shows old UI, first verify which folder is deployed and whether the visible files in `platform-web/` actually changed.
