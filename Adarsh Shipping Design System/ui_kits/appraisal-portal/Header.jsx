"use strict";
// Header.jsx — Top bar with page title, tabs, and controls

const TABS_BY_PAGE = {
  dashboard: ['Overview', 'Monitoring', 'Analytics'],
  employees: ['All Employees', 'Active', 'Inactive'],
  cycles: ['All Cycles', 'Active', 'Completed'],
  salary: ['Calculator', 'Revisions', 'Sheet'],
  employee: ['My Appraisal', 'History'],
  tickets: ['Open', 'Resolved', 'All'],
};

const PAGE_TITLES = {
  dashboard: 'Admin Dashboard',
  employees: 'Employees',
  cycles: 'Appraisal Cycles',
  slabs: 'Increment Slabs',
  criteria: 'Criteria Questions',
  tickets: 'Support Tickets',
  salary: 'Salary Sheet',
  extensions: 'Extensions',
  employee: 'My Appraisal',
  history: 'History',
};

function Header({ role, darkMode, setDarkMode, setPage, page }) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [notifs] = React.useState(3);
  const tabs = TABS_BY_PAGE[page] || [];

  React.useEffect(() => setActiveTab(0), [page]);

  const moonIcon = (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
  const sunIcon = (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
  const bellIcon = (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '56px',
      gap: '16px',
      flexShrink: 0,
    }}>
      {/* Left: logo mark + app name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="../../assets/Logo.png" alt="Adarsh" style={{ height: '24px', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
        <span style={{ width: '1px', height: '18px', background: 'var(--border)', display: 'block' }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fg1)' }}>Appraisal Portal</span>
      </div>

      {/* Center: tabs */}
      {tabs.length > 0 && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0', flex: 1, justifyContent: 'center' }}>
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '0 16px', height: '56px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font)', fontSize: '13px',
                fontWeight: activeTab === i ? '600' : '400',
                color: activeTab === i ? 'var(--teal)' : 'var(--fg3)',
                borderBottom: activeTab === i ? '2px solid var(--teal)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >{tab}</button>
          ))}
        </nav>
      )}
      {tabs.length === 0 && <div style={{ flex: 1 }} />}

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg3)', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >{darkMode ? sunIcon : moonIcon}</button>

        {/* Notification bell */}
        <button
          style={{
            width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg3)', cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
          }}
        >
          {bellIcon}
          {notifs > 0 && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#ffaa2d', border: '1.5px solid var(--surface)',
            }} />
          )}
        </button>

        {/* Role switcher */}
        <select
          value={role}
          onChange={e => { window.__setRole && window.__setRole(e.target.value); }}
          style={{
            fontFamily: 'var(--font)', fontSize: '11px', fontWeight: '600',
            padding: '5px 8px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--muted)',
            color: 'var(--fg2)', cursor: 'pointer',
          }}
        >
          <option>ADMIN</option>
          <option>MANAGEMENT</option>
          <option>HR</option>
          <option>EMPLOYEE</option>
        </select>
      </div>
    </header>
  );
}

Object.assign(window, { Header, TABS_BY_PAGE, PAGE_TITLES });
