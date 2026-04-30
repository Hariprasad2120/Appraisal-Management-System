# Adarsh Shipping & Services — Design System

## Overview
This design system covers the **Appraisal Management Portal** built for **Adarsh Shipping & Services**, a logistics and shipping company. The portal is an internal tool for managing the full employee appraisal lifecycle: self-assessments, reviewer assignments, 360° ratings, increment decisions, salary revisions, and audit logs.

## Products Covered
| Product | Description |
|---|---|
| **Appraisal Portal** (web app) | Internal Next.js app — primary product. Role-based dashboards for Admin, Management, HR, TL, Manager, Employee, Partner. |

## Sources
- **Codebase**: `https://github.com/Hariprasad2120/Appraisal-Management-System` (Next.js 15, Tailwind v4, shadcn/ui, Prisma, NextAuth)
- **Logo**: `assets/Logo.png`
- **Reference UI video**: `uploads/82228fe85ee27b02514d94f31a7361e6-aab8a84a.mp4` — a GeoSales-style dashboard with icon-only sidebar, flat stat cards, clean horizontal tab nav

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Professional but warm.** Copy uses plain English — no jargon.
- **Second person ("you").** The interface addresses the user directly: "Welcome back", "Your appraisal cycle is approaching."
- **Title case for headings**, sentence case for body/description text.
- **Concise labels.** Nav items are 1–2 words: "Employees", "All Cycles", "Increment Slabs".
- **No emoji.** The UI uses Lucide icons, never emoji.
- **No first person from the system.** The app doesn't say "I" or "We".
- **Numbers are formatted** with locale commas: `₹1,20,000/yr`.
- **Status labels are human-readable**: "Self-assessment pending", "Ratings complete", not "PENDING_SELF".
- **Errors are gentle**: "Invalid email or password. Please try again." — no technical codes shown.
- **Alerts are specific**: "Milestone Alerts (3)" with employee name + alert type.

### Copy Examples
- `"Performance. Rewarded fairly."` — hero tagline
- `"Welcome, Hariprasad"` — dashboard greeting
- `"Joined 12/01/2023 · 45 days to next anniversary"` — contextual subheading
- `"Assign →"` — action CTA with arrow
- `"Contact your administrator if you need access"` — auth fallback
- `"No appraisals due this month."` — empty states, direct

---

## VISUAL FOUNDATIONS

### Color System
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--brand-teal` | `#0e8a95` | `#0ea5b0` | Primary, sidebar accent, CTA |
| `--brand-orange` | `#ff8333` | `#ff8333` | Secondary, warm accents |
| `--brand-cyan` | `#00cec4` | `#00cec4` | Chart lines, gradient end |
| `--brand-amber` | `#ffaa2d` | `#ffaa2d` | Notification badge, warnings |
| `--background` | `#f6f8fa` | `#0f1117` | Page background |
| `--card` | `#ffffff` | `#181d27` | Card surface |
| `--border` | `#e5eaf1` | `#252d3d` | Dividers, card borders |
| `--muted-foreground` | `#6b7280` | `#6b7280` | Secondary text |
| `--destructive` | `#ef4444` | `#ef4444` | Errors, delete states |

### Typography
- **Font stack**: Geist Sans (primary), Geist Mono (code/numbers). Substituted by DM Sans + JetBrains Mono from Google Fonts.
- **Scale**: 10px caption → 11px tiny-label → 12px small → 13px base → 14px body → 16px subheading → 20px h2 → 24px h1 → 32px+ display
- **Heading weight**: 700 (bold). Body weight: 400. Label weight: 500–600.
- **Tracking**: Uppercase labels get `tracking-widest` (0.22em). Headings are tight (-0.02em).

### Spacing & Radius
- **Base radius**: `0.75rem` (12px). Cards use `rounded-xl` (12px). Chips use `rounded-full`. Inputs use `rounded-xl`.
- **Scale**: 4px → 8px → 12px → 16px → 20px → 24px → 32px → 48px
- **Card padding**: `p-5` (20px). Compact: `p-4` (16px). Form: `p-7` (28px).

### Reference UI Style (target from video)
The revamped UI adopts the **GeoSales-style dashboard** aesthetic from the reference video:
- **Icon-only narrow sidebar** (~56px) — icons, no text labels visible at rest
- **Top header bar** — logo + app name left, horizontal tabs right
- **White/very light content background** — clean, flat
- **Stat cards**: no heavy borders, just white cards with subtle shadow, big bold numbers, icon + label + link-out arrow at top
- **Typography**: Very large bold numbers for KPIs, smaller muted labels

### Backgrounds & Layout
- Light mode default. Dark mode toggled via class.
- Background `#f6f8fa` (blue-gray tint), not pure white.
- Sidebar uses `#ffffff` with a right border `#e5eaf1`.
- Page content max-width: `max-w-7xl` for admin, `max-w-3xl` for employee views.
- Cards use `bg-card` + `border border-border` + `shadow-sm`.

### Animations
- **Framer Motion (motion/react)** is used throughout.
- Entry animations: `FadeIn` (opacity 0→1, y +8→0), `StaggerList`/`StaggerItem` (staggered child reveal).
- Nav active indicator: `layoutId="nav-active-bar"` spring animation (`stiffness: 380, damping: 32`).
- Login button: `whileTap={{ scale: 0.98 }}`.
- Error messages: AnimatePresence fade with height collapse.
- No bounces. Easing: `[0.25, 0.46, 0.45, 0.94]` (ease-out-quad).

### Hover & Press States
- Nav items: `hover:bg-muted hover:text-foreground` — subtle background shift.
- Cards: `hover:border-primary/40 hover:shadow-md` — border tint + shadow lift.
- Buttons: `hover:opacity-90` on gradient buttons; `hover:text-foreground` on ghost.
- Active nav item: `bg-primary/10 text-primary` with a `3px` left-border indicator.

### Glow Effects
- `glow-teal`: `box-shadow: 0 0 24px rgba(14,137,149,0.25)` — used on focused inputs, highlighted cards.
- `border-glow-teal`: `border-color: rgba(14,137,149,0.4)` + faint box-shadow.

### Gradients
- `bg-gradient-teal`: `linear-gradient(135deg, #0e8a95, #00cec4)` — CTA buttons, avatar backgrounds.
- `bg-gradient-warm`: `linear-gradient(135deg, #ff8333, #ffaa2d)` — warm accents.
- Ambient blobs on login page: radial gradients at 4–6% opacity for depth.

### Stat Card Accents
Cards use top-border accent bars: `stat-teal`, `stat-cyan`, `stat-amber`, `stat-orange`, `stat-green`, `stat-red` — `border-top: 3px solid <color>`.

### Iconography
See [ICONOGRAPHY section below].

### Borders & Shadows
- Cards: `border border-border shadow-sm` — 1px border, light shadow.
- Sidebar: `border-r border-border shadow-sm`.
- Inputs: `bg-input border-border focus:border-primary` — no ring on default.
- Scrollbar: 5px, transparent track, `--border` thumb, teal on hover.

### Corner Radii
- `rounded-full`: badges, role pills, nav active bars
- `rounded-xl` (12px): cards, inputs, modals, form containers
- `rounded-lg` (10px): nav items, small buttons
- `rounded-2xl` (18px): large feature cards

---

## ICONOGRAPHY

**Icon library**: [Lucide React](https://lucide.dev/) — stroke-based, 1.5px stroke, consistent 16×16 or 20×20 (`size-4` / `size-5`).

**Icon usage**: Icons always paired with text in navigation. Icon-only in sidebar (with tooltip). Never emoji. No PNG icons — all Lucide SVG via `<Icon className="size-4" />`.

**Key icons used**:
| Icon | Usage |
|---|---|
| `LayoutDashboard` | Dashboard nav |
| `Users` | Employees |
| `UserCheck` | Appraisals |
| `ClipboardList` | Cycles |
| `Layers` | Increment Slabs |
| `Settings` | Extensions |
| `ListChecks` | Criteria Questions |
| `Ticket` | Support Tickets |
| `BarChart3` | Salary Sheet |
| `TrendingUp` | Salary Revisions |
| `FlaskConical` | Simulation mode |
| `Star` | My Appraisal / Ratings |
| `History` | History |
| `Bell` | Notifications |
| `LogOut` | Sign out |

**CDN**: Lucide icons are bundled via npm, not CDN. For design system previews, load from `https://unpkg.com/lucide@latest`.

---

## Files Index

```
README.md                    ← This file
SKILL.md                     ← Agent skill manifest
colors_and_type.css          ← CSS variables: colors, type, spacing
assets/
  Logo.png                   ← Adarsh Shipping logo (teal + orange)
preview/
  colors-brand.html          ← Brand color swatches
  colors-semantic.html       ← Semantic/state colors
  type-scale.html            ← Typography scale
  type-specimens.html        ← Font specimens
  spacing-radius.html        ← Spacing + border radius tokens
  spacing-shadows.html       ← Shadow + glow system
  components-buttons.html    ← Button variants
  components-badges.html     ← Badge + pill variants
  components-cards.html      ← Stat card + content card
  components-inputs.html     ← Form inputs + labels
  components-sidebar.html    ← Sidebar navigation
  components-table.html      ← Data table
  brand-logo.html            ← Logo display
ui_kits/
  appraisal-portal/
    README.md
    index.html               ← Full portal prototype (login → dashboard)
    Sidebar.jsx
    Header.jsx
    StatCard.jsx
    Dashboard.jsx
    EmployeeView.jsx
    LoginPage.jsx
```
