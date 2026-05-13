# Modules-First Architecture

This repo now treats `src/modules/*` as the feature implementation layer.

## Rule
- Put feature pages, server actions, feature components, and feature-specific helpers in `src/modules/<feature>/...`.
- Keep `src/app` for Next.js routing files only:
  - `page.tsx`
  - `layout.tsx`
  - `loading.tsx`
  - `error.tsx`
  - `route.ts`
  - thin re-export or redirect wrappers

## Why
- Avoid duplicated implementations across `src/app`, `src/modules`, and workspace-specific routes.
- Keep role-based and workspace-aware routes pointing at one shared source of truth.
- Make future feature work predictable: route layer in `src/app`, product logic in `src/modules`.

## Migration Notes
- Prefer workspace-aware helper functions for internal HRMS links instead of hardcoding route families.
- When a route exists in multiple URL families, keep compatibility wrappers in `src/app` and move real implementation into `src/modules`.
