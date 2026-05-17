'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { FaWhatsapp } from 'react-icons/fa';
import { FiPhone, FiX, FiArrowRight, FiMessageCircle } from 'react-icons/fi';
import { submitCallbackRequest, type CallbackReason } from '@/lib/actions';

const REASONS: { value: CallbackReason; label: string; emoji: string }[] = [
  { value: 'product_details', label: 'Product Details', emoji: '📦' },
  { value: 'onboarding',      label: 'Onboarding',      emoji: '🎓' },
  { value: 'support',         label: 'Support',         emoji: '🛠️' },
];

export default function FloatingContact() {
  const pathname   = usePathname();
  const [open,     setOpen]    = useState(false);
  const [phone,    setPhone]   = useState('');
  const [reason,   setReason]  = useState<CallbackReason>('product_details');
  const [loading,  setLoading] = useState(false);
  const [status,   setStatus]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (pathname.startsWith('/admin') || pathname.startsWith('/faculty')) return null;

  function openModal() { setOpen(true); setStatus(null); setExpanded(false); }
  function closeModal() { setOpen(false); setStatus(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const result = await submitCallbackRequest({ phone, reason });
    setLoading(false);
    setStatus({ ok: result.success, msg: result.message });
    if (result.success) { setPhone(''); setReason('product_details'); }
  }

  return (
    <>
      {/* ── Floating action cluster ── */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5">

        {/* Labels — appear on expand */}
        {expanded && (
          <>
            {/* WhatsApp */}
            <a
              href="https://wa.me/919541022460"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setExpanded(false)}
              className="flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-2xl shadow-lg shadow-green-500/30 pl-4 pr-5 py-3 transition-all duration-200 hover:shadow-xl active:scale-95 animate-in slide-in-from-right-4 fade-in"
            >
              <FaWhatsapp className="w-5 h-5 shrink-0" />
              <span className="text-sm font-black whitespace-nowrap">Chat on WhatsApp</span>
            </a>

            {/* Callback */}
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-3 bg-slate-900 hover:bg-violet-600 text-white rounded-2xl shadow-lg shadow-slate-900/25 pl-4 pr-5 py-3 transition-all duration-200 hover:shadow-xl active:scale-95 animate-in slide-in-from-right-4 fade-in"
            >
              <FiPhone className="w-5 h-5 shrink-0" />
              <span className="text-sm font-black whitespace-nowrap">Request Callback</span>
            </button>
          </>
        )}

        {/* Main toggle FAB */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-label={expanded ? 'Close contact options' : 'Contact us'}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
            expanded
              ? 'bg-slate-700 rotate-45 shadow-slate-900/30'
              : 'bg-[#25D366] shadow-green-500/40 hover:bg-[#1ebe5d] hover:shadow-green-500/50 hover:scale-105'
          }`}
        >
          {expanded
            ? <FiX className="w-6 h-6 text-white" />
            : <FaWhatsapp className="w-7 h-7 text-white" />
          }
        </button>

        {/* Pulse ring — only when collapsed */}
        {!expanded && (
          <span className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-[#25D366]/40 animate-ping pointer-events-none" />
        )}
      </div>

      {/* ── Callback modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                  <FiPhone className="w-4.5 h-4.5 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">Request a Callback</h2>
                  <p className="text-[0.65rem] text-slate-400 font-medium">We'll call you back within a few hours</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {status?.ok ? (
                /* Success state */
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-black text-slate-900 text-base mb-2">Request Received!</p>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">{status.msg}</p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href="https://wa.me/919541022460"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl px-5 py-2.5 text-sm font-black transition active:scale-95"
                    >
                      <FaWhatsapp className="w-4 h-4" />
                      Chat Now Instead
                    </a>
                    <button
                      onClick={closeModal}
                      className="text-sm font-black text-slate-400 hover:text-slate-700 transition px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Phone */}
                  <div>
                    <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Your Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative group">
                      <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors pointer-events-none" />
                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setStatus(null); }}
                        placeholder="+91 98765 43210"
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-300 outline-none transition-all duration-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 bg-white hover:border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Reason pills */}
                  <div>
                    <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                      I need help with
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {REASONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setReason(opt.value)}
                          className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-black border-2 transition-all duration-150 ${
                            reason === opt.value
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">{opt.emoji}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {status && !status.ok && (
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <p className="text-rose-600 text-xs font-bold leading-relaxed">{status.msg}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || !phone.trim()}
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-950 hover:bg-violet-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/20"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Confirm Request
                        <FiArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* WhatsApp alternative */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[0.6rem] font-black text-slate-300 uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  <a
                    href="https://wa.me/919541022460"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/10 hover:border-[#25D366]/50 transition-all px-5 py-3 text-sm font-black text-[#128C7E]"
                  >
                    <FaWhatsapp className="w-4.5 h-4.5" />
                    Message us on WhatsApp
                  </a>

                  <p className="text-center text-[0.6rem] text-slate-300 font-medium">
                    Direct line:{' '}
                    <a href="tel:+919541022460" className="text-slate-500 font-black hover:text-slate-900 transition">
                      +91 95410 2246
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
