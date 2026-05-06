"use strict";
// LoginPage.jsx — Clean login screen with split layout

function LoginPage({ onLogin, darkMode, setDarkMode }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [role, setRole] = React.useState('ADMIN');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) { setErr('Please enter email and password.'); return; }
    setErr('');
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(role); }, 900);
  };

  const EyeIcon = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  const EyeOff = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
  const ArrowRight = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
  const SpinIcon = () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

  const FEATURES = [
    { dot: '#00cec4', label: 'Self-assessments' },
    { dot: '#0e8a95', label: '360° Reviews' },
    { dot: '#ffaa2d', label: 'Salary insights' },
    { dot: '#ff8333', label: 'Role-based access' },
  ];

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1.5px solid var(--border)', background: 'var(--input)',
    fontFamily: 'var(--font)', fontSize: '14px', color: 'var(--fg1)',
    outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Ambient blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-120px', left: '-120px', width: '440px', height: '440px', borderRadius: '50%', background: 'radial-gradient(circle, #0e8a95 0%, transparent 70%)', opacity: 0.06 }} />
        <div style={{ position: 'absolute', top: '33%', right: '-100px', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, #ff8333 0%, transparent 70%)', opacity: 0.05 }} />
        <div style={{ position: 'absolute', bottom: 0, left: '25%', width: '380px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, #00cec4 0%, transparent 70%)', opacity: 0.04 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '48px', alignItems: 'center' }}>

        {/* Left: branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <img src="../../assets/Logo.png" alt="Adarsh Shipping" style={{ height: '52px', width: 'auto', objectFit: 'contain', objectPosition: 'left' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0e8a95' }}>
              Appraisal Management Portal
            </span>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--fg1)', lineHeight: 1.25, letterSpacing: '-0.02em', margin: 0, marginBottom: '12px' }}>
              Performance.{' '}
              <span style={{ background: 'linear-gradient(135deg,#0e8a95,#00cec4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Rewarded fairly.
              </span>
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--fg3)', lineHeight: 1.6, maxWidth: '360px', margin: 0 }}>
              Manage employee reviews, self-assessments, ratings, and appraisal workflows from one unified portal.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {FEATURES.map(f => (
              <span key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg3)', fontSize: '13px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: f.dot, flexShrink: 0 }} />
                {f.label}
              </span>
            ))}
          </div>

          <div style={{ height: '1px', width: '120px', background: 'linear-gradient(90deg, #0e8a95, transparent)', opacity: 0.4 }} />
        </div>

        {/* Right: form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', boxShadow: 'var(--shadow-md)', padding: '28px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--fg1)', margin: 0 }}>Welcome back</h2>
            <p style={{ fontSize: '13px', color: 'var(--fg3)', marginTop: '4px' }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg3)', display: 'block', marginBottom: '6px' }}>Email address</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@adarshshipping.in" />
            </div>

            <div>
              <label style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg3)', display: 'block', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: '40px' }} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)', padding: 0 }}>
                  {showPw ? <EyeOff /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Role selector (prototype helper) */}
            <div>
              <label style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg3)', display: 'block', marginBottom: '6px' }}>Sign in as</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGEMENT">Management</option>
                <option value="HR">HR / TL / Manager</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>

            {err && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', fontSize: '13px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {err}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', height: '44px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg,#0e8a95,#00cec4)', color: '#fff',
              fontFamily: 'var(--font)', fontSize: '14px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'opacity 0.15s', whiteSpace: 'nowrap',
            }}>
              {loading ? <><SpinIcon /> Signing in…</> : <>Sign in <ArrowRight /></>}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--fg3)' }}>
            Contact your administrator if you need access
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginPage });
