'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FiLogIn, FiUser, FiLock } from 'react-icons/fi';

const SCHOOLS = ["St. Xavier's", 'DPS', 'Ryan Intl.', 'Kendriya Vidyalaya', 'Holy Cross', 'Sunrise School'];

export default function LoginPage() {
  const { login, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function roleRedirect(role: string) {
    if (role === 'admin') return '/admin';
    if (role === 'faculty_admin') return '/faculty-admin';
    return '/faculty';
  }

  useEffect(() => {
    if (user) window.location.href = roleRedirect(user.role);
  }, [user]);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success && result.role) {
        window.location.href = roleRedirect(result.role);
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
    <div className="flex flex-col lg:flex-row bg-white" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* LEFT — brand / info panel */}
      <div className="hidden lg:flex flex-col flex-1 h-full overflow-hidden bg-[#0a0a0a] px-12 py-10 xl:px-16 xl:py-12">

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0 mb-auto">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-[#0a0a0a] font-black text-sm leading-none">G</span>
          </div>
          <span className="text-white font-bold text-base tracking-tight">Gographic</span>
        </div>

        {/* Center content */}
        <div className="shrink-0 my-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-5">
            School ID Card Management
          </p>
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
            Complete School<br />
            Identity &amp; Printing<br />
            <span className="text-white/40">Solutions.</span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs mb-10">
            Design, manage, and bulk-print student ID cards with school branding, barcodes, and photo integration.
          </p>

          {/* ID card mockup — no emojis, pure CSS */}
          <div className="w-72 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            {/* card header stripe */}
            <div className="h-1.5 w-full bg-white/20" />
            <div className="bg-white/5 px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.5rem] font-black">G</span>
                </div>
                <div>
                  <p className="text-white text-[0.6rem] font-bold uppercase tracking-widest leading-none">Gographic School</p>
                  <p className="text-white/30 text-[0.5rem] uppercase tracking-widest mt-0.5">Student Identity Card</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                {/* photo box */}
                <div className="w-14 h-16 rounded-lg bg-white/10 border border-white/10 shrink-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/20 mb-1" />
                </div>
                <div className="flex-1 pt-1 space-y-1.5">
                  <div className="h-2.5 w-24 bg-white/70 rounded-sm" />
                  <div className="h-2 w-16 bg-white/30 rounded-sm" />
                  <div className="h-1.5 w-20 bg-white/20 rounded-sm mt-2" />
                  <div className="h-1.5 w-14 bg-white/20 rounded-sm" />
                </div>
              </div>

              {/* barcode */}
              <div className="mt-4 flex items-end gap-2">
                <div className="flex gap-px items-end">
                  {[2,1,3,1,2,1,1,3,2,1,2,1,3,1,2,1,1,2,3,1,2,1,1,2].map((w, i) => (
                    <div key={i} style={{ width: w, height: 16 + (i % 3) * 2, background: 'rgba(255,255,255,0.5)' }} />
                  ))}
                </div>
                <p className="text-white/20 text-[0.45rem] font-mono">GEO-2024-042</p>
              </div>
            </div>
          </div>
        </div>



        {/* Footer — trusted by */}
        <div className="shrink-0 mt-auto">
          <p className="text-white/20 text-[0.6rem] font-semibold uppercase tracking-widest mb-3">
            Trusted by schools across India
          </p>
          <div className="flex flex-wrap gap-2">
            {SCHOOLS.map(name => (
              <span key={name} className="text-[0.6rem] font-medium text-white/30 border border-white/10 px-2.5 py-1 rounded-md">
                {name}
              </span>
            ))}
          </div>
          <p className="text-white/15 text-[0.6rem] font-medium mt-6">
            © {new Date().getFullYear()} Gographic. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT — login form */}
      <div className="flex-1 lg:flex-none lg:w-[420px] flex flex-col h-full overflow-y-auto lg:overflow-hidden border-l border-slate-100">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 pb-6 shrink-0 border-b border-slate-100">
          <div className="w-7 h-7 bg-[#0a0a0a] rounded flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm leading-none">G</span>
          </div>
          <span className="text-slate-900 font-bold text-base tracking-tight">Gographic</span>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-10 lg:px-12">
          <div className="w-full max-w-xs">

            <div className="mb-8">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
                School Portal
              </p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">Sign in</h1>
              <p className="text-slate-400 text-sm">
                Enter your credentials to access the portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  User Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-300 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-300 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 bg-white"
                  />
                </div>
              </div>

              {message && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2.5 rounded-lg border border-rose-100">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white bg-[#0a0a0a] hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {loading
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  : <FiLogIn className="w-3.5 h-3.5" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="text-[0.6rem] text-slate-300 font-medium mt-8">
              © {new Date().getFullYear()} Gographic · School Identity &amp; Printing Solutions
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
