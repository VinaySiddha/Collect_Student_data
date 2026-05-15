'use client';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#fcfdfe] overflow-hidden">

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-sky-200/30 blur-[96px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-[440px] h-[440px] rounded-full bg-emerald-200/25 blur-[80px] animate-pulse [animation-delay:1s]" />
      </div>

      {/* Card */}
      <div className="relative flex flex-col items-center gap-7 px-10 py-10 rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/60">

        {/* Logo mark */}
        <div className="relative">
          {/* Spinning ring */}
          <svg className="absolute inset-0 w-full h-full animate-spin [animation-duration:2.4s]" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="url(#ringGrad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="140" strokeDashoffset="100" />
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center">
          <p className="text-xl font-black tracking-tight text-slate-900 leading-none">Gographic</p>
          <p className="text-xs font-bold text-slate-400 mt-1 tracking-wide">Student Registry</p>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
            />
          ))}
        </div>

        {/* Status line */}
        <div className="w-48 overflow-hidden rounded-full h-0.5 bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]" />
        </div>
      </div>

      <p className="mt-6 text-[0.7rem] font-bold text-slate-300 tracking-widest uppercase">Initialising…</p>
    </div>
  );
}
