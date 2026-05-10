'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FiLogIn } from 'react-icons/fi';

export default function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      window.location.href = user.role === 'admin' ? '/admin' : '/faculty';
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success && result.role) {
        window.location.href = result.role === 'admin' ? '/admin' : '/faculty';
      } else {
        setLoading(false);
        setMessage(result.message || 'Login failed. Please try again.');
      }
    } catch {
      setLoading(false);
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col flex-1 bg-black p-12 justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded -mr-48 -mt-48 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/3 rounded -ml-40 -mb-40 blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-black font-black text-lg">G</span>
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none">Gographic</p>
            <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">College Portal</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative space-y-10">
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/50">Secure Access</p>
            <h2 className="text-4xl font-black text-white leading-tight">
              One portal for<br />
              <span className="text-white/60">faculty &amp; admin</span><br />
              to manage data.
            </h2>
            <p className="text-white/40 font-medium text-base max-w-sm">
              Register students, upload bulk data, and generate ID cards — all from one dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '🎓', label: 'Student registration & management' },
              { icon: '📋', label: 'Bulk import via Excel' },
              { icon: '🪪', label: 'ID card generation & export' },
              { icon: '📊', label: 'Download reports as PDF' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-white/50 font-medium text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs font-medium">
          © {new Date().getFullYear()} Gographic. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 lg:flex-none lg:w-[480px] flex flex-col bg-white overflow-y-auto">

        {/* Mobile hero header (replaces the tiny logo on mobile) */}
        <div className="lg:hidden bg-black relative overflow-hidden px-6 pt-10 pb-8 shrink-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded -mr-36 -mt-36 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/3 rounded -ml-28 -mb-28 blur-3xl pointer-events-none" />

          {/* Brand */}
          <div className="relative flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0">
              <span className="text-black font-black text-lg">G</span>
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">College Portal</p>
            </div>
          </div>

          {/* Hero */}
          <div className="relative">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Secure Access</p>
            <h2 className="text-2xl font-black text-white leading-tight mb-2">
              One portal for<br />
              <span className="text-white/50">faculty &amp; admin.</span>
            </h2>
            <p className="text-white/40 text-sm font-medium mb-5">
              Register students, upload bulk data, and generate ID cards.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: '🎓', label: 'Student Registration' },
                { icon: '📋', label: 'Bulk Import' },
                { icon: '🪪', label: 'ID Cards' },
                { icon: '📊', label: 'PDF Reports' },
              ].map(({ icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[0.65rem] font-bold text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                  <span>{icon}</span>{label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form section */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-8 lg:py-12">
          <div className="w-full max-w-sm space-y-8">

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900">Login</h1>
              <p className="text-slate-500 text-sm font-medium">Enter your credentials to access your portal.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="input-field"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input-field"
                />
              </label>

              {message && (
                <p className="text-sm font-bold text-rose-600 bg-rose-50 p-3 rounded border border-rose-100">
                  ⚠️ {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-black hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <FiLogIn className="w-4 h-4" />
                )}
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>

          </div>
        </div>

        {/* Mobile footer */}
        <p className="lg:hidden text-center text-xs text-slate-400 font-medium pb-6">
          © {new Date().getFullYear()} Gographic. All rights reserved.
        </p>

      </div>
    </div>
  );
}
