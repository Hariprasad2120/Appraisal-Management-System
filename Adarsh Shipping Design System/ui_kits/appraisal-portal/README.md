# Adarsh Shipping Design System — UI Kit

## Appraisal Portal

High-fidelity clickable prototype of the internal Appraisal Management Portal.

### Stack
- React 18 (Babel in-browser JSX)
- DM Sans body font + Kiona brand font + JetBrains Mono
- CSS custom properties from `../../colors_and_type.css`

### Screens / Flows
1. **Login** — Split layout with ambient blobs, logo, feature pills, credential form, role selector
2. **Admin Dashboard** — Stat cards, milestone alerts, appraisals-due table, quick links
3. **Employee View** — Personal stats, reviewer availability, self-assessment CTA, rating progress

### Components
| File | Exports |
|---|---|
| `Sidebar.jsx` | `Sidebar` — collapsible icon-only sidebar (expands on hover) |
| `Header.jsx` | `Header` — top bar with logo, horizontal tabs, dark mode toggle, notification bell |
| `StatCard.jsx` | `StatCard`, `StatRow` — KPI card with accent border, icon, big number |
| `Dashboard.jsx` | `AdminDashboard`, `Badge`, `SectionCard` — full admin view |
| `EmployeeView.jsx` | `EmployeeView` — employee self-assessment dashboard |
| `LoginPage.jsx` | `LoginPage` — full login page with branding |

### Interaction
- **Role switcher** in header top-right changes the sidebar nav and content
- **Dark mode toggle** applies CSS var overrides live
- **Sidebar** expands from 60px → 220px on hover
- **Login form** role picker lets you sign in as Admin/Management/HR/Employee
- Employee self-assessment "Start Assessment" button toggles submitted state
