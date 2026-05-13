# SAAS_PLATFORM_CONVERSION_PLAN.md

## 1. Summary
- [ ] Convert the current single-company appraisal portal into a multi-tenant SaaS platform with four clear layers: platform, account/tenant, organization, and organization membership.
- [ ] Keep the existing appraisal, KPI, notification, MOM, arrear, OT, ticket, and session-monitoring functionality, but run it inside organization scope under a customer account.
- [ ] Treat the current uncommitted `multi_tenant_phase1` work as partial groundwork only; do not assume it is the final SaaS design.
- [ ] Make `/` a public landing page and move all current product dashboards behind authenticated SaaS route groups.
- [ ] Migrate existing Adarsh data into a first tenant account safely without deleting legacy records or breaking appraisal history.

## 2. Current System Understanding
- [x] Stack: Next.js `16.2.4` App Router, React `19.2.4`, TypeScript, Tailwind v4, Prisma `7.7.0`, NextAuth v5 beta.
- [x] Current public experience: `/` redirects authenticated users to role dashboards and unauthenticated users to `/login`; there is no public landing page, signup, pricing, request-demo, unauthorized, or org-selector flow.
- [x] Current auth flow: email + password step creates a login challenge, then a mandatory numeric passkey step completes sign-in; Google login is optional and gated by pre-approved users.
- [x] Current login is already lowercasing emails in server actions, but uniqueness is still tied to the single `User.email` field.
- [x] Current route tree is role-centric and legacy: `/admin`, `/management`, `/reviewer`, `/employee`, `/partner`, plus supporting pages under the same tree.
- [x] Current middleware is [`src/proxy.ts`](/abs/path/src/proxy.ts:1) and relies mainly on `User.role`, `secondaryRole`, `platformRole`, `ROLE_HOME`, and path-prefix checks.
- [x] Current role model is dual-state:
  `User.role` + `secondaryRole` still drive most routing and permissions.
  `PlatformRole`, `Organization`, `OrganizationUser`, `UserRoleAssignment`, `ReportingHierarchy`, `OrganizationModule`, and `OrganizationAccess` were recently added as partial org-scoping support.
- [x] Current seed is still single-company and hardcoded for Adarsh:
  `default-org`, slug `adarsh-shipping-and-services`, many `@adarshshipping.in` users, and branded copy in login/root/platform pages.
- [x] Current seed sets `hr@adarshshipping.in` as both site admin and `PLATFORM_SUPER_ADMIN`, which conflicts with the target model.
- [x] Current seed hashes a hardcoded `"password123"` value for all users, which violates the requested target security posture.
- [x] Current dashboards:
  `/admin` is the main organization admin/appraisal admin dashboard.
  `/management` is the management decision and salary dashboard.
  `/reviewer` is shared by HR, TL, manager, and reviewer-like users.
  `/employee` is the self-service dashboard.
  `/partner` is a separate legacy dashboard.
- [x] Current appraisal workflow is implemented in [`src/lib/workflow.ts`](/abs/path/src/lib/workflow.ts:1) and is still centered on reviewer availability -> self-assessment -> reviewer rating -> management review -> meeting -> MOM -> arrear closure.
- [x] Current KPI logic exists and is organization-scoped in schema, but still assumes one active org in session and one legacy dashboard tree.
- [x] Current notifications, MOM, arrears, security events, sessions, OT, salary revisions, tickets, and audit logs are mostly already tagged with `organizationId`.
- [x] Current schema already added `organizationId` to most tenant-owned business tables through the uncommitted `20260509170000_multi_tenant_phase1` migration.
- [x] Current schema still has no true tenant/account model, no plans table, no subscriptions table, no account dashboard, no account membership layer, no billing model, and no invite model.
- [x] Current module model is incomplete: `OrganizationModule` exists, but the app only meaningfully launches the appraisal module, while OT still lives inside the appraisal route tree instead of a separately enforced module boundary.
- [x] Current API authorization is inconsistent: many routes check only legacy roles plus `activeOrganizationId`, not explicit active membership, tenant ownership, or module entitlement.
- [x] Current hardcoded company references exist in seed data, default org constants, branding text (`Monolith Engine`, `Performance Management Platform`), default logo handling, and default route assumptions.
- [x] Current schema audit result:
  Business tables already carrying `organizationId`: users, appraisal cycles, self assessments, assignments, ratings, votes, MOM, appraisal decisions, salary tables, KPI tables, notifications, tickets, arrears, reschedules, session/security tables, OT tables, and settings.
  Missing SaaS layer tables: account/tenant, account membership, plans, subscriptions, invites, usage counters, demo/trial requests.

## 3. Problems With Current Architecture
- [ ] Legacy `User.role` and `secondaryRole` are still the real source of truth for most routing and authorization.
- [ ] Platform super admin is currently conflated with an Adarsh customer admin.
- [ ] There is no tenant/account boundary above organization.
- [ ] There is no account owner dashboard, billing page, plan enforcement, or organization-limit enforcement.
- [ ] There is no public SaaS acquisition flow for landing, registration, trial, or demo requests.
- [ ] There is no organization selector for users with multiple memberships.
- [ ] There is no invite-based onboarding for org users; current setup creates users directly.
- [ ] The current mandatory passkey flow is not aligned with the requested SaaS invite-and-set-password flow.
- [ ] Partial organization support exists, but it still defaults to `default-org` everywhere, so true tenant isolation is not yet complete.
- [ ] Module enablement is incomplete and not cleanly separated from route ownership.
- [ ] Seed data and branding are heavily Adarsh-specific.

## 4. Target SaaS Architecture
- [ ] Platform level:
  `PlatformUser` remains `User` with `platformRole = PLATFORM_SUPER_ADMIN`.
  Platform routes manage accounts, organizations, plans, subscriptions, modules, usage, support tools, and suspension.
- [ ] Tenant/account level:
  Add `Account`, `AccountMembership`, `Plan`, and `Subscription`.
  `Account` is the customer record and owns one or more organizations.
  `AccountMembership` carries `ACCOUNT_OWNER` for v1; keep room for future account admins/billing admins.
- [ ] Organization level:
  Keep `Organization` as the runtime boundary for appraisal/KPI/OT data.
  Add `accountId` to `Organization` and move `OrganizationAccess`/module access under the owning account model.
- [ ] Organization member level:
  Keep `OrganizationUser` and `UserRoleAssignment`, but make them the authoritative source for org authorization.
  Legacy `User.role` and `secondaryRole` stay only as transitional compatibility fields until all old routes are removed.
- [ ] Module level:
  Canonical SaaS modules in v1: `appraisal-management`, `kpi-management`.
  OT remains inside appraisal scope unless explicitly split into a third module in a later phase.
  Module checks happen server-side via account/org entitlements, not only sidebar visibility.
- [ ] Plan/subscription level:
  `Plan` defines max organizations, max employees, allowed modules, and feature flags.
  `Subscription` ties an account to a plan and drives enforcement.
  `Organization` count and active employee/member count are derived usage metrics, not hand-maintained counters.

## 5. Landing Page Plan
- [ ] Replace root route `/` with a public SaaS landing page for unsigned users.
- [ ] Sections:
  Hero, product overview, multi-organization explanation, Appraisal module, KPI module, role-based access, pricing, security/trust, FAQ, request-demo CTA, start-trial/register CTA, login CTA.
- [ ] Add public routes:
  `/`, `/login`, `/register`, `/pricing`, `/request-demo`.
- [ ] Keep the existing design system and dashboard tone, but make public pages product-led instead of internal-admin led.
- [ ] Show signed-in users a role redirect only after auth; do not expose admin dashboards on `/`.

## 6. Route Structure Plan
- [ ] Public routes:
  `/`, `/login`, `/register`, `/pricing`, `/request-demo`, `/activate-invite/[token]`, `/unauthorized`, `/no-organization-access`.
- [ ] Shared authenticated routes:
  `/select-organization`, `/role-redirect`, `/module-disabled`.
- [ ] Platform routes:
  `/platform-admin`, `/platform-admin/accounts`, `/platform-admin/organizations`, `/platform-admin/plans`, `/platform-admin/modules`, `/platform-admin/subscriptions`, `/platform-admin/settings`.
- [ ] Account routes:
  `/account/dashboard`, `/account/organizations`, `/account/billing`, `/account/settings`, `/account/users`.
- [ ] Organization routes:
  `/org/[orgId]/admin`, `/org/[orgId]/hr`, `/org/[orgId]/manager`, `/org/[orgId]/reviewer`, `/org/[orgId]/employee`.
- [ ] Module routes under organization:
  Re-home current `/admin`, `/management`, `/reviewer`, `/employee`, KPI, MOM, arrear, ticket, OT, and history pages under `/org/[orgId]/...`.
- [ ] Transitional compatibility:
  Keep legacy routes temporarily as redirects into the new `/org/[orgId]/...` tree until internal links are fully updated.

## 7. Role and Permission Plan
- [ ] Platform:
  `PLATFORM_SUPER_ADMIN` only.
- [ ] Account:
  `ACCOUNT_OWNER` in v1.
- [ ] Organization:
  `ORG_ADMIN`, `HR`, `MANAGER`, `TEAM_LEAD`, `REVIEWER`, `EMPLOYEE`.
- [ ] Authorization rules:
  Platform routes require platform role.
  Account routes require active account membership.
  Organization routes require active org membership plus role assignment.
  Employee self-access always checks `session.user.id === targetUserId`.
  Manager/TL/reviewer access always checks reporting or assignment linkage, never path alone.
- [ ] UI labels:
  Show “Account Owner”, “Organization Admin”, “TL/Reviewer”, and human-readable statuses; do not expose raw enum names in normal UI.

## 8. Login and Redirect Flow Plan
- [ ] Change primary SaaS auth flow to email + password for v1; do not require passkey during invite activation or normal login.
- [ ] Keep current passkey tables untouched during migration, but treat them as legacy-only and not the primary SaaS path.
- [ ] Normalize email to lowercase before lookup and persistence everywhere.
- [ ] Redirect logic:
  `PLATFORM_SUPER_ADMIN` -> `/platform-admin`
  `ACCOUNT_OWNER` with no org context needed -> `/account/dashboard`
  single active org membership -> role-based `/org/[orgId]/...`
  multiple active org memberships -> `/select-organization`
  no active org membership -> `/no-organization-access`
  insufficient role -> `/unauthorized`
- [ ] Signed-out access:
  `/` shows landing page.
  protected routes redirect to `/login?callbackUrl=...`.
- [ ] Suspended user/account/org behavior:
  inactive user cannot log in.
  invited user cannot access protected dashboards.
  suspended account/org redirects to an access-status page or billing/contact-support state.

## 9. Organization User Authorization Plan
- [ ] Add `OrganizationInvite` model with token hash, target email, org role, branch, department, manager, reviewer/TL, status, inviter, and expiry.
- [ ] Add single-user flow:
  create/link user -> create org membership -> assign org roles -> create hierarchy links -> create invite -> send activation email -> set password -> activate.
- [ ] Add bulk import flow:
  upload CSV/XLSX -> validate -> preview -> create/link users -> create memberships -> assign roles/hierarchy -> generate invites -> send summary.
- [ ] Existing user joining another org:
  reuse the same `User`, add another `OrganizationUser`, add role assignments, and include the org in selector after login.
- [ ] Manual fallback:
  resend invite, reset invite, suspend membership, reactivate membership, deactivate user access.

## 10. Pricing Plan Limit Plan
- [ ] Seed v1 plan shapes:
  `Basic`: 1 organization, 50 employees, Appraisal only.
  `Professional`: 3 organizations, 300 employees, Appraisal + KPI.
  `Enterprise`: unlimited/custom organizations, unlimited/custom employees, all modules.
- [ ] Store exact monetary price as configurable plan metadata so business can update it without schema changes.
- [ ] Enforce backend checks before:
  organization creation,
  employee/member creation/import,
  module activation,
  reactivation of suspended members if limits are already exceeded.
- [ ] Show usage cards in `/account/dashboard`:
  organizations used/allowed, employees used/allowed, enabled modules, subscription status, upgrade CTA.
- [ ] Show friendly upgrade banners when the plan limit blocks an action.

## 11. Database and Schema Change Plan
- [ ] Add `Account`, `AccountMembership`, `Plan`, `Subscription`, `OrganizationInvite`, `DemoRequest`, and optional `SignupLead`.
- [ ] Add `accountId` to `Organization`.
- [ ] Add `status`, `emailVerified`, `invitedAt`, `activatedAt`, and optional `lastLoginAt` to `User`.
- [ ] Keep `OrganizationUser` and `UserRoleAssignment`; do not rename tables in phase 1 unless migration risk is acceptable.
- [ ] Keep `organizationId` as the canonical scope on business tables; do not add `accountId` redundantly to every appraisal/KPI table.
- [ ] Add account-scoped indexes for account queries and org-scoped indexes where missing after final schema reconciliation.
- [ ] Replace `OrganizationAccess.planName/seatsLimit` with account-level plan/subscription authority; keep org access status only if org suspension needs separate tracking.
- [ ] Add invite token hashing and expiry handling similar to existing reset-token patterns.
- [ ] Add audit coverage for account creation, subscription change, org creation, invite send/resend/accept, suspension/reactivation, and plan-limit denials.
- [ ] Reconcile the current uncommitted `multi_tenant_phase1` migration with the final schema before running any real migration.

## 12. Migration Plan for Existing Adarsh Data
- [ ] Take a full database backup and export before any mutation.
- [ ] Create platform super admin user `hariprasad.official.137@gmail.com` through env-driven seed/setup; no hardcoded password.
- [ ] Create `Adarsh` account as the first tenant.
- [ ] Convert current `default-org` / `Adarsh Shipping and Services` organization into an organization owned by the `Adarsh` account.
- [ ] Create `AccountMembership` for `hr@adarshshipping.in` as `ACCOUNT_OWNER` only; remove platform-super-admin status from this user.
- [ ] Backfill account ownership and organization ownership links without deleting existing users or history.
- [ ] Preserve current `organizationId` on appraisal/KPI/notification/MOM/arrear/OT/ticket records; attach account context through the organization record.
- [ ] Backfill org memberships and role assignments from current legacy role data where needed.
- [ ] Migrate legacy login behavior carefully:
  existing users keep hashed passwords;
  invite activation applies only to newly invited users;
  passkey data is not required for new SaaS auth.
- [ ] Validate post-migration counts for users, employees, departments, branches, cycles, self assessments, ratings, KPI data, notifications, MOM, salary decisions, arrears, audit logs, and OT data.
- [ ] Rollback plan:
  restore from backup if account/org mapping or auth routing fails;
  keep legacy routes disabled only after migration verification passes.

## 13. Platform Admin Dashboard Plan
- [ ] Build `/platform-admin` as the SaaS owner control center.
- [ ] Summary cards:
  total accounts, active accounts, suspended accounts, total organizations, total employees, active subscriptions, module adoption.
- [ ] Data pages:
  account list, organization overview, plans, subscriptions, module catalog, support/debug tools, platform settings.
- [ ] Actions:
  create/edit/suspend/reactivate account, org, plan, subscription, and module entitlement.
- [ ] Analytics:
  plan mix, org count, employee count, module usage, trial conversions, account health statuses.
- [ ] Access:
  only `PLATFORM_SUPER_ADMIN`.

## 14. Account Owner Dashboard Plan
- [ ] Build `/account/dashboard` for the customer owner.
- [ ] Show account name, current plan, subscription status, enabled modules, organizations used/allowed, employees used/allowed.
- [ ] Add organization list with create button gated by plan limits.
- [ ] Add upgrade banner/CTA when org or employee limits are reached.
- [ ] Add account settings and billing/subscription pages.
- [ ] Add invite-org-admin flow and optional account-level user management page.
- [ ] Block access to other tenants and all platform-admin pages.

## 15. Organization Dashboard Plan
- [ ] `ORG_ADMIN` dashboard reuses and extends the current `/admin` capability set inside `/org/[orgId]/admin`.
- [ ] New org admin areas:
  settings, branches, departments, designations, users, hierarchy, reports, module enablement view.
- [ ] HR dashboard:
  reuse current reviewer + employee-admin workflow, focused on appraisal coordination, employee records, invite/import, notifications.
- [ ] Manager dashboard:
  team performance, assigned direct reports, meeting/review actions, KPI visibility.
- [ ] TL/Reviewer dashboard:
  assigned appraisees, ratings, KPI task review, review history.
- [ ] Employee dashboard:
  current self-assessment, KPI tasks, notifications, salary/appraisal history, final results.
- [ ] Preserve current appraisal/KPI business rules while moving route scope under `orgId`.

## 16. User Invite and Bulk Import Plan
- [ ] Add invite page for single-user creation with role, branch, department, manager, reviewer/TL assignment.
- [ ] Add bulk import page with downloadable template, row validation, duplicate detection, and preview-before-commit.
- [ ] Support existing-email linking instead of duplicate user creation.
- [ ] Send invite emails with activation token and password-setup flow.
- [ ] Add resend invite, reset invite, deactivate, reactivate, and membership removal actions.
- [ ] Record import and invite operations in audit logs.

## 17. Security and Authorization Plan
- [ ] Make membership-based authorization the server-side source of truth.
- [ ] Every protected page, server action, and route handler must validate:
  authenticated user,
  active user status,
  active account status,
  active org status,
  active membership,
  correct role,
  enabled module,
  target org ownership.
- [ ] Never trust `orgId` from URL without checking the logged-in user’s membership for that exact org.
- [ ] Use `Organization.accountId` joins to prevent cross-tenant leakage.
- [ ] Remove plain-text seed password usage; seed passwords must come from env or a one-time secure setup flow.
- [ ] Do not log passwords, passkeys, tokens, salary-sensitive payloads, or full session objects.
- [ ] Add dedicated unauthorized and no-organization-access pages.
- [ ] Add account/org suspension enforcement to login, middleware, pages, and APIs.

## 18. UI Pages Plan
- [ ] Public:
  landing, login, register, pricing, request-demo.
- [ ] Shared:
  role redirect, organization selector, unauthorized, no-organization-access, invite activation/password setup, module disabled.
- [ ] Platform:
  dashboard, accounts, organizations, plans, modules, subscriptions, settings.
- [ ] Account:
  dashboard, organizations, billing, settings, invite org admin, usage overview.
- [ ] Organization:
  admin dashboard, branches, departments, designations, users, invite user, bulk import, hierarchy, reports, appraisal pages, KPI pages.
- [ ] Role dashboards:
  HR, manager, TL/reviewer, employee.
- [ ] Transitional UI:
  legacy `/admin`/`/management`/`/reviewer`/`/employee` routes redirect to their `/org/[orgId]/...` equivalents until fully retired.

## 19. Testing Checklist
- [ ] Public routes show public content when signed out.
- [ ] Protected routes redirect correctly when signed out.
- [ ] Platform super admin reaches only platform routes.
- [ ] Account owner reaches account routes and cannot access platform routes.
- [ ] Multi-org user sees org selector.
- [ ] Single-org user is redirected to the correct org dashboard by role.
- [ ] Invited user cannot access dashboards before activation.
- [ ] Inactive user/account/org is blocked.
- [ ] Plan limits block extra organization creation and extra employee imports server-side.
- [ ] Disabled modules cannot be accessed directly by URL or API.
- [ ] Cross-tenant and cross-org URL tampering is denied.
- [ ] Existing Adarsh appraisal, KPI, notification, MOM, arrear, salary, ticket, OT, and history flows still work after migration.
- [ ] Legacy redirects from old routes land on the correct new SaaS routes.
- [ ] Migration dry run preserves record counts and relational integrity.

## 20. Implementation Phases
Phase 1: Audit current system
- [ ] Freeze the final SaaS target model and record all legacy-to-SaaS mapping decisions.
- [ ] Catalog all current routes, auth checks, hardcoded org assumptions, and seeded identities.

Phase 2: Schema planning
- [ ] Finalize account, membership, plan, subscription, and invite schema.
- [ ] Reconcile the current partial `multi_tenant_phase1` schema with the final model.

Phase 3: Seed and migration planning
- [ ] Define env-driven secure bootstrap for platform super admin and Adarsh account owner.
- [ ] Write the no-data-loss migration sequence and rollback steps.

Phase 4: Auth and authorization planning
- [ ] Switch to password-first SaaS auth and membership-based authorization.
- [ ] Define redirect logic, suspension logic, and org selector behavior.

Phase 5: Landing page and public route planning
- [ ] Replace `/` with landing page and add register/pricing/request-demo flows.
- [ ] Separate public and authenticated navigation/layout behavior.

Phase 6: Platform Admin planning
- [ ] Add platform dashboard, account management, plan management, module management, subscription management.

Phase 7: Account Owner dashboard planning
- [ ] Add account dashboard, org management, billing, usage, upgrade flows.

Phase 8: Organization management planning
- [ ] Re-home current org admin/HR/manager/reviewer/employee dashboards under `/org/[orgId]/...`.
- [ ] Add branches, departments, designations, users, hierarchy, and reports pages.

Phase 9: User invite/import planning
- [ ] Add invite, activation, resend, deactivate, and bulk import flows.

Phase 10: Existing appraisal/KPI multi-tenant conversion planning
- [ ] Make all current module pages use membership and org context instead of legacy global role assumptions.
- [ ] Preserve current business rules while moving route and auth boundaries.

Phase 11: Testing and release planning
- [ ] Run migration dry run, auth regression checks, limit enforcement checks, and tenant-isolation tests.
- [ ] Cut over Adarsh as first tenant only after validation passes.

## 21. Risks and Warnings
- [ ] Data loss risk: current schema is mid-transition; reconcile migrations before touching production-like data.
- [ ] Auth bypass risk: legacy `User.role` checks can bypass membership intent if not fully replaced.
- [ ] Tenant data leakage risk: relying only on `activeOrganizationId` or URL params is insufficient.
- [ ] Broken dashboard risk: current dashboards assume legacy paths and one default org.
- [ ] Broken appraisal flow risk: redirects and role checks can disrupt cycle progression if migrated route-by-route without compatibility.
- [ ] Broken KPI flow risk: KPI queries and task actions must all be rechecked for org membership and module entitlement.
- [ ] Broken notification flow risk: notification links and target routes will change.
- [ ] Broken MoM/arrear flow risk: meeting and arrear completion logic depends on current cycle states and role checks.
- [ ] Migration risk: `hr@adarshshipping.in` currently has platform power that must be split safely.
- [ ] Hardcoded company risk: Adarsh branding/constants appear in seed, routes, org defaults, and UI strings.
- [ ] Hardcoded role risk: legacy enums and sidebar/path assumptions do not map cleanly to SaaS account/org roles.

## 22. Final TODO Checklist
- [ ] Finalize SaaS domain model: platform, account, organization, membership, module, plan, subscription, invite.
- [ ] Separate platform super admin from Adarsh account owner.
- [ ] Replace `/` with public landing page and add public SaaS routes.
- [ ] Add account-level dashboard, billing, usage, and organization management.
- [ ] Re-home legacy role dashboards under `/org/[orgId]/...`.
- [ ] Make org membership the source of truth for authorization.
- [ ] Add organization selector and no-organization-access flows.
- [ ] Add invite activation and bulk import flows.
- [ ] Enforce plan limits on the backend.
- [ ] Reconcile partial multi-tenant migration with final schema.
- [ ] Migrate existing Adarsh data into `Adarsh` account + `Adarsh Shipping and Services` organization.
- [ ] Remove hardcoded seed password usage and move bootstrap secrets to env/setup flow.
- [ ] Preserve all existing appraisal/KPI/notification/MOM/arrear/OT/ticket/history data.
- [ ] Add full regression coverage for redirects, auth, limits, and tenant isolation.

## Assumptions and Defaults Chosen
- [ ] V1 billing/subscription management is admin-managed in-app; no payment gateway integration is required for the first conversion phase.
- [ ] V1 primary auth is email + password; current passkey flow is treated as legacy and not required for new SaaS invite onboarding.
- [ ] `organizationId` remains the canonical scope for business records; `accountId` is added to `Organization` and account-scoped tables instead of every downstream record.
- [ ] V1 supported customer modules are Appraisal Management and KPI Management; OT remains under appraisal scope unless later promoted to a separate module.
- [ ] Default starter plan limits for implementation are Basic `1/50`, Professional `3/300`, Enterprise `custom/unlimited`, with monetary pricing editable later by business/admin.
