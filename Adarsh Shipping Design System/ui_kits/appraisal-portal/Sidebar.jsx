"use strict";
// Sidebar.jsx — Icon-only slim sidebar inspired by reference video
const { useState } = React;

const ICONS = {
  dashboard: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  cycles: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6"/><path d="M9 16h4"/>
    </svg>
  ),
  slabs: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  star: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  history: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.47"/>
    </svg>
  ),
  ticket: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
    </svg>
  ),
  salary: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  trending: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  criteria: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  flask: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 3h6"/><path d="M10 9l-4 9a2 2 0 0 0 1.8 2.8h8.4A2 2 0 0 0 18 18l-4-9"/>
      <path d="M10 3v6"/><path d="M14 3v6"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const NAV_BY_ROLE = {
  ADMIN: [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'employees', icon: 'users', label: 'Employees' },
    { key: 'cycles', icon: 'cycles', label: 'All Cycles' },
    { key: 'slabs', icon: 'slabs', label: 'Increment Slabs' },
    { key: 'criteria', icon: 'criteria', label: 'Criteria' },
    { key: 'tickets', icon: 'ticket', label: 'Support Tickets' },
    { key: 'salary', icon: 'salary', label: 'Salary Sheet' },
    { key: 'extensions', icon: 'trending', label: 'Extensions' },
    { key: 'employee', icon: 'star', label: 'My Appraisal' },
    { key: 'history', icon: 'history', label: 'History' },
  ],
  MANAGEMENT: [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'salary', icon: 'salary', label: 'Salary Calculator' },
    { key: 'employees', icon: 'users', label: 'Employees' },
    { key: 'history', icon: 'history', label: 'History' },
    { key: 'tickets', icon: 'ticket', label: 'Support Tickets' },
  ],
  EMPLOYEE: [
    { key: 'employee', icon: 'star', label: 'My Appraisal' },
    { key: 'history', icon: 'history', label: 'History' },
    { key: 'tickets', icon: 'ticket', label: 'Support Tickets' },
  ],
  HR: [
    { key: 'dashboard', icon: 'star', label: 'My Reviews' },
    { key: 'employee', icon: 'users', label: 'My Appraisal' },
    { key: 'history', icon: 'history', label: 'History' },
    { key: 'tickets', icon: 'ticket', label: 'Support Tickets' },
  ],
};

function Sidebar({ role, page, setPage }) {
  const [expanded, setExpanded] = useState(false);
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE['EMPLOYEE'];

  const sidebarStyles = {
    width: expanded ? '220px' : '60px',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
    flexShrink: 0,
    zIndex: 10,
  };

  return (
    <aside style={sidebarStyles} onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
      {/* Logo area */}
      <div style={{ padding: '18px 12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg,#0e8a95,#00cec4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontSize: '14px', fontWeight: '700', letterSpacing: '-0.02em'
        }}>A</div>
        {expanded && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--fg1)', lineHeight: 1.2 }}>Adarsh Shipping</div>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg3)', marginTop: '2px' }}>Appraisal Portal</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {navItems.map(item => {
          const isActive = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                background: isActive ? 'rgba(14,137,149,0.1)' : 'transparent',
                color: isActive ? 'var(--teal)' : 'var(--fg3)',
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'var(--font)', fontSize: '13px', fontWeight: isActive ? '600' : '400',
                textAlign: 'left', whiteSpace: 'nowrap', width: '100%',
                position: 'relative',
              }}
            >
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: '6px', bottom: '6px',
                  width: '3px', borderRadius: '0 3px 3px 0',
                  background: 'var(--teal)',
                }} />
              )}
              <span style={{ flexShrink: 0 }}>{ICONS[item.icon]}</span>
              {expanded && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '10px 8px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#0e8a95,#00cec4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '11px', fontWeight: '700',
          }}>H</div>
          {expanded && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--fg1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Hariprasad K.</div>
              <div style={{ fontSize: '10px', color: 'var(--teal)', fontWeight: '500', marginTop: '1px' }}>{role}</div>
            </div>
          )}
        </div>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: 'var(--fg3)', cursor: 'pointer',
            fontFamily: 'var(--font)', fontSize: '13px', width: '100%',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ flexShrink: 0 }}>{ICONS.logout}</span>
          {expanded && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar, ICONS, NAV_BY_ROLE });
