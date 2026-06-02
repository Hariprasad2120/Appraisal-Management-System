# Appraisal Management System — Complete Project Handoff

**Company:** Adarsh Shipping & Services  
**Project:** Internal HR Appraisal + KPI Portal  
**Date of document:** 2026-05-06  
**Current branch:** `main`  
**Last commits this session:** KPI calc fix (Phase 1) + Ownership page (Phase 2) — uncommitted, working tree dirty  

---

## Session Update - 2026-05-06 - Phase 11 Audit Trail and Rating Explanation

**Completed this session:**
- Added explicit KPI task audit event types: `POINTS_CALCULATED` and `ADMIN_OVERRIDE`.
- Added migration `prisma/migrations/20260506110000_add_kpi_audit_event_types/migration.sql`.
- Added shared audit/rating helpers in `src/lib/kpi-audit.ts`.
  - Produces human-readable rating explanations for turnaround, due-date, recurring weekly, manual, and hybrid rules.
  - Produces human-readable points explanations.
  - Converts raw task event names into UI labels.
  - Keeps internal rule JSON hidden from UI.
- Added shared UI component `src/components/kpi-task-timeline.tsx`.
  - Shows event timeline with actor, role, timestamp, and safe detail text.
  - Does not expose internal metadata JSON.
- Employee KPI actions now track timer started, task resumed, completed submission, partial completion, and pause request.
- TL KPI actions now track task assigned, pause approval, pause rejection, TL pause, reopen, close, rating calculated, and points calculated.
- TL close now stores a readable `KpiTask.ratingExplanation`.
- Admin KPI page now shows task audit timelines and rating explanations for selected employee/month.
- Admin can override a KPI task rating with required reason.
  - Override stores `ADMIN_OVERRIDE`.
  - Points are recalculated and a `POINTS_CALCULATED` event is recorded.
- TL KPI page now shows timelines on Active, Pending Review, Reopened/Paused, and Monthly Ratings task views.
- Employee KPI page now shows task timelines under each assigned task.
- Management KPI page now shows finalized task timelines and rating explanations in KPI reports.

**Verification:**
- `npm run db:generate` passed.
- `npx prisma migrate deploy` passed and applied `20260506110000_add_kpi_audit_event_types`.
- `npm run lint` passed with 27 existing warnings.
- `npm run build` passed.

**Important remaining gap:**
- The audit timeline is now visible to Admin, TL, Management, and Employee. A distinct role-specific Manager KPI page is still not built; Manager visibility currently depends on existing management/reviewer routing.
- Existing tasks created before Phase 11 only have whatever events existed at the time; the timeline is not backfilled for historical missing events.

---

## Session Update - 2026-05-06 - Accounts KPI Phases 7 and 8

**Completed this session:**
- Phase 7 seed/config added for Accounts criterion `Statutory Compliance`.
  - Stored in `prisma/seed-kpi.ts` as `KpiCriterion` data.
  - `ruleType`: `DUE_DATE`.
  - `ruleConfig` captures file/proof submission, employee remarks, TL review close/reopen, TL review delay exclusion, partial-completion multiplier `0.5`, original/final rating storage intent, due-month reporting, and working-days-by-default day counting with Admin setting key `kpi.accounts.statutoryCompliance.dayCountMode`.
  - Rating config: at least 5 days early = 5, on due date = 4, each late day deducts 1, minimum = 1.
- Phase 8 seed/config added for Accounts criterion `Financial Reports`.
  - Stored in `prisma/seed-kpi.ts` as `KpiCriterion` data.
  - `ruleType`: `RECURRING_WEEKLY_DUE_DATE`.
  - `ruleConfig` captures weekly auto-open Monday, due Friday before office closing, office closing from `WorkingCalendar.workEndTime`, employee/group assignment mode, dev-safe generation trigger (`GENERATE_ON_KPI_PAGE_LOAD_OR_ADMIN_ACTION`), and production cron gate env `KPI_WEEKLY_TASK_CRON_ENABLED`.
  - Rating config: Friday before office close = 5, next working day = 4, each working day after deducts 1, minimum = 1.
- Accounts KPI criterion weights are now seeded as:
  - Invoice Turnaround Time: 40
  - Statutory Compliance: 35
  - Financial Reports: 25
  - Total: 100
- Ran `npm run db:seed:kpi`; database result:
  - Updated criterion: Invoice Turnaround Time
  - Created criterion: Statutory Compliance
  - Created criterion: Financial Reports

**Verification:**
- `npm run build` passed.
- `npm run lint` passed with 27 existing warnings.
- `npm run db:seed:kpi` passed.

**Important remaining gap:**
- Phase 7 and Phase 8 are complete as seed/config data. The current pure rule engine has basic `DUE_DATE` and `RECURRING_WEEKLY_DUE_DATE` support, but full working-day late counting and Financial Reports weekly task auto-generation still need implementation in app logic. Do not add paid background services; keep production cron behavior behind explicit env/config.

---

## Session Update - 2026-05-06 - Phase 9 Employee KPI Page

**Completed this session:**
- Revamped the employee KPI area on `src/app/(app)/employee/page.tsx` to use `KpiTask` records instead of the older `KpiReviewItem` completion-status dropdown.
- Added summary cards for:
  - Current month KPI score
  - Average rating
  - Completed tasks
  - Pending TL review
  - Reopened tasks
  - Paused tasks
- Added an active tasks table with:
  - Task name
  - KPI criterion
  - Assigned date
  - Due date
  - Timer status
  - Current elapsed working time
  - Human-readable status
  - Actions
- Employee task actions now exposed from the table:
  - Start/Resume
  - Completed
  - Partially Completed
  - Pause Request
  - Proof upload field
  - Remarks field
  - Rating explanation after TL closes the task
- Human-readable task status labels are used:
  - Assigned
  - In Progress
  - Waiting for TL Review
  - Reopened
  - Paused
  - Partially Completed
  - Closed
- If a task is reopened, the latest TL reopen reason is displayed prominently.
- Employee KPI actions in `src/app/(app)/employee/kpi-actions.ts` now enforce:
  - Completed requires proof when `requiresFileUpload` is true.
  - Partial completion requires a reason.
  - Pause request requires a reason.
  - Employees still cannot set ratings manually.
  - Closed tasks cannot be edited through employee actions.
- TL task creation in `src/app/(app)/reviewer/kpi/actions.ts` now inherits `requiresFileUpload` from criterion `ruleConfig.requiresFileUpload`.

**Verification:**
- `npm run build` passed.
- `npm run lint` passed with 27 existing warnings.

**Important remaining gap:**
- The proof upload field currently stores a file link/path in `KpiTask.fileUrl`; binary file upload/storage is not implemented. Add local/dev-safe upload storage later if actual file attachments are required.

## 1. Current Project Architecture

```
Next.js 16.2.4 App Router (React 19, TypeScript)
├── Server Components for data loading (all page.tsx files)
├── Server Actions for mutations (all actions.ts files)
├── Client Components only where browser interaction required
├── Prisma 7.7.0 → PostgreSQL (Neon serverless via @prisma/adapter-pg)
├── NextAuth v5 beta (JWT strategy, custom passkey + optional Google OAuth)
├── Tailwind CSS v4 + shadcn/ui + Lucide icons
└── Realtime: polling /api/realtime/version every 10s
```

**Routing strategy:** App Router route groups:
- `src/app/(app)/` — all authenticated pages
- `src/app/api/` — REST API routes
- `src/app/login/` — unauthenticated login flow
- `src/app/page.tsx` — root redirect based on role

---

## 2. Folder Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── admin/
│   │   │   ├── appraisals/       — Appraisal initiation and tracking
│   │   │   ├── arrears/          — Arrear management
│   │   │   ├── criteria/         — Appraisal criteria questions (editor)
│   │   │   ├── cycles/           — Cycle listing and detail
│   │   │   ├── data-tools/       — Bulk import/export utilities
│   │   │   ├── employees/        — Employee CRUD + assign cycles
│   │   │   ├── extensions/       — Extension request management
│   │   │   ├── kpi/              — Department KPI templates + scores
│   │   │   ├── mom/              — Minutes of Meeting (admin view)
│   │   │   ├── notifications/    — Notification center
│   │   │   ├── ownership/        — *** NEW (Phase 2) TL/Manager ownership
│   │   │   ├── passkeys/         — Passkey reset management
│   │   │   ├── salary-revisions/ — Salary revision history
│   │   │   ├── salary-sheet/     — Full salary sheet view
│   │   │   ├── sessions/         — Session monitor
│   │   │   ├── simulation/       — Dev simulation mode
│   │   │   └── slabs/            — Increment slabs configuration
│   │   ├── employee/             — Employee dashboard + self-assessment
│   │   ├── history/              — Appraisal history
│   │   ├── management/           — Management dashboard + decisions
│   │   ├── notifications/        — Notification panel
│   │   ├── partner/              — Partner view
│   │   ├── reviewer/             — Reviewer/TL/Manager/HR dashboard
│   │   │   └── kpi/              — TL KPI task assignment + rating
│   │   └── tickets/              — Support tickets
│   ├── api/
│   │   ├── auth/[...nextauth]/   — NextAuth handler
│   │   ├── cron/process-deadlines/ — Deadline processing cron endpoint
│   │   ├── logo/                 — Dynamic logo serving
│   │   ├── notifications/        — Notification read/dismiss/acknowledge APIs
│   │   ├── realtime/version/     — Realtime polling version endpoint
│   │   └── session/              — Session heartbeat/end/settings
│   ├── login/                    — Login page (passkey flow)
│   └── page.tsx                  — Root redirect
├── components/
│   ├── ui/                       — shadcn/ui primitives (button, card, badge…)
│   ├── app-shell.tsx             — Main layout wrapper (sidebar + header)
│   ├── app-header.tsx            — Top header
│   ├── sidebar-shell.tsx         — Desktop sidebar container
│   ├── sidebar-nav.tsx           — Role-based navigation links *** MODIFIED Phase 2
│   ├── mobile-nav.tsx            — Mobile hamburger nav
│   ├── inactivity-guard.tsx      — Session timeout UI + auto-signout
│   ├── realtime-refresh.tsx      — Polling-based realtime refresh
│   ├── persistent-popup.tsx      — Critical notification popup
│   ├── contextual-tips.tsx       — Role-aware workflow tips
│   ├── motion-div.tsx            — FadeIn/StaggerList/StaggerItem wrappers
│   ├── skeletons.tsx             — Loading skeleton components
│   └── theme-provider.tsx        — next-themes dark/light provider
├── lib/
│   ├── auth.ts                   — NextAuth config (passkey + Google)
│   ├── db.ts                     — Prisma singleton client
│   ├── rbac.ts                   — Role constants, canAccess, assertRole
│   ├── workflow.ts               — Appraisal cycle state machine
│   ├── kpi.ts                    — *** MODIFIED Phase 1: new calc functions
│   ├── criteria.ts               — Appraisal criteria categories/questions
│   ├── criteria-overrides.ts     — DB-backed criteria override helpers
│   ├── appraisal-eligibility.ts  — Anniversary-based eligibility logic
│   ├── arrears.ts                — Arrear calculation logic
│   ├── business-days.ts          — Working day calculations
│   ├── email.ts                  — Resend email integration + templates
│   ├── slabs.ts                  — Increment slab helpers
│   ├── system-date.ts            — Simulation-aware "now" date getter
│   └── utils.ts                  — cn(), toTitleCase(), misc helpers
└── generated/
    └── prisma/                   — Auto-generated Prisma client (DO NOT EDIT)
```

---

## 3. Database Schema

**Full schema at:** `prisma/schema.prisma`

### Core models:
| Model | Purpose |
|-------|---------|
| `User` | All users; `role` + optional `secondaryRole`; `reportingManagerId` for TL→Employee, Manager→TL chain |
| `KpiDepartment` | KPI department tree (parent/child for divisions) |
| `KpiTemplate` | Per-department KPI template with version |
| `KpiTemplateItem` | Template criteria (CRITERION) and tasks (TASK), nested via `parentItemId` |
| `KpiReview` | Monthly KPI review per employee |
| `KpiReviewItem` | Review items cloned from template; stores rating, `weightedAchievement` (now = criterion points) |
| `AppraisalCycle` | One cycle per employee per appraisal event |
| `SelfAssessment` | Employee self-assessment answers + state |
| `CycleAssignment` | Reviewer assignments per cycle |
| `Rating` | Reviewer scores per cycle |
| `AppraisalDecision` | Management final decision (rating, increment slab, amount) |
| `SystemSetting` | Admin key/value config store |
| `Notification` | Per-user notification records |
| `UserSession` | Active session tracking |
| `SecurityEvent` | Login attempt + session audit trail |
| `AuditLog` | General action audit trail |
| `Arrear` | Late-meeting arrear computation |
| `MeetingReschedule` | Meeting rescheduling records |
| `RatingDisagreement` | Reviewer self-evaluation of accuracy |
| `RatingReview` | Post-comment revised scores |
| `ExtensionRequest` | Reviewer extension requests |
| `MOM` | Minutes of Meeting (role-scoped) |
| `IncrementSlab` | Grade-based hike percent bands |
| `Ticket` / `TicketComment` | Support ticket system |
| `Arrear` | Salary arrear from late meeting |
| `CriteriaOverride` | Admin override for appraisal criteria questions |
| `PasswordResetToken` | Password reset tokens |
| `PasskeyResetRequest` | Admin-approved passkey reset flow |
| `LoginChallenge` | Challenge-token based login (passkey + Google) |
| `MessageRetriggerLog` | Notification retrigger audit |
| `SalaryRevision` | Salary revision history |
| `EmployeeSalary` | Current salary breakdown per employee |

### Schema changes made this session:
**None** — no Prisma schema migrations were needed for Phase 1 or Phase 2. All changes were in application logic and UI only.

`weightedAchievement Float` on `KpiReviewItem` now semantically stores **criterion points** (not weighted achievement %) — same DB column, different business meaning. Old finalized reviews will show wrong values until recalculated.

---

## 4. APIs Created or Modified

### API Routes (`src/app/api/`):
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/realtime/version` | GET | Returns max timestamp across key tables; client polls every 10s |
| `/api/session/heartbeat` | POST | Updates session `lastSeenAt` |
| `/api/session/end` | POST | Marks session as ended (LOGGED_OUT or TIMED_OUT) |
| `/api/session/active` | GET | Returns active session count for admin monitor |
| `/api/session/settings` | GET | Returns session timeout minutes setting |
| `/api/session/timeout-warning` | POST | Records timeout warning event |
| `/api/notifications/persistent` | GET | Fetches critical persistent notifications |
| `/api/notifications/dismiss` | POST | Marks notification dismissed |
| `/api/notifications/acknowledge` | POST | Marks notification acknowledged |
| `/api/notifications/admin` | GET | Admin-level notification fetch |
| `/api/notifications/retrigger` | POST | Re-sends urgent notification |
| `/api/cron/process-deadlines` | POST | Process deadline events (lock self-assessments, notify reviewers, handle overdue) |
| `/api/logo` | GET | Serves company logo |

### Server Actions modified this session:
| File | Change |
|------|--------|
| `src/app/(app)/admin/kpi/actions.ts` | `persistDraftScores`: now computes `weightedAchievement` as criterion points; `recalculateReview`: sums points directly; removed `calculateWeightedAchievement`/`calculateMonthlyPointScore` imports |
| `src/app/(app)/reviewer/kpi/actions.ts` | `rateKpiTaskAction`: computes criterion points; `recalculateReview`: sums points directly |

### New Server Actions:
| File | Actions |
|------|---------|
| `src/app/(app)/admin/ownership/actions.ts` | `assignEmployeesToTlAction`, `unassignEmployeeFromTlAction`, `assignTlsToManagerAction`, `unassignTlFromManagerAction` |

---

## 5. Authentication Flow

1. User visits `/login`
2. Enters email → server creates `LoginChallenge` (tokenHash stored, 15min TTL)
3. Challenge token sent back to client
4. User enters 4- or 6-digit passkey
5. Client POSTs `{challengeToken, passkey}` to NextAuth Credentials provider
6. Server: validates challenge, bcrypt-compares passkey, closes stale sessions, creates `UserSession`, fires `SecurityEvent` and `Notification` records
7. JWT token issued with `{id, role, secondaryRole, sessionToken}`
8. All pages call `auth()` — throws 401 if no session
9. Google OAuth: optional, requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars; `googleLoginAllowed: true` on user record
10. Passkey reset flow: employee requests → Admin approves → temp bypass for new passkey setup

**Session lifetime:** Controlled by `SESSION_TIMEOUT_MINUTES` in `SystemSetting`. Default 10 minutes. `InactivityGuard` enforces client-side; heartbeat keeps server-side session alive.

---

## 6. Roles and Permissions Logic

**Primary roles:** `ADMIN`, `MANAGEMENT`, `MANAGER`, `HR`, `TL`, `EMPLOYEE`, `REVIEWER`, `PARTNER`

**Secondary role:** Any user can have one secondary role (e.g., HR can also be TL). Both are checked throughout.

**Role homes:**
```
ADMIN → /admin
MANAGEMENT → /management
MANAGER, HR, TL, REVIEWER → /reviewer
EMPLOYEE → /employee
PARTNER → /partner
```

**Key rules (`src/lib/rbac.ts`):**
- `canBeAppraised(role)`: excludes MANAGEMENT and PARTNER
- `isReviewer(role)`: HR, TL, MANAGER, REVIEWER
- `isAdmin(role, secondaryRole)`: checks both
- `canAccessPath()`: path-prefix based guard (server-side enforced; middleware redirects)
- `assertRole()`: throws if role not in allowed list

**Ownership hierarchy (via `reportingManagerId`):**
```
Manager → TL → Employee (all via User.reportingManagerId)
```

**KPI-specific RBAC:**
- Admin: creates templates, criteria, reviews, manages departments
- TL: approves/rates tasks for employees where `employee.reportingManagerId = TL.id`
- Manager: views only (currently; full KPI page coming Phase 3+)
- Employee: views own KPI and updates task completion status

---

## 7. KPI System Architecture

### Current state (post Phases 1 + 2):

**Data flow:**
```
KpiDepartment (tree: dept → division)
    └── KpiTemplate (1 active per dept)
         └── KpiTemplateItem (CRITERION → TASK tree)
              └── KpiReview (per employee per month)
                   └── KpiReviewItem (cloned from template items)
```

**Points formula (fixed in Phase 1):**
```
ratingMultiplier(r):
  r ≤ 4 → r / 4
  r > 4 → 1 + (r - 4) × 0.1

criterionPoints(weightage%, rating, monthlyBase=20000):
  = monthlyBase × (weightage/100) × ratingMultiplier(rating)

monthlyScore = Σ criterionPoints across all assigned tasks
totalAchievementPercent = monthlyScore / monthlyBase × 100
```

**Verification:**
- Rating 1, 100% weight → 5000 pts ✓
- Rating 4, 100% weight → 20000 pts ✓
- Rating 5, 100% weight → 22000 pts ✓

**Key setting:** `kpi.monthlyTarget` in `SystemSetting` (default 20000). `kpi.annualTarget` = 240000. `kpi.ratingScale` is legacy (kept for display `achievementPercent` only; no longer drives point calculation).

**KPI pages:**
| Route | Role | Purpose |
|-------|------|---------|
| `/admin/kpi` | Admin | Departments, templates, monthly scores, reports |
| `/admin/ownership` | Admin | TL/Manager ownership assignment (**NEW**) |
| `/reviewer/kpi` | TL | Approve/assign/rate tasks for own employees |
| `/management/kpi` | Management | Annual leaderboard + finalized scores |
| `/employee` (section) | Employee | View own KPI records and update task status |

**Performance categories:**
- ≥25000: Outstanding Performer
- ≥22000: High Performer
- ≥20000: Good Performer
- ≥16000: Average Performer
- ≥12000: Minimum Performer
- <12000: Poor Performer

---

## 8. Appraisal Workflow Architecture

**State machine** (`src/lib/workflow.ts` — `computeCycleStatus()`):

```
AWAITING_AVAILABILITY
  → (all reviewers AVAILABLE) → PENDING_SELF
  → (self submitted) → SELF_SUBMITTED
  → (edit window closed + rating window open) → RATING_IN_PROGRESS
  → (all ratings done + rating deadline passed) → MANAGEMENT_REVIEW
  → (management claims + sets tentative dates) → DATE_VOTING
  → (HR confirms date) → SCHEDULED
  → (management finalizes decision) → DECIDED
  → (MOM recorded + arrear resolved) → CLOSED
```

**Triggers:**
- `syncCycleStatus(cycleId)`: called from server actions after mutations; fires notifications on state transitions
- Cron `/api/cron/process-deadlines`: locks expired self-assessments, sets rating deadlines, notifies overdue reviewers

**Key business rules:**
- Self-assessment window = 3 business days from reviewers confirming available
- Rating deadline = 3 business days after self-assessment edit window closes
- Arrear = triggered if meeting > 7 days after self-assessment submitted
- Arrear amount = `arrearDays × (finalAmount / 365)`
- `computeCycleStatus` is deterministic and pure (no side effects) — `syncCycleStatus` is the effectful version

---

## 9. Notification System Logic

**Types:**
- `read: false` — unread inbox notifications
- `persistent: true` — shown in sidebar/header count
- `critical: true` — triggers persistent popup overlay
- `important: true` — admin can retrigger
- `urgent: true` — re-triggered copy; stays until acknowledged
- `dismissed: true` — soft-deleted from inbox
- `acknowledged: true` — user explicitly dismissed critical notification

**Client polling:**
- `/api/notifications/persistent` — polled every 30s by `PersistentPopup`
- `/api/realtime/version` — polled every 10s by `RealtimeRefresh` (triggers router.refresh() on new version)

**Notification triggers:**
- Login: always creates critical+persistent login activity notification
- `AWAITING_AVAILABILITY → PENDING_SELF`: notifies appraisee + admins
- `→ MANAGEMENT_REVIEW`: notifies management (actionable), appraisee, reviewers, admins
- `APPRAISAL_MONTH_DUE`: cron fires when anniversary month arrives + no active cycle
- `REVIEW_WINDOW_OPEN`: cron fires when self-assessment edit window closes
- `RATING_OVERDUE`: cron fires when rating deadline passed without rating

---

## 10. Reviewer Dashboard

**Location:** `src/app/(app)/reviewer/`

**Current state:** Functional but un-revamped. Shows:
- All assigned cycles per reviewer
- Cycle stage badge (computed by `getCycleStageInfo()`)
- Actions: set availability, rate, view MOM, schedule

**KPI for TL (`/reviewer/kpi`):**
- Phase 10/11 current state: tabbed TL KPI operations screen with Assign Tasks, Active Tasks, Pending Review, Reopened / Paused, and Monthly Ratings. Task audit timelines, rating explanations, points explanations, and proof/timer details are visible without exposing internal rule JSON.
- Shows employees reporting to logged-in TL
- Per employee: criteria → tasks table
- TL can approve/disapprove task, assign to employee, rate 1–5
- Points recalculate immediately via `rateKpiTaskAction`

**Phase 10/11 note:** The original planned tabbed revamp is now built. The older legacy task table notes in this handoff section are retained for historical context only.

---

## 11. KPI Templates and Assignments Progress

**Seeded templates:** `prisma/seed-kpi.ts` — run with `npm run db:seed:kpi`

**Departments with templates:**
- Accounts (8 criteria)
- Administration (9 criteria)
- Freight Forwarding (9 criteria)
- Custom Clearance (9 criteria)
- HR (10 criteria)

**Template weightage:** Criteria have no individual weight; tasks under criteria carry weights that must sum to 100% (enforced at draft creation time).

**Current assignment flow:**
1. Admin creates KPI review draft from active template (`createKpiReviewDraftAction`)
2. TL approves/assigns tasks to employee in `/reviewer/kpi`
3. TL rates tasks 1–5; points auto-calculated
4. Admin finalizes review

**Planned but not yet built (Phase 3+):**
- Separate criteria management with ruleType/ruleConfig
- Task creation by TL under approved criteria
- Rule engine (TURNAROUND_TIME, DUE_DATE, RECURRING_WEEKLY_DUE_DATE, MANUAL, HYBRID)
- Working-hours timer, pause/resume, file upload
- Accounts-specific rules as seed/config data

---

## 12. All Completed Features

### Core Appraisal System:
- [x] Role-based routing and access control
- [x] Challenge-token passkey login flow
- [x] Google OAuth (optional)
- [x] Employee profile with all HR fields
- [x] Appraisal cycle creation and lifecycle
- [x] Self-assessment with editable window + lock
- [x] Reviewer assignment (HR/TL/Manager per cycle)
- [x] Reviewer availability confirmation
- [x] Reviewer rating submission (criteria-based scores)
- [x] Rating deadline enforcement (3 business days)
- [x] Post-comment reviewer self-evaluation (agree/overrate/underrate)
- [x] Revised scores per criterion
- [x] Management decision (claim cycle, set salary, choose slab, note)
- [x] Tentative date setting by management
- [x] Date voting by reviewers
- [x] HR schedule confirmation
- [x] Meeting rescheduling
- [x] Minutes of Meeting (MOM) for management + HR
- [x] MOM visibility control per role
- [x] Arrear calculation and approval flow
- [x] Extension requests with admin approval

### KPI System:
- [x] KPI department tree (parent/child)
- [x] KPI templates per department
- [x] Template items (CRITERION + TASK hierarchy)
- [x] Employee KPI department assignment
- [x] Monthly review draft creation (from template)
- [x] Copy previous month's setup
- [x] TL task approval/assignment/rating
- [x] Admin score entry and finalization
- [x] Employee task status updates
- [x] Annual leaderboard
- [x] **[Phase 1 THIS SESSION]** Fixed points calculation formula
- [x] **[Phase 2 THIS SESSION]** Ownership page (TL + Manager + Dept/Division mapping)

### Infrastructure:
- [x] Realtime refresh (polling-based, 10s interval)
- [x] Session timeout with warning UI (configurable minutes)
- [x] Session heartbeat
- [x] Session monitor for admin
- [x] Security event audit trail
- [x] Login activity notifications
- [x] Persistent notification popup
- [x] Notification read/dismiss/acknowledge
- [x] Admin notification retrigger
- [x] Cron endpoint for deadline processing
- [x] Email via Resend (appraisal due, review window open)
- [x] Simulation mode (dev: adjusts deadlines for testing)
- [x] Salary sheet view + calculator
- [x] Salary revision history
- [x] Increment slabs configuration
- [x] Criteria question override (admin-editable)
- [x] Support ticket system with comments
- [x] Bulk employee data import
- [x] Dark/light mode via next-themes + CSS variables
- [x] Mobile responsive sidebar + hamburger nav
- [x] Contextual workflow tips per role
- [x] Appraisal calendar visualization
- [x] History view (completed cycles)

---

## 13. All Pending Features

### KPI Revamp (Phases 3–12 from original prompt):

**Phase 3 — KPI Data Model Separation:**
- [ ] Separate KPI criteria as standalone admin-created entities (ruleType, ruleConfig, weightage, effectiveFrom/To)
- [ ] Criteria approval flow (Admin creates → TL approves per dept)
- [ ] Separate task creation by TL under approved criteria
- [ ] `monthlyBasePoints` configurable per template
- [ ] Criteria weightage validation (must total 100%)
- [ ] Historical assignment preservation

**Phase 4 — Rule Engine:**
- [ ] `calculateTaskRating(task, ruleConfig, workingCalendar)`
- [ ] `calculateDailyCriteriaRating(tasks)`
- [ ] `calculateMonthlyCriteriaRating(dailyRatings)`
- [ ] Rule types: TURNAROUND_TIME, DUE_DATE, RECURRING_WEEKLY_DUE_DATE, MANUAL, HYBRID

**Phase 5 — Working Hours + Timer:**
- [ ] Admin-configurable working hours (start/end time, breaks, holidays, timezone, grace)
- [ ] Timer model: counts only valid working minutes
- [ ] Task events: ASSIGNED, STARTED, PAUSE_REQUESTED, PAUSE_APPROVED, etc.
- [ ] Timer freeze during TL review; resume from previous elapsed time on reopen

**Phase 6 — Accounts KPI Rule 1 (Invoice Turnaround Time):**
- [ ] Rating bands: 0–12h=5, >12–24h=4, >24–48h=3, >48–72h=2, >72h=1
- [ ] Grace period (30 min configurable)
- [ ] Partial completion halves rating
- [ ] Seed/config data (not hard-coded)

**Phase 7 — Accounts KPI Rule 2 (Statutory Compliance):**
- [ ] DUE_DATE rule type
- [ ] Rating: ≥5 days early=5, on day=4, each day late -1, min=1
- [ ] Partial completion × 0.5

**Phase 8 — Accounts KPI Rule 3 (Financial Reports):**
- [ ] RECURRING_WEEKLY_DUE_DATE rule type
- [ ] Auto-generate weekly tasks on load (dev) or cron (prod)
- [ ] Rating: Friday before close=5, Saturday=4, each working day after -1

**Phase 9 — Employee KPI Page Revamp:**
- [ ] Summary cards (score, avg rating, completed, pending review, reopened, paused)
- [ ] Active tasks table with timer status, elapsed time, status
- [ ] Complete/Partial/Pause request actions with file upload + remarks
- [ ] Human-readable statuses (no raw enum names)
- [ ] View rating explanation after close

**Phase 10 — TL KPI Page Revamp:**
- [x] Tabs: Assign Tasks / Active Tasks / Pending Review / Reopened+Paused / Monthly Ratings
- [x] Bulk task creation
- [x] Timer breakdown view
- [x] Monthly ratings: employee-wise, criteria-wise, daily average, task count, final points, explanation

**Phase 11 — Audit Trail + Rating Explanation:**
- [x] Full event timeline per KPI task
- [x] Human-readable rating explanation stored and displayed
- [x] Visible to Admin, TL, Management, Employee
- [x] Admin override event tracked when Admin overrides a task rating

**Phase 12 — Final acceptance verification**

### Other pending:
- [ ] Manager KPI page (currently management-only; Manager role has no dedicated KPI view)
- [ ] Reviewer dashboard full revamp (tabbed interface)
- [ ] Email for KPI notifications (task assigned, task rated, review finalized)
- [ ] Production cron setup (GitHub Actions or Vercel cron for process-deadlines)

---

## 14. Known Bugs

1. **KPI points on old finalized reviews** — Pre-Phase 1 finalized reviews stored `weightedAchievement` as weighted achievement % (not points). `monthlyPointScore` on those records is wrong. No migration written. Old records need recalculation if accuracy matters.

2. **Unused `bulkAssignEmployeesToTlAction`** — Still exported from `src/app/(app)/admin/kpi/actions.ts` but no page references it. Can be deleted.

3. **`ratingScale` unused warning** — `/admin/kpi/page.tsx` line ~162 has `ratingScale` assigned but unused (pre-existing lint warning). Safe to remove.

4. **`KPI_RATING_SCALE_SETTING`** — Still imported in admin KPI page but `ratingScale` is unused after Phase 1. The legacy `achievementPercent` field is still set (for display only) using `achievementForRating()` which uses the old scale. This is cosmetic only; it does not affect points.

5. **Manager role KPI gap** — Users with `role=MANAGER` land at `/reviewer` (per `ROLE_HOME`) but the reviewer KPI page only allows `TL` role. Managers see no KPI interface.

6. **Department/Division mapping in Ownership** — The table shows managers/TLs based on `kpiDepartmentId` match. If a TL is assigned to a KPI dept but reports to a Manager with a different dept, the column may be empty. This is a display approximation.

7. **No Prisma migration** — The project uses `@prisma/adapter-pg` but no migration files exist (`prisma/migrations/` is absent). Schema changes require manual DB operations or `prisma db push`. **Critical for production.**

---

## 15. UI/UX Decisions Already Finalized

1. **Design system:** Adarsh Shipping Design System. Read `Adarsh Shipping Design System/README.md` before any new UI.
2. **Color tokens:** CSS variables in `src/app/globals.css`. Always use `primary`, `secondary`, `muted`, `border`, `card`, `brand-teal`, `brand-orange`, `brand-cyan`, `brand-amber`.
3. **Icon library:** Lucide React only. No emoji. No other icon libs.
4. **Typography:** `ds-h1`, `ds-body`, `ds-small`, `ds-stat`, `ds-label` CSS classes for consistent hierarchy.
5. **Cards:** `rounded-xl border border-border bg-card shadow-sm` — never raw `div` with manual colors.
6. **Badges:** Use `bg-primary/10 text-primary` or status-specific amber/green/red patterns.
7. **Tables:** `min-w-[Xpx]` with `overflow-x-auto` wrapper. Header: `bg-muted/40 text-xs text-muted-foreground`.
8. **Max width:** `max-w-7xl` for admin/management pages. Narrower for focused forms.
9. **Human-readable statuses:** Never show raw enum names (e.g., `PENDING_SELF` → "Self-Assessment Pending").
10. **Tabs navigation:** `Link`-based with `?tab=X` search param. Active state: `bg-primary text-primary-foreground`.
11. **Motion:** Use `FadeIn`, `StaggerList`, `StaggerItem` from `src/components/motion-div.tsx` — not raw `motion.div`.
12. **Forms:** Server actions (not client-side fetch). Zod validation in action before DB write.
13. **Loading states:** `loading.tsx` files per route. Use `skeletons.tsx` components.
14. **Dark mode:** Always supported via CSS variables. No hard-coded colors.

---

## 16. Components That Should NOT Be Modified

| Component | Reason |
|-----------|--------|
| `src/generated/prisma/` | Auto-generated — run `npm run db:generate` after schema changes |
| `src/lib/auth.ts` | Login security — any change requires full testing |
| `src/components/inactivity-guard.tsx` | Session security — timing logic is carefully tuned |
| `src/lib/workflow.ts` — `computeCycleStatus()` | State machine — side-effect-free; change breaks all cycle views |
| `src/components/realtime-refresh.tsx` | Realtime infra — poll logic is intentional |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth handler — do not add middleware or transforms |
| `src/components/persistent-popup.tsx` | Critical notification display — security-facing |

---

## 17. State Management Approach

**No client-side global state store** (no Zustand, Redux, Context for data).

Pattern:
- **Server components** fetch all data on render
- **Server actions** mutate + call `revalidatePath()` + `refresh()` to trigger re-render
- **Client components** hold only local UI state (form inputs, open/closed, hover)
- **URL search params** for tab/filter state (no client state for tabs)
- **`useTransition`** in `RealtimeRefresh` for smooth router.refresh()

---

## 18. Realtime Update Implementation

**File:** `src/components/realtime-refresh.tsx`

**Mechanism:**
1. `RealtimeRefresh` mounts in `AppShell` (always present)
2. Polls `/api/realtime/version` every 10 seconds (only when tab is visible)
3. Version = max Unix timestamp across key DB tables
4. If version > last known → calls `router.refresh()` in a `useTransition`
5. Also triggers on `window.focus` event (instant refresh on tab switch)
6. Also listens for custom `ams:realtime-hint` event (can be fired by any client component after a mutation for instant refresh hint)

**Not WebSocket/SSE** — intentional choice to avoid infrastructure complexity.

---

## 19. Session Timeout Implementation

**File:** `src/components/inactivity-guard.tsx`

**Config:** `SESSION_TIMEOUT_MINUTES` in `SystemSetting` table (default 10 min; max 480 min)

**Flow:**
1. `InactivityGuard` tracks mouse/keyboard/touch/scroll events
2. Checks idle time every 1 second
3. Warning shown at `min(2min, 20% of timeout)` before expiry
4. Warning: modal overlay + toast with countdown + "Stay Logged In" / "Log Out Now" buttons
5. "Stay Logged In" → `POST /api/session/heartbeat` + resets idle timer
6. On timeout → `POST /api/session/end` → `signOut({ callbackUrl: '/login?reason=timeout' })`
7. Heartbeat every 60 seconds (independent of activity tracker) keeps server session alive

---

## 20. Performance Optimizations Already Applied

1. **Prisma singleton** — global instance in dev to avoid connection leak on hot reload
2. **Neon serverless adapter** — `@prisma/adapter-pg` with connection string; no connection pool management needed
3. **`unstable_cache`** — used in `AppShell` for simulation-active check (30s TTL) and session timeout (5s TTL)
4. **Selective `include`/`select`** — all Prisma queries use explicit `select` to avoid over-fetching
5. **Parallel Promise.all** — all independent DB queries are parallelized in data-loading functions
6. **`revalidatePath` + `refresh()`** — mutations invalidate only relevant paths
7. **Realtime polling only when visible** — `document.visibilityState` check prevents background tab waste
8. **`useTransition` for router.refresh()** — prevents UI jank during realtime updates
9. **Route groups** — `(app)` group shares layout; avoids re-rendering layout on page changes
10. **Server components by default** — only interactive parts marked `"use client"`

---

## 21. Important Dependencies / Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.4 | Framework — **NOT standard Next.js 14/15; read docs in node_modules** |
| `react` | 19.2.4 | UI |
| `prisma` / `@prisma/client` | 7.7.0 | ORM |
| `@prisma/adapter-pg` | 7.7.0 | PostgreSQL adapter |
| `@neondatabase/serverless` | 1.1.0 | Neon DB connection |
| `next-auth` | 5.0.0-beta.31 | Auth — **beta version; APIs differ from stable v4** |
| `tailwindcss` | 4.x | CSS — **v4; config format differs from v3** |
| `motion` | 12.x | Animations (was Framer Motion; renamed) |
| `zod` | 4.3.6 | Validation |
| `bcryptjs` | 3.0.3 | Passkey hashing |
| `resend` | 6.12.2 | Email delivery |
| `recharts` | 3.8.1 | Charts |
| `sonner` | 2.0.7 | Toast notifications |
| `lucide-react` | 1.8.0 | Icons |
| `date-fns` | 4.1.0 | Date utilities |
| `react-hook-form` | 7.73.1 | Form state (used in some client forms) |
| `xlsx` | 0.18.5 | Excel export/import |
| `tsx` | 4.21.0 | TypeScript script runner (for seed scripts) |

---

## 22. Environment Variables Required

```bash
# Required
DATABASE_URL=postgresql://...          # Neon or any PostgreSQL connection string
AUTH_SECRET=...                        # NextAuth secret (min 32 chars random)

# Conditionally required
NEXTAUTH_URL=https://your-domain.com   # Required in some deployment setups
AUTH_URL=https://your-domain.com       # Alternative to NEXTAUTH_URL

# Optional
GOOGLE_CLIENT_ID=...                   # Enable Google OAuth login
GOOGLE_CLIENT_SECRET=...               # Enable Google OAuth login
APP_URL=https://your-domain.com        # Used in email link generation (falls back to NEXTAUTH_URL)
RESEND_API_KEY=...                     # Email sending via Resend (silent fail if absent)

# Development only
# No .env.example exists — create .env.local with above vars
```

---

## 23. Deployment Considerations for Vercel

1. **Environment variables:** Set all above in Vercel project settings
2. **Database:** Use Neon PostgreSQL (already using `@neondatabase/serverless`). Connection string with `?sslmode=require`
3. **`NEXTAUTH_URL` / `AUTH_URL`:** The `src/lib/auth.ts` strips localhost values in production automatically. Still set `AUTH_URL=https://your-domain.com`
4. **`AUTH_SECRET`:** Generate with `openssl rand -base64 32`
5. **Prisma client:** `postinstall` script runs `prisma generate` automatically on Vercel builds
6. **Schema migrations:** No migration files exist. Run `prisma db push` from local against production DB before first deploy, then on each schema change. **Risk: destructive changes without review.** Consider adding `prisma migrate dev` workflow.
7. **Cron job:** `/api/cron/process-deadlines` needs to be called regularly. Options:
   - Vercel Cron (add `vercel.json` with cron config)
   - GitHub Actions scheduled workflow
   - External cron service
   - **NOT yet configured for production**
8. **Logo:** Served from `/api/logo` — ensure logo file is in the expected location
9. **Email (Resend):** Silent fail if `RESEND_API_KEY` absent. Set for production notifications to work.
10. **`trustHost: true`** in NextAuth config — required for Vercel deployment

**`vercel.json` to add for cron (example):**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-deadlines",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 24. Current Blockers / Issues

1. **No Prisma migrations** — Schema changes require `prisma db push` directly against DB. No rollback path. Must add `prisma migrate` workflow before production use.

2. **Old KPI scores incorrect** — Any `KpiReview` finalized before Phase 1 fix has wrong `monthlyPointScore` (old formula). No migration/recalculation script written.

3. **Phases 3–12 not started** — Core new KPI features (rule engine, timer, task events, audit trail) are not built. The data model does not yet support them (no ruleType/ruleConfig on criteria, no timer/event tables).

4. **Manager KPI gap** — `role=MANAGER` users have no KPI UI (reviewer/kpi page is TL-only).

5. **No email for KPI events** — Task assignment, rating, and review finalization send no emails.

6. **`KPI.txt` deleted** — Was in git as a file, now deleted (per git diff). Contents unknown; may have had product notes. Check if needed.

7. **`scripts/create-import-template.ts` deleted** — Was a utility script; removed in this branch. May affect data import workflows.

---

## 25. Phase-Wise Implementation Progress

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Fix KPI points calculation | ✅ Complete |
| Phase 2 | Move TL ownership out of KPI page | ✅ Complete |
| Phase 3 | KPI data model separation (criteria/tasks/templates) | ❌ Not started |
| Phase 4 | Flexible KPI rule engine | ❌ Not started |
| Phase 5 | Working hours, breaks, timer | ❌ Not started |
| Phase 6 | Accounts KPI Rule 1 (Invoice Turnaround Time) | ❌ Not started |
| Phase 7 | Accounts KPI Rule 2 (Statutory Compliance) | ❌ Not started |
| Phase 8 | Accounts KPI Rule 3 (Financial Reports) | ❌ Not started |
| Phase 9 | Employee KPI page revamp | ❌ Not started |
| Phase 10 | TL KPI page revamp | ❌ Not started |
| Phase 11 | Audit trail + rating explanation | ❌ Not started |
| Phase 12 | Final acceptance checklist | ❌ Not started |

---

## CURRENT STATUS

**2026-05-06 continuation correction:** Phase 10 (TL KPI page revamp) and Phase 11 (audit trail + rating explanation) are complete. Any older phase table rows above that still say "Not started" are stale historical notes.

**Working:**
- All pre-existing appraisal features (cycles, ratings, MOM, decisions, salary, notifications, sessions, tickets)
- KPI system: departments, templates, manual scoring, reports
- **Phase 1:** Points formula correct (rating 1 = 5000, rating 4 = 20000, rating 5 = 22000)
- **Phase 2:** `/admin/ownership` page with TL Ownership, Manager Ownership, Dept/Division Mapping tabs; TL ownership removed from KPI page; "Ownership" nav item added

**Not working / not built:**
- KPI rule engine (TURNAROUND_TIME, DUE_DATE, etc.)
- Working-hours timer and task events
- Accounts-specific KPI rules as seed data
- Employee/TL KPI page revamp
- Audit trail for KPI tasks

**Lint:** 0 errors, 27 pre-existing warnings (none introduced this session)

**Uncommitted changes this session:**
- `src/lib/kpi.ts`
- `src/app/(app)/admin/kpi/actions.ts`
- `src/app/(app)/admin/kpi/page.tsx`
- `src/app/(app)/reviewer/kpi/actions.ts`
- `src/app/(app)/employee/page.tsx`
- `src/app/(app)/management/kpi/page.tsx`
- `src/components/sidebar-nav.tsx`
- `src/app/(app)/admin/ownership/page.tsx` (new)
- `src/app/(app)/admin/ownership/actions.ts` (new)
- `AGENTS.md`, `CLAUDE.md` (modified externally)

---

## NEXT STEPS

**Immediate (Phase 3 — KPI Data Model Separation):**

1. Add Prisma schema models:
   - `KpiCriterion` — Admin-created, has `ruleType`, `ruleConfig (Json)`, `weightage`, `departmentId`, `divisionId?`, `approvalStatus`, `createdByAdminId`, `approvedByTlId`, `effectiveFrom`, `effectiveTo`
   - `KpiTask` — TL-created under approved criteria, assigned to one employee, has `taskType` (ONE_TIME/DAILY/WEEKLY/MONTHLY/RECURRING/DUE_DATE), `assignedDate`, `dueDate`, `requiresFile`, `status`
   - `KpiTaskEvent` — Event log per task (ASSIGNED, STARTED, PAUSE_REQUESTED, etc.)
   - `KpiAssignment` — Links employee to template/criteria for a month
   - `WorkingCalendar` — Admin-configured working hours, breaks, holidays

2. Run `prisma db push` (or generate migration)

3. Build admin Criteria tab (create/edit criteria with ruleType + ruleConfig)

4. Build Criteria Approval tab (TL approves/rejects per dept)

5. Build Task Assignment tab (TL creates tasks under approved criteria)

6. Build rule engine functions in `src/lib/kpi-rules.ts`

---

## IMPORTANT WARNINGS

⚠️ **Next.js version:** This is `16.2.4` — NOT standard 14/15. APIs differ. Always read `node_modules/next/dist/docs/` before changing framework code.

⚠️ **NextAuth beta:** v5 beta APIs differ from stable v4. `auth()` is server-side. `useSession()` is client-side. Do not mix.

⚠️ **Tailwind v4:** Config format is different from v3. CSS variable approach is used throughout. No `tailwind.config.js`.

⚠️ **No DB migrations:** `prisma db push` is destructive without review. Create `prisma/migrations/` workflow before adding/removing columns in production.

⚠️ **Old KPI scores:** Any `KpiReview` record finalized before today has wrong `monthlyPointScore`. If users see old scores, they are from the broken formula. Recalculation script not yet written.

⚠️ **`weightedAchievement` semantic change:** This field now stores criterion **points** (not weighted achievement %). Any code that treated it as a percentage needs updating. The management KPI page label was updated; check any future UI that reads this field.

⚠️ **Design system is mandatory:** Every new page, component, and state must use the Adarsh Shipping design system. Read `Adarsh Shipping Design System/README.md` first.

⚠️ **Do not hard-code Accounts KPI rules:** Phases 6/7/8 rules must be stored as configurable seed/config data (`ruleConfig` JSON on criteria), not hard-coded in the calculation engine.

---

## Phase 3 Continuation Prompt

Use this in a new session to continue implementation:

---

```
You are continuing implementation of the Appraisal Management System for Adarsh Shipping & Services.
This is an internal HR portal built with Next.js 16.2.4, React 19, TypeScript, Tailwind CSS v4, Prisma 7.7.0, NextAuth v5 beta, PostgreSQL (Neon).

COMPLETED SO FAR:
- Phase 1: KPI points calculation fixed. Formula: criterionPoints = monthlyBasePoints × (weightage/100) × ratingMultiplier(rating). ratingMultiplier: rating ≤ 4 → rating/4; rating > 4 → 1 + (rating-4)×0.1. Functions added: calculateRatingMultiplier() and calculateCriterionPoints() in src/lib/kpi.ts. weightedAchievement field on KpiReviewItem now stores criterion points (not weighted achievement %). recalculateReview() updated in both admin/kpi/actions.ts and reviewer/kpi/actions.ts.
- Phase 2: /admin/ownership page created with 3 tabs (TL Ownership, Manager Ownership, Dept/Division Mapping). TL ownership removed from /admin/kpi page. "Ownership" nav item added to sidebar. New actions: assignEmployeesToTlAction, unassignEmployeeFromTlAction, assignTlsToManagerAction, unassignTlFromManagerAction in src/app/(app)/admin/ownership/actions.ts.

NEXT TASK — PHASE 3: KPI Data Model Separation

Required Prisma schema additions (add to prisma/schema.prisma then run npm run db:generate):

1. KpiCriterion model:
   - id, name, description
   - departmentId → KpiDepartment (required)
   - divisionId → KpiDepartment? (optional, for division-specific criteria)
   - weightage Float (must total 100% across criteria in same template scope)
   - ruleType: enum KpiRuleType (TURNAROUND_TIME, DUE_DATE, RECURRING_WEEKLY_DUE_DATE, MANUAL, HYBRID)
   - ruleConfig Json (stores rule-specific params)
   - status: enum (ACTIVE, INACTIVE)
   - approvalStatus: enum (PENDING, APPROVED, REJECTED) — TL approves for their dept
   - createdByAdminId → User
   - approvedByTlId → User?
   - approvedAt DateTime?
   - effectiveFrom DateTime?
   - effectiveTo DateTime?
   - createdAt, updatedAt

2. KpiTask model:
   - id, name, description
   - criterionId → KpiCriterion
   - reviewId → KpiReview (monthly scope)
   - assignedToId → User (employee)
   - assignedById → User (TL)
   - taskType: enum (ONE_TIME, DAILY, WEEKLY, MONTHLY, RECURRING, DUE_DATE_BASED)
   - assignedDate DateTime
   - dueDate DateTime?
   - requiresFileUpload Boolean default false
   - status: enum (ASSIGNED, IN_PROGRESS, WAITING_REVIEW, PAUSED, PARTIALLY_COMPLETED, CLOSED, REOPENED)
   - rating Float?
   - ratingExplanation String?
   - isPartialCompletion Boolean default false
   - systemRating Float? (before partial halving)
   - finalRating Float? (after partial halving)
   - fileUrl String?
   - employeeRemarks String?
   - tlRemarks String?
   - timerElapsedMinutes Int default 0 (working minutes elapsed, not counting pauses/reviews)
   - createdAt, updatedAt

3. KpiTaskEvent model:
   - id, taskId → KpiTask
   - actorId → User, actorRole String
   - eventType: enum (ASSIGNED, STARTED, PAUSE_REQUESTED, PAUSE_APPROVED, PAUSE_REJECTED, PAUSED_BY_TL, RESUMED, SUBMITTED, REOPENED, PARTIALLY_COMPLETED, CLOSED_BY_TL, RATING_CALCULATED)
   - oldStatus String?, newStatus String?
   - timestamp DateTime default now()
   - reason String?
   - metadata Json?

4. WorkingCalendar model (admin-configured):
   - id String @id @default("default") (singleton)
   - workStartTime String default "10:00"
   - workEndTime String default "17:30"
   - timezone String default "Asia/Kolkata"
   - graceMinutes Int default 30
   - workingDays Json (array of 0-6, default Mon-Sat)
   - breaks Json (array of {start, end} strings)
   - holidays Json (array of ISO date strings)
   - updatedAt, updatedById → User?

RULES FOR THIS SESSION:
- Read AGENTS.md and CLAUDE.md before writing any code
- Read the Adarsh Shipping Design System README before any UI work
- Do NOT hard-code Accounts KPI rules — they must be ruleConfig JSON on criteria
- Use src/lib/kpi.ts for all shared calculation logic
- Use server components for pages, server actions for mutations
- Maintain RBAC: Admin creates criteria, TL approves, TL creates tasks, Employee completes
- weightedAchievement on KpiReviewItem = criterion points (changed in Phase 1, not weighted %)
- Criteria weightage for a template/dept scope must total 100% — validate on save
- Run npm run lint after each phase, fix all errors before moving on
- Run npm run db:generate after schema changes

CURRENT FILE STATE:
- src/lib/kpi.ts: has calculateRatingMultiplier(), calculateCriterionPoints(), monthStart(), achievementForRating(), getKpiPerformanceCategory()
- prisma/schema.prisma: see the file for current models (KpiDepartment, KpiTemplate, KpiTemplateItem, KpiReview, KpiReviewItem, User with reportingManagerId)
- src/app/(app)/admin/kpi/: departments/templates/scores/reports tabs
- src/app/(app)/admin/ownership/: TL Ownership/Manager Ownership/Dept-Division Mapping tabs (NEW Phase 2)
- src/app/(app)/reviewer/kpi/: TL task approve/assign/rate page

PRIORITY ORDER if context runs out:
1. Prisma schema additions (models above) + db:generate
2. Admin Criteria tab (create/edit criteria with ruleType/ruleConfig/weightage)
3. Criteria Approval UI (TL approves/rejects per dept on reviewer/kpi page)
4. Task creation by TL under approved criteria
5. Rule engine functions in src/lib/kpi-rules.ts
6. Working hours admin configuration (WorkingCalendar)
7. Timer logic

The full 12-phase spec is in the original prompt (stored in conversation history). This continuation starts at Phase 3.
```

---
