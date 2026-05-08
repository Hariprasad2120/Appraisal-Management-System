# AMS To BMS Integration Plan

## Scope

This document maps the current AMS implementation in this repository into a future BMS host application.

Important constraint:
- The current workspace contains the AMS source application.
- The target BMS skeleton referenced in the request is not present in this workspace.
- Because of that, this plan is based on real AMS source files here and identifies exactly what must be migrated, merged, or preserved when the BMS repository is available.

## 1. Current AMS Findings

### Platform shape
- Framework: Next.js `16.2.4` App Router
- UI: Tailwind CSS v4, shadcn/ui, Lucide, CSS variable theme tokens
- Auth: NextAuth v5 beta with custom passkey challenge flow and optional Google login
- Data: Prisma `7.7.0` targeting PostgreSQL
- Realtime: polling-based refresh via `/api/realtime/version`
- Layout shell: authenticated routes live under `src/app/(app)`

### Core shell and shared systems already implemented
- App shell and global layout: `src/components/app-shell.tsx`, `src/app/(app)/layout.tsx`
- Sidebar and role navigation: `src/components/sidebar-nav.tsx`, `src/components/sidebar-shell.tsx`, `src/components/mobile-nav.tsx`
- Auth/session: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- RBAC: `src/lib/rbac.ts`
- Workflow engine: `src/lib/workflow.ts`
- Design tokens and theme: `src/app/globals.css`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`
- Notifications: `Notification` model, `/api/notifications/*`, `src/app/(app)/notifications/*`
- Audit/security trail: `AuditLog`, `SecurityEvent`, `UserSession`
- Test/simulation controls: `src/app/(app)/admin/simulation/*`, `src/lib/system-date.ts`

### Key conclusion
- This repository is already a production-style AMS app with extra modules such as KPI, OT, tickets, sessions, passkeys, salary tools, and simulation controls.
- It is not a blank BMS shell.
- The future BMS integration should treat this repository as the AMS source-of-truth module.

## 2. Existing AMS Route Inventory

### Current authenticated route groups
- `admin/*`
- `employee/*`
- `reviewer/*`
- `management/*`
- `assignments`
- `history`
- `notifications`
- `tickets`
- `partner`

### Current AMS workflow routes
- Admin cycle/appraisal setup
  - `/admin/appraisals`
  - `/admin/cycles`
  - `/admin/cycles/[cycleId]`
  - `/admin/employees`
  - `/admin/employees/[id]/assign`
  - `/admin/extensions`
  - `/admin/criteria`
  - `/admin/slabs`
  - `/admin/simulation`
  - `/admin/notifications`
- Employee/appraisee
  - `/employee`
  - `/employee/self/[cycleId]`
- Reviewer
  - `/reviewer`
  - `/assignments`
  - `/reviewer/[cycleId]`
  - `/reviewer/[cycleId]/availability`
  - `/reviewer/[cycleId]/rate`
  - `/reviewer/[cycleId]/schedule`
  - `/reviewer/mom/[cycleId]`
- Management
  - `/management`
  - `/management/decide/[cycleId]`
  - `/management/vote/[cycleId]`
  - `/management/mom/[cycleId]`
  - `/management/slabs`
  - `/management/salary`
  - `/management/arrears`
  - `/management/reschedule`
- Shared history and support
  - `/history`
  - `/notifications`
  - `/tickets`

### Proposed BMS route namespace
- `/ams/dashboard`
- `/ams/cycles`
- `/ams/employees`
- `/ams/forms`
- `/ams/self-assessment/[cycleId]`
- `/ams/reviewer-assignment`
- `/ams/reviewer-rating/[cycleId]`
- `/ams/hr-review/[cycleId]`
- `/ams/management-review/[cycleId]`
- `/ams/final-decision/[cycleId]`
- `/ams/reports`
- `/ams/settings`

### Source to target route mapping

| Current AMS route | Future BMS route |
| --- | --- |
| `/admin` | `/ams/dashboard?view=admin` |
| `/reviewer` | `/ams/dashboard?view=reviewer` |
| `/employee` | `/ams/dashboard?view=employee` |
| `/management` | `/ams/dashboard?view=management` |
| `/admin/cycles` | `/ams/cycles` |
| `/admin/cycles/[cycleId]` | `/ams/cycles/[cycleId]` |
| `/admin/employees` | `/ams/employees` |
| `/admin/employees/[id]/assign` | `/ams/reviewer-assignment/[id]` |
| `/employee/self/[cycleId]` | `/ams/self-assessment/[cycleId]` |
| `/reviewer/[cycleId]/availability` | `/ams/reviewer-assignment/[cycleId]/availability` |
| `/reviewer/[cycleId]/rate` | `/ams/reviewer-rating/[cycleId]` |
| `/reviewer/[cycleId]/schedule` | `/ams/hr-review/[cycleId]/schedule` |
| `/management/decide/[cycleId]` | `/ams/final-decision/[cycleId]` |
| `/management/vote/[cycleId]` | `/ams/management-review/[cycleId]/vote` |
| `/management/mom/[cycleId]` | `/ams/management-review/[cycleId]/mom` |
| `/admin/criteria` | `/ams/settings/criteria` |
| `/admin/slabs` | `/ams/settings/salary-slabs` |
| `/admin/extensions` | `/ams/settings/extensions` |
| `/admin/simulation` | `/ams/settings/test-controls` |
| `/history` | `/ams/reports/history` |
| `/notifications` | `/ams/notifications` |

## 3. Database Model Mapping

### Existing AMS Prisma models already present here
- `User`
- `AppraisalCycle`
- `SelfAssessment`
- `CycleAssignment`
- `Rating`
- `AppraisalDecision`
- `IncrementSlab`
- `ExtensionRequest`
- `Notification`
- `AuditLog`
- `DateVote`
- `MOM`
- `RatingReview`
- `RatingDisagreement`
- `EmployeeSalary`
- `SalaryRevision`
- `SystemSetting`
- `CriteriaOverride`
- `SecurityEvent`
- `UserSession`

### Requested BMS entities mapped to current schema

| Requested entity | Current source model |
| --- | --- |
| `AppraisalCycle` | `AppraisalCycle` |
| `AppraisalAssignment` | `CycleAssignment` |
| `AppraisalForm` | `SelfAssessment.answers` plus `CRITERIA_CATEGORIES` and supplementary sections from `src/lib/criteria.ts` |
| `SelfAssessment` | `SelfAssessment` |
| `ReviewerRating` | `Rating` |
| `ReviewerComment` | `Rating.comments`, `Rating.postComment`, `RatingReview.justification` |
| `ManagementReview` | `AppraisalDecision.managementScores`, `managementComment`, `claimedById`, `claimedAt` |
| `FinalDecision` | `AppraisalDecision` |
| `SalarySlab` | `IncrementSlab` |
| `KPI` | `KpiDepartment`, `KpiTemplate`, `KpiTemplateItem`, `KpiReview`, `KpiReviewItem`, `KpiCriterion`, `KpiTask`, `KpiTaskEvent` |
| `AppraisalQuestion` | `CRITERIA_CATEGORIES`, `SUPPLEMENTARY_SECTIONS`, `CriteriaOverride` |
| `AppraisalStatus` | `CycleStatus` enum on `AppraisalCycle` |
| `MeetingSchedule` | `tentativeDate1`, `tentativeDate2`, `scheduledDate`, `DateVote`, `MeetingReschedule` |
| `ExtensionRequest` | `ExtensionRequest` |
| `Notification` | `Notification` |
| `AuditLog` | `AuditLog` |

### BMS merge rules
- Do not create a second employee table.
- Reuse BMS `User` or `Employee` as the canonical identity record.
- Preserve the AMS reporting chain semantics currently expressed via `User.reportingManagerId`.
- Preserve salary relations if BMS already has payroll tables.
- If BMS already has notifications, map AMS notification `type`, `link`, `persistent`, `critical`, `important`, `urgent`, `acknowledged`, and `dismissed`.
- If BMS already has audit logs, add an `module = 'AMS'` discriminator instead of creating a second audit table.

## 4. Workflow Rules That Must Not Change

### Lifecycle
1. Admin creates cycle and reviewer assignments.
2. Reviewers set availability.
3. Self-assessment opens only after all reviewers are `AVAILABLE`.
4. Employee can submit and re-submit until `editableUntil`.
5. When self window closes, self-assessment locks and rating deadline is set to 3 business days later.
6. Reviewers submit ratings only if assigned and available.
7. Management review opens only after all available reviewers submit and the rating deadline has passed.
8. A management user must claim the appraisal before entering final management ratings.
9. Claim lock prevents another management user from taking over, except Admin override.
10. Final decision writes `AppraisalDecision`, resolves slab, stores increment amount, and moves cycle to `DECIDED` or `DATE_VOTING`.
11. HR confirms final scheduled date from management tentative dates.
12. MOM and arrear workflow drive operational closure.

### State engine
- State computation is centralized in `src/lib/workflow.ts`.
- Current statuses:
  - `PENDING_SELF`
  - `SELF_SUBMITTED`
  - `AWAITING_AVAILABILITY`
  - `RATING_IN_PROGRESS`
  - `RATINGS_COMPLETE`
  - `MANAGEMENT_REVIEW`
  - `DATE_VOTING`
  - `SCHEDULED`
  - `DECIDED`
  - `CLOSED`

### Access/privacy rules already implemented
- Reviewers cannot rate unless assigned.
- Reviewers cannot see salary slabs in reviewer rating flow.
- Salary slab pages are explicitly restricted to Admin and Management.
- Self-assessment edits stop after `editableUntil`.
- Management review stays blocked until reviewer window conditions are met.
- Management claim locking is enforced through `claimedById` and `claimedAt`.

## 5. Calculation Rules To Preserve

### Current scoring sources
- Appraisal criteria and max points: `src/lib/criteria.ts`
- Workflow and window rules: `src/lib/workflow.ts`
- Slab defaults and slab matrix: `src/lib/slabs.ts`
- Salary tier and grade logic: `src/lib/criteria.ts`

### Critical calculation behavior
- Reviewer rating is normalized as:
  - `(sum of role-visible category scores / role max points) * 100`
- Role-specific criteria exclusions exist for HR and Management.
- Grade lookup uses floor semantics in `getGrade`.
- Slab lookup uses floor semantics in management decision flow:
  - `Math.floor(finalRating)`
  - example: `60.5` is treated as `60` for slab selection
- Salary tier selection uses monthly gross:
  - `<= 15000`
  - `15001 - 30000`
  - `> 30000`
- Final increment amount is currently:
  - `Math.round((grossAnnum * hikePercent) / 100)`

### Migration caution
- If BMS stores money as integer paise/cents or as decimal fields with different precision, keep the current appraisal formulas but adapt storage carefully to avoid lossy conversions.

## 6. Notification Mapping

### Notification types already present in workflows
- `ALL_REVIEWERS_AVAILABLE`
- `SELF_ASSESSMENT_SUBMITTED`
- `REVIEW_WINDOW_OPEN`
- `RATING_SUBMITTED`
- `ALL_RATINGS_COMPLETE`
- `RATINGS_COMPLETE`
- `MANAGEMENT_CLAIMED`
- `APPRAISAL_DECIDED`
- `APPRAISAL_SCHEDULED`
- `TENTATIVE_DATES_SET`
- `EXTENSION_APPROVED`
- `RATING_OVERDUE`
- `APPRAISAL_MONTH_DUE`
- `MEETING_DAY`
- login/session activity notifications

### Trigger sources
- Self submit: `src/app/(app)/employee/self/[cycleId]/actions.ts`
- Reviewer submit: `src/app/(app)/reviewer/[cycleId]/rate/actions.ts`
- Status transition notifications: `src/lib/workflow.ts`
- Deadline cron: `src/app/api/cron/process-deadlines/route.ts`
- Management claim/final decision/scheduling: `src/app/(app)/management/decide/[cycleId]/actions.ts`
- Simulation/time-travel meeting notifications: `src/app/(app)/admin/simulation/actions.ts`

### BMS integration rule
- Reuse the BMS notification center if it already supports audience targeting, urgency, acknowledgement, dismissal, and deep links.
- Preserve deep links but rewrite them to `/ams/*`.

## 7. API And Server Action Mapping

### REST APIs to preserve
- `/api/auth/[...nextauth]`
- `/api/session/active`
- `/api/session/end`
- `/api/session/heartbeat`
- `/api/session/settings`
- `/api/session/timeout-warning`
- `/api/notifications/persistent`
- `/api/notifications/dismiss`
- `/api/notifications/acknowledge`
- `/api/notifications/admin`
- `/api/notifications/retrigger`
- `/api/cron/process-deadlines`

### Server actions to preserve
- Employee self-assessment actions
- Reviewer rating actions
- Reviewer availability actions
- Reviewer extension request actions
- Rating disagreement and rating review actions
- Management claim, final decision, tentative date, and scheduled date actions
- Admin employee assignment actions
- Admin simulation/time-travel actions
- MOM actions
- Arrear and reschedule actions

### BMS recommendation
- Prefer keeping AMS mutations as server actions inside an `src/modules/ams` package and expose BMS pages as thin wrappers around that module.
- Keep cron behavior behind the BMS scheduler abstraction, but preserve the same event semantics.

## 8. Component Mapping

### Shell and navigation
- Reuse BMS global shell instead of duplicating:
  - sidebar
  - header
  - mobile nav
  - theme toggle
  - notification tray

### AMS UI pieces that should become module-scoped
- cycle tables
- assignment forms
- self-assessment form
- reviewer rating form
- extension request form
- decision form
- claim panel
- tentative date form
- MOM editors
- salary slab matrix
- simulation panel

### Recommended target structure
```text
src/
  modules/
    ams/
      actions/
      components/
      data/
      lib/
      pages/
      permissions/
      routes/
      validation/
```

## 9. Permission Matrix

| Role | Access |
| --- | --- |
| Admin | Full AMS settings, cycles, employees, assignments, reports, simulation, slabs, notifications |
| Employee/Appraisee | Own dashboard, own self-assessment, own status/history, own notifications |
| TL | Assigned reviewer ratings, team KPI work, no salary slab visibility |
| Manager | Assigned reviewer ratings, no salary slab visibility |
| HR | Reviewer flow, schedule confirmation, extension handling, HR MOM access |
| Management | Claim appraisal, final review, final decision, salary slab visibility, meeting decision workflow |
| Partner | Read-only aggregate visibility where explicitly allowed |

### Required BMS enforcement
- Route guards
- server action guards
- query-level filtering
- UI-level hiding for salary-sensitive fields

## 10. Recommended Migration Order

1. Import AMS shared types, validators, enums, and workflow helpers into a dedicated BMS `ams` module package.
2. Merge schema models into BMS schema without duplicating `User` or employee entities.
3. Build an AMS adapter over the existing BMS auth/session object so AMS code can read canonical user id, role, and secondary role.
4. Mount `/ams/*` routes inside the existing BMS shell.
5. Reconnect all AMS notification writes to the BMS notification system.
6. Migrate server actions and route guards.
7. Rebuild route links from current AMS paths to `/ams/*`.
8. Run data migration for employees, cycles, ratings, decisions, slabs, notifications, and audit records.
9. Run workflow validation using seeded test cycles.
10. Only after validation, deprecate the legacy AMS standalone routes.

## 11. File And Folder Changes Needed In BMS

### New folders expected in BMS
```text
src/app/(app)/ams/
src/modules/ams/
src/modules/ams/components/
src/modules/ams/actions/
src/modules/ams/lib/
src/modules/ams/validation/
```

### Existing BMS files likely to change
- sidebar/nav config
- app route registration
- auth role mapping
- Prisma schema
- notification service
- audit service
- middleware or route guard helpers
- report/export registry

## 12. Testing Checklist

### Routing and shell
- `/ams/*` routes render inside the BMS layout
- sidebar highlights correctly
- mobile navigation works
- dark/light theme matches the rest of BMS

### Workflow
- reviewer assignment opens self-assessment only after all reviewers are available
- self-assessment locks after deadline
- reviewer rating rejects unassigned reviewers
- management review stays blocked until conditions are met
- claim lock prevents concurrent management editing
- final decision stores correct rating, slab, and increment

### Privacy
- reviewers cannot see slab matrix or salary amounts
- employee sees only own data
- admin and management-only salary views stay restricted

### Notifications
- relevant users receive only relevant AMS events
- links point to `/ams/*`
- persistent and critical flags still behave correctly

### Data
- no duplicate users/employees
- historic cycles resolve to existing employees
- salary links and revision history remain intact
- audit trail still contains actor, before, after, and timestamp

### Test utilities
- demo autofill is test-only
- system date override is test-only
- deadline shifting is test-only

## 13. Implementation Status In This Repository

Completed in this session:
- Analyzed the current AMS structure, routing, auth, RBAC, schema, workflow, calculations, notifications, and simulation controls.
- Produced this migration-ready integration map tied to the actual source code in this repository.

Not completed in this session:
- Direct code integration into the new BMS shell.
- Prisma merge into the BMS schema.
- `/ams/*` route creation in the BMS app.

Reason:
- The target BMS repository/skeleton is not present in the current workspace, so implementing the integration directly here would risk breaking the standalone AMS source instead of correctly merging it into the real BMS host.
