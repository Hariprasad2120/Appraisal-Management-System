"use strict";
// Dashboard.jsx — Admin Dashboard view

const ICON_SVG = (path, extra = '') => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" dangerouslySetInnerHTML={{__html: path}} />
);

const CalendarIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const ClockIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const UsersIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AlertIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ChevronRight = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>;
const BellIcon = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;

const EMPLOYEES = [
  { id: 'E001', name: 'Hariprasad K.', dept: 'Operations', joining: '01/03/2022', type: 'ANNUAL' },
  { id: 'E002', name: 'Priya Nair', dept: 'HR', joining: '15/06/2022', type: 'INTERIM' },
  { id: 'E003', name: 'Anand Raj', dept: 'Logistics', joining: '10/04/2022', type: 'ANNUAL' },
  { id: 'E004', name: 'Meera Iyer', dept: 'Finance', joining: '22/07/2022', type: 'ANNUAL' },
  { id: 'E005', name: 'Suresh Kumar', dept: 'IT', joining: '05/08/2022', type: 'INTERIM' },
];

const ALERTS = [
  { name: 'Anand Raj', label: 'EPF/ESI threshold reached', type: 'EPF_ESI' },
  { name: 'Suresh Kumar', label: 'EPF/ESI threshold reached', type: 'EPF_ESI' },
];

const QUICK_LINKS = [
  { key: 'employees', label: 'Employees', desc: 'Manage all users' },
  { key: 'cycles', label: 'All Cycles', desc: 'View appraisal cycles' },
  { key: 'slabs', label: 'Increment Slabs', desc: 'Configure hike bands' },
  { key: 'extensions', label: 'Extensions', desc: '1 pending' },
];

function Badge({ children, bg, color }) {
  return (
    <span style={{
      padding: '3px 9px', borderRadius: '9999px',
      background: bg, color, fontSize: '11px', fontWeight: '500',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--fg1)' }}>{title}</span>
        {action && <span style={{ fontSize: '12px', color: '#0e8a95', fontWeight: '500', cursor: 'pointer' }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}

function AdminDashboard({ setPage, role }) {
  const now = new Date();
  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--fg1)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          Hey, Hariprasad 👋
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--fg3)', marginTop: '4px' }}>{monthYear} · Admin Dashboard</p>
      </div>

      {/* Stat cards */}
      <StatRow>
        <StatCard label="Due This Month" value="12" accent="#00cec4" iconBg="#ecfeff" iconColor="#0891b2" iconEl={<CalendarIcon />} sub="vs last month: 8" subColor="#22c55e" />
        <StatCard label="Active Cycles" value="5" accent="#ffaa2d" iconBg="#fffbeb" iconColor="#d97706" iconEl={<ClockIcon />} sub="vs last month: 7" subColor="#ef4444" />
        <StatCard label="Pending Availability" value="3" accent="#0e8a95" iconBg="rgba(14,137,149,0.1)" iconColor="#0e8a95" iconEl={<UsersIcon />} sub="awaiting response" subColor="#ffaa2d" />
        <StatCard label="Pending Extensions" value="1" accent="#ff8333" iconBg="#fff3e8" iconColor="#ea6700" iconEl={<AlertIcon />} sub="requires action" subColor="#ff8333" />
      </StatRow>

      {/* Milestone alerts */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <BellIcon />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>Milestone Alerts ({ALERTS.length})</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ALERTS.map(a => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--fg1)' }}>{a.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--fg3)', marginLeft: '8px' }}>{a.label}</span>
              </div>
              <Badge bg="#fef3c7" color="#92400e">EPF/ESI Alert</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Two-col row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px' }}>
        {/* Appraisals due table */}
        <SectionCard title="Appraisals Due This Month" action="View all →">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Emp #', 'Name', 'Department', 'Joining', 'Type', 'Action'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((emp, i) => (
                  <tr key={emp.id} style={{ borderBottom: i < EMPLOYEES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--fg3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{emp.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--fg1)' }}>{emp.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--fg3)' }}>{emp.dept}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--fg3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{emp.joining}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge
                        bg={emp.type === 'INTERIM' ? '#fff3e8' : '#e0f5f5'}
                        color={emp.type === 'INTERIM' ? '#ea6700' : '#0e8a95'}
                      >{emp.type}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0e8a95', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>
                        Assign <ChevronRight />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '200px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--fg1)', marginBottom: '2px' }}>Quick Links</div>
          {QUICK_LINKS.map(ql => (
            <div
              key={ql.key}
              onClick={() => setPage(ql.key)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '12px 14px', cursor: 'pointer',
                transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--fg1)' }}>{ql.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>{ql.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, Badge, SectionCard });
