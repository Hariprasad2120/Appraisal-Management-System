"use strict";
// EmployeeView.jsx — Employee self-appraisal dashboard

const CheckCircle = () => <svg width="16" height="16" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const CircleIcon = () => <svg width="16" height="16" fill="none" stroke="var(--fg4)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>;
const ClockSmall = () => <svg width="16" height="16" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const TrendUp = () => <svg width="18" height="18" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const CalendarSm = () => <svg width="18" height="18" fill="none" stroke="#0e8a95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const StarSm = () => <svg width="18" height="18" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const FileText = () => <svg width="14" height="14" fill="none" stroke="var(--fg3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;

const REVIEWERS = [
  { name: 'Rajan Menon', role: 'HR', availability: 'AVAILABLE' },
  { name: 'Deepa Sharma', role: 'TL', availability: 'AVAILABLE' },
  { name: 'Vijay Krishnan', role: 'MANAGER', availability: 'PENDING' },
];

function EmployeeView({ setPage }) {
  const [selfDone, setSelfDone] = React.useState(false);

  const AvailIcon = ({ status }) => {
    if (status === 'AVAILABLE') return <CheckCircle />;
    if (status === 'NOT_AVAILABLE') return <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
    return <ClockSmall />;
  };

  const availBadge = (status) => {
    const map = {
      AVAILABLE: { bg: '#dcfce7', color: '#16a34a', label: 'Available' },
      NOT_AVAILABLE: { bg: '#fee2e2', color: '#ef4444', label: 'Not Available' },
      PENDING: { bg: '#fef9ec', color: '#d97706', label: 'Pending' },
    };
    const s = map[status] || map.PENDING;
    return <span style={{ padding: '3px 9px', borderRadius: '9999px', background: s.bg, color: s.color, fontSize: '10px', fontWeight: '600' }}>{s.label}</span>;
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--fg1)', letterSpacing: '-0.02em' }}>
          Welcome, Hariprasad
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--fg3)', marginTop: '4px' }}>
          Joined 01/03/2022 · <span style={{ color: '#0e8a95', fontWeight: '500' }}>45 days to next anniversary</span>
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { icon: <CalendarSm />, iconBg: '#e0f5f5', label: 'Joining Date', value: '01/03/2022', accent: '#0e8a95' },
          { icon: <StarSm />, iconBg: '#fffbeb', label: 'Total Cycles', value: '3', accent: '#ffaa2d' },
          { icon: <TrendUp />, iconBg: '#dcfce7', label: 'Gross Salary', value: '₹4.8L/yr', accent: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${s.accent}`, borderRadius: '12px', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <span style={{ fontSize: '11px', color: 'var(--fg3)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--fg1)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upcoming anniversary alert */}
      <div style={{ background: '#e0f5f5', border: '1px solid #99d6dc', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#0e6e78' }}>
        <strong>Your appraisal cycle is approaching</strong> — within a week of your anniversary on 01/03/2025.
      </div>

      {/* Current cycle card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--fg1)' }}>Current Appraisal — ANNUAL</span>
          <span style={{ padding: '4px 12px', borderRadius: '9999px', background: 'rgba(14,137,149,0.1)', color: '#0e8a95', fontSize: '12px', fontWeight: '500' }}>
            Self-assessment due
          </span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Reviewer availability */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--fg3)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UsersIcon2 /> Reviewer Availability
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {REVIEWERS.map(r => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <AvailIcon status={r.availability} />
                  <span style={{ fontSize: '13px', color: 'var(--fg1)', flex: 1 }}>{r.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--fg3)', marginRight: '8px' }}>{r.role}</span>
                  {availBadge(r.availability)}
                </div>
              ))}
            </div>
          </div>

          {/* Self-assessment box */}
          <div style={{
            borderRadius: '12px', padding: '16px 18px',
            background: selfDone ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${selfDone ? '#bbf7d0' : '#fde68a'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: selfDone ? '#15803d' : '#92400e' }}>
                {selfDone ? 'Self-assessment submitted ✓' : 'Self-assessment due'}
              </p>
              {!selfDone && <p style={{ fontSize: '12px', color: '#a16207', marginTop: '2px' }}>Deadline: 15 Apr 2025, 11:59 PM</p>}
            </div>
            {!selfDone && (
              <button
                onClick={() => setSelfDone(true)}
                style={{
                  padding: '8px 18px', borderRadius: '9px', border: 'none',
                  background: '#f59e0b', color: '#fff', fontFamily: 'var(--font)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                Start Assessment →
              </button>
            )}
          </div>

          {/* MOM note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--muted)', borderRadius: '9px', fontSize: '12px', color: 'var(--fg3)' }}>
            <FileText /> MOM document available for the previous appraisal cycle
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersIcon2() {
  return <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
}

Object.assign(window, { EmployeeView });
