<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Appraisal Management System Agent Guide

This project is an internal appraisal portal for Adarsh Shipping & Services. When adding pages, fixing flows, or building features, keep the app development-friendly first. Production hardening can be enabled later with explicit configuration and deployment changes.

## Product And Stack

- Framework: Next.js `16.2.4` App Router, React `19.2.4`, TypeScript.
- Styling: Tailwind CSS v4, shadcn/ui, Lucide icons, CSS variables in `src/app/globals.css`.
- Data: Prisma `7.7.0` with generated client output in `src/generated/prisma`.
- Auth/session: NextAuth v5 beta plus local session and security helpers under `src/lib`.
- Database target: PostgreSQL, currently suited for local/dev workflows and later production configuration.

## Design System Is Required

Always use the project design system when creating a new page, feature, component, state, or workflow.

- Read `Adarsh Shipping Design System/README.md` before designing new UI.
- Use existing tokens from `src/app/globals.css`: `primary`, `secondary`, `muted`, `border`, `card`, `brand-teal`, `brand-orange`, `brand-cyan`, and `brand-amber`.
- Prefer existing components in `src/components/ui` and app-level components in `src/components`.
- Use Lucide React icons from `lucide-react`; do not use emoji or random icon assets.
- Keep UI professional, warm, compact, and dashboard-oriented. This is an internal operations tool, not a marketing site.
- Match existing page layouts under `src/app/(app)` before inventing a new layout pattern.
- Support light and dark mode by relying on CSS variables, not hard-coded one-off colors.
- Use human-readable status labels in the UI. Do not expose raw enum names such as `PENDING_SELF` unless debugging.

## Feature Development Rules

- Build for development first: make the feature work locally, keep defaults safe, and avoid production-only assumptions.
- Keep production behavior behind environment variables or explicit configuration where needed.
- Do not silently introduce third-party services, paid APIs, background jobs, or production-only infrastructure.
- Prefer server components for data loading and server actions for mutations when that matches existing pages.
- Put shared business logic in `src/lib` when multiple routes need it.
- Keep client components focused on interaction, forms, charts, local state, and browser-only APIs.
- Reuse existing loading states, empty states, table patterns, forms, buttons, cards, badges, tabs, dialogs, and toasts.
- Add validation with `zod` or existing local validators before writing to the database.
- Show clear success, error, and empty states for user-facing flows.
- Keep role-based behavior explicit and consistent with `src/lib/rbac.ts`.

## Data And Prisma

- Do not edit files in `src/generated/prisma` by hand. Update Prisma schema and regenerate instead.
- Read `prisma/schema.prisma` and related helpers before changing models or relations.
- Use existing `src/lib/db.ts` access patterns.
- Preserve auditability for appraisal, salary, rating, notification, and security-sensitive changes.
- Use decimals carefully for salary and financial values; avoid lossy number conversions where precision matters.
- Be conservative with destructive scripts such as reset/import commands. Confirm intent before using them.

## Auth, Roles, And Security

- Treat employee records, salaries, ratings, passkeys, sessions, and notifications as sensitive.
- Check authentication and authorization in every new page, action, and API route.
- Use existing RBAC helpers and role enums instead of ad hoc string checks.
- Never log secrets, passwords, passkeys, reset tokens, personal identifiers, salary data, or full session payloads.
- Keep development shortcuts obvious and removable. Do not mix them into production paths without guards.

## Next.js 16 Notes

- Before adding or changing framework-level behavior, read the relevant docs in `node_modules/next/dist/docs/`.
- Respect App Router conventions already used in `src/app`.
- Use route groups such as `src/app/(app)` consistently.
- Keep server/client boundaries deliberate. Add `"use client"` only where browser interactivity is required.
- Be careful with caching, revalidation, redirects, cookies, headers, and server actions because Next.js behavior may differ from older versions.

## Styling Expectations

- Use Tailwind utility classes and project CSS variables instead of scattered custom CSS.
- Keep cards, tables, forms, and dashboards aligned with the Adarsh Shipping style.
- Prefer `rounded-xl`, `border border-border`, `bg-card`, `shadow-sm`, muted labels, and restrained hover states.
- Use `max-w-7xl` for dense admin/management pages and narrower widths for focused employee forms when appropriate.
- Use responsive layouts and verify mobile behavior for new pages.
- Do not create a landing page when the user asks for an app feature. Build the usable workflow directly.

## Implementation Checklist

When adding a feature:

1. Read the nearest existing route/component that solves a similar problem.
2. Read the relevant Next.js docs from `node_modules/next/dist/docs/` if touching framework APIs.
3. Check the design system and reuse local UI patterns.
4. Define data access, authorization, validation, success state, error state, empty state, and loading state.
5. Keep dev behavior working with current `.env` assumptions.
6. Run targeted checks such as `npm run lint`, `npm run build`, or a narrower command when practical.
7. Document any production follow-up, environment variable, migration, or deployment change that remains.

## Commands

- Start development server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Generate Prisma client: `npm run db:generate`
- Seed data: `npm run db:seed`
- Seed KPI data: `npm run db:seed:kpi`

Use reset/import scripts only when the user clearly asks for database reset or data import behavior.
