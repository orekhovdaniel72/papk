<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: yuzotova-art

Resume + portfolio service for a 3D artist. Full spec in `docs/product-spec.md`,
plan in `docs/roadmap.md`. Read those first to understand the product.

## What we're building (one line)
One private media library → many independent resumes → each shared via an isolated,
optionally password/expiry-gated link, with realistic anti-download media protection.

## Stack
- **Next.js 16** (App Router, TypeScript) — version is newer than training data,
  ALWAYS verify APIs against `node_modules/next/dist/docs/` before coding.
- **Tailwind v4 + shadcn/ui** (base: radix, preset: nova → Lucide icons + Geist font).
  Add components with `npx shadcn@latest add <name> --yes`. Components live in
  `src/components/ui/`. Utility `cn()` in `src/lib/utils.ts`.
- **Supabase** (Postgres + Auth) — backend/DB. Owner-only auth.
- **Cloudflare R2** — private media storage, zero egress, signed URLs only.
- **Vercel** — hosting.

All chosen to stay on free tiers.

## Conventions
- `src/app/` routes (App Router), `src/components/` UI, `src/lib/` clients & utils.
- Secrets only in `.env.local` (gitignored). Keep `.env.local.example` updated.
- Media is NEVER public: served via short-lived signed URLs after token checks.
- Small, verifiable commits — one feature per commit.

## Relevant local Next docs (read before touching these areas)
- Auth → `01-app/02-guides/authentication.md`
- Video → `01-app/02-guides/videos.md`
- Data security → `01-app/02-guides/data-security.md`
- CSP → `01-app/02-guides/content-security-policy.md`
- Route handlers → `01-app/01-getting-started/15-route-handlers.md`
- Env vars → `01-app/02-guides/environment-variables.md`

## Commands
- Dev: `npm run dev` (Turbopack) · Build: `npm run build` · Lint: `npm run lint`

## Honest constraint
Screenshots / screen capture CANNOT be fully prevented on the web. We maximize
friction + use watermarks tied to the share link for traceability. Do not claim
otherwise to the user.
