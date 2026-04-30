"use strict";
// StatCard.jsx — Minimal stat card inspired by reference video

function StatCard({ label, value, accent, iconEl, iconBg, iconColor, sub, subColor }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${accent}`,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
      flex: 1,
    }}>
      {/* Icon + arrow */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}>{iconEl}</div>
        <svg width="14" height="14" fill="none" stroke="var(--fg4)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ marginTop: '4px' }}>
          <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
        </svg>
      </div>
      <div style={{ fontSize: '30px', fontWeight: '700', color: 'var(--fg1)', lineHeight: 1, letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--fg3)', marginTop: '2px' }}>{label}</div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: subColor, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--fg3)' }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

function StatRow({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
      {children}
    </div>
  );
}

Object.assign(window, { StatCard, StatRow });
