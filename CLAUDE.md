# Claude Project Guide

Follow `AGENTS.md` as the source of truth for this repository.

Most important reminders:

- Use the Adarsh Shipping design system for every new page, component, feature, and user-facing state.
- Read `Adarsh Shipping Design System/README.md` before designing UI.
- Read the relevant Next.js docs in `node_modules/next/dist/docs/` before changing framework-level code. This project uses Next.js `16.2.4`, which may differ from older conventions.
- Build features so they work in development first. Keep production behavior behind explicit environment variables or deployment configuration.
- Reuse `src/components/ui`, app-level components in `src/components`, CSS variables in `src/app/globals.css`, and existing patterns under `src/app/(app)`.
- Keep auth, RBAC, validation, loading states, empty states, and error states in mind for every feature.
- Do not hand-edit `src/generated/prisma`; update Prisma schema and regenerate.
- Treat salaries, ratings, employee data, sessions, tokens, and passkeys as sensitive.

Useful commands:

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:generate`
- `npm run db:seed`
