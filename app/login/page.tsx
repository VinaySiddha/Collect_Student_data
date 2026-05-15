'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowRight, FiShield, FiUsers, FiCamera } from 'react-icons/fi';

const STATS = [
  { icon: <FiUsers className="w-4 h-4" />, value: '10,000+', label: 'Students registered' },
  { icon: <FiCamera className="w-4 h-4" />, value: '50+',     label: 'Institutions served' },
  { icon: <FiShield className="w-4 h-4" />, value: '100%',    label: 'Secure & encrypted' },
];

const FEATURES = [
  'Bulk student registration with photo upload',
  'Instant ID card generation & printing',
  'Role-based access for faculty & admin',
  'Real-time audit logs & activity tracking',
];

function roleRedirect(role: string) {
  if (role === 'admin') return '/admin';
  if (role === 'faculty_admin') return '/faculty-admin';
  return '/faculty';
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [message, setMessage]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (user) window.location.href = roleRedirect(user.role); }, [user]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success && result.role) {
        window.location.href = roleRedirect(result.role);
      } else {
        setLoading(false);
        setMessage(result.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setLoading(false);
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-white overflow-hidden">

      {/* ── LEFT — Brand panel ── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-slate-950">

        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="absolute bottom-[-60px] right-[-60px] w-[380px] h-[380px] rounded-full bg-sky-500/15 blur-[90px]" />
          <div className="absolute top-1/2 left-1/3 w-[200px] h-[200px] rounded-full bg-emerald-500/10 blur-[80px]" />
        </div>

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Content */}
        <div className="relative flex flex-col h-full px-12 py-10 xl:px-16 xl:py-12">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-white font-black text-lg tracking-tight">Gographic</span>
          </div>

          {/* Hero text */}
          <div className="my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/50 text-[0.65rem] font-bold uppercase tracking-widest">School ID Card Management</span>
            </div>

            <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.08] tracking-tight mb-6">
              Complete Student<br />
              Identity &amp;<br />
              <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Printing Solutions.
              </span>
            </h2>

            <p className="text-white/40 text-sm leading-relaxed max-w-sm mb-10">
              Design, manage, and bulk-print student ID cards with school branding, photo integration, and real-time tracking.
            </p>

            {/* Feature list */}
            <ul className="space-y-3 mb-12">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-white/50 text-xs font-medium">{f}</span>
                </li>
              ))}
            </ul>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {STATS.map(({ icon, value, label }) => (
                <div key={label} className="p-4 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-sm">
                  <div className="text-white/30 mb-2">{icon}</div>
                  <p className="text-white font-black text-lg leading-none mb-1">{value}</p>
                  <p className="text-white/30 text-[0.6rem] font-medium leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 mt-auto pt-8 border-t border-white/5">
            <p className="text-white/15 text-[0.6rem] font-medium">
              © {new Date().getFullYear()} Gographic · School Identity &amp; Printing Solutions
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Login form ── */}
      <div className="flex-1 lg:flex-none lg:w-[480px] flex flex-col min-h-[100dvh] lg:min-h-0 lg:h-auto border-l border-slate-100">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 pt-10 pb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-slate-900 font-black text-lg tracking-tight">Gographic</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-600 text-[0.6rem] font-black uppercase tracking-widest">Secure</span>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-12">
          <div
            className="w-full max-w-sm"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            {/* Heading */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-5">
                <FiShield className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 text-[0.65rem] font-black uppercase tracking-widest">School Portal</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                Welcome back
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Email / Username
                </label>
                <div className="relative group">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors" />
                  <input
                    type="text"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setMessage(null); }}
                    placeholder="you@school.edu"
                    required
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-300 outline-none transition-all duration-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 bg-white hover:border-slate-300"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setMessage(null); }}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-300 outline-none transition-all duration-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 bg-white hover:border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors p-0.5"
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {message && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <p className="text-xs font-bold text-rose-600 leading-relaxed">{message}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full relative flex items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-black text-white bg-slate-950 hover:bg-slate-800 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[0.6rem] font-black text-slate-300 uppercase tracking-widest">Secured by</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-3">
              {[
                { label: 'SHA-256 Hash', color: 'bg-slate-100 text-slate-400 border-slate-200' },
                { label: 'Role-based Access', color: 'bg-slate-100 text-slate-400 border-slate-200' },
                { label: 'Audit Logs', color: 'bg-slate-100 text-slate-400 border-slate-200' },
              ].map(b => (
                <span key={b.label} className={`text-[0.55rem] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${b.color}`}>
                  {b.label}
                </span>
              ))}
            </div>

            {/* Mobile stats */}
            <div className="lg:hidden mt-10 grid grid-cols-3 gap-3">
              {STATS.map(({ value, label }) => (
                <div key={label} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-900 font-black text-base leading-none mb-1">{value}</p>
                  <p className="text-slate-400 text-[0.55rem] font-medium leading-snug">{label}</p>
                </div>
              ))}
            </div>

            <p className="lg:hidden text-center text-[0.6rem] text-slate-300 font-medium mt-8">
              © {new Date().getFullYear()} Gographic · School Identity &amp; Printing Solutions
            </p>
          </div>
        </div>

        {/* Desktop footer inside right panel */}
        <div className="hidden lg:block shrink-0 px-12 pb-8 text-[0.6rem] text-slate-300 font-medium">
          © {new Date().getFullYear()} Gographic · All rights reserved
        </div>
      </div>
    </div>
  );
}
