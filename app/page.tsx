'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  FiLogIn, FiArrowRight, FiMail, FiPhone, FiMapPin,
  FiUsers, FiCamera, FiShield, FiCheckCircle,
  FiPrinter, FiFileText, FiCpu, FiStar, FiSend, FiUser, FiHome,
} from 'react-icons/fi';
import { submitInquiry } from '@/lib/actions';

const STATS = [
  { value: '10,000+', label: 'Students registered' },
  { value: '50+',     label: 'Institutions served'  },
  { value: '99.9%',  label: 'Uptime reliability'    },
  { value: '< 24h',  label: 'Average turnaround'    },
];

const SERVICES = [
  { icon: FiUsers,     title: 'Student ID Cards',  desc: 'High-quality ID production with photo integration and school branding for any institution.' },
  { icon: FiFileText,  title: 'Bulk Import',        desc: 'Upload Excel files and batch-process hundreds of student records in minutes.' },
  { icon: FiPrinter,   title: 'ID Generation',      desc: 'Print-ready card layouts with custom design, QR codes, and precision colour matching.' },
  { icon: FiCamera,    title: 'Photo Printing',     desc: 'Vibrant, high-resolution prints with superior colour accuracy for every order.' },
  { icon: FiCpu,       title: 'PDF Reports',         desc: 'Export full registry reports and audit logs as PDFs at the click of a button.' },
  { icon: FiStar,      title: 'Full Solutions',      desc: 'End-to-end branding and printing packages tailored to your institution\'s identity.' },
];

const PROCESS = [
  { step: '01', title: 'Submit Data',  desc: 'Faculty uploads student information securely via the portal.' },
  { step: '02', title: 'Design',       desc: 'Our team creates print-ready ID card layouts for your brand.' },
  { step: '03', title: 'Print',        desc: 'Professional printing with full quality control checks.' },
  { step: '04', title: 'Deliver',      desc: 'Cards dispatched quickly and safely to your institution.' },
];

const WHY_US = [
  { title: 'Quality Assurance',   desc: 'Premium materials and rigorous quality checks on every order.' },
  { title: 'Creative Excellence', desc: 'Expert design team with years of industry experience.' },
  { title: 'Fast Turnaround',     desc: 'Quick delivery without ever compromising quality.' },
  { title: 'Dedicated Support',   desc: 'With you at every step from order to delivery.' },
];

const CONTACTS = [
  { icon: FiPhone,  label: 'WhatsApp / Call', value: '+91 95410 2246',                    href: 'tel:+919541022460' },
  { icon: FiMail,   label: 'Email',           value: 'info@gographic.in',                  href: 'mailto:info@gographic.in' },
  { icon: FiMapPin, label: 'Address',         value: 'Nazuk Muhalla, Ganjiwara, Anantnag, J&K', href: '#' },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const [inquiry, setInquiry] = useState({ institutionName: '', contactName: '', email: '', phone: '', message: '' });
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleInquiry(e: React.FormEvent) {
    e.preventDefault();
    setInquiryLoading(true);
    setInquiryStatus(null);
    const result = await submitInquiry(inquiry);
    setInquiryLoading(false);
    setInquiryStatus({ ok: result.success, msg: result.message });
    if (result.success) setInquiry({ institutionName: '', contactName: '', email: '', phone: '', message: '' });
  }

  const services     = useInView();
  const process      = useInView();
  const why          = useInView();
  const getConnected = useInView();
  const contact      = useInView();

  return (
    <main className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-black text-slate-900 text-base tracking-tight">Gographic</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="mailto:info@gographic.in" className="hidden sm:inline-flex text-xs font-black text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest">
              Contact
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 transition-colors px-4 py-2 text-xs font-black text-white"
            >
              <FiLogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-slate-950 overflow-hidden min-h-[100dvh] flex flex-col justify-center pt-16">

        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] rounded-full bg-sky-500/15 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[90px]" />
        </div>

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-10 py-20 lg:py-28 w-full">
          <div className="grid gap-16 lg:grid-cols-2 items-center">

            {/* Left */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(28px)',
                transition: 'opacity 0.7s ease, transform 0.7s ease',
              }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/50 text-[0.62rem] font-black uppercase tracking-widest">School ID Card Management</span>
              </div>

              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
                Complete<br />
                Student Identity<br />
                <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  & Printing.
                </span>
              </h1>

              <p className="text-white/40 text-base leading-relaxed max-w-md mb-10">
                Design, manage, and bulk-print student ID cards with school branding, photo integration, and real-time tracking — all in one secure portal.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-white hover:bg-white/90 transition-all active:scale-[0.98] px-7 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-white/10"
                >
                  <FiLogIn className="w-4 h-4" />
                  Login to Portal
                  <FiArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:info@gographic.in"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 hover:bg-white/5 hover:border-white/30 transition-all px-7 py-3.5 text-sm font-black text-white/60 hover:text-white"
                >
                  Contact Us
                </a>
              </div>
            </div>

            {/* Right — feature cards */}
            <div
              className="grid grid-cols-2 gap-3"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(28px)',
                transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s',
              }}
            >
              {[
                { icon: FiUsers,    title: 'Student ID Cards', desc: 'High-quality IDs for any institution' },
                { icon: FiFileText, title: 'Bulk Import',       desc: 'Excel batch processing in minutes' },
                { icon: FiPrinter,  title: 'ID Generation',    desc: 'Print-ready cards with photos' },
                { icon: FiShield,   title: 'Audit Logs',        desc: 'Real-time activity tracking' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="group rounded-2xl border border-white/8 bg-white/5 hover:bg-white/10 hover:border-white/15 transition-all duration-300 p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center group-hover:bg-white/12 transition-colors">
                    <Icon className="w-4.5 h-4.5 text-white/60 group-hover:text-white/80 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white mb-1">{title}</p>
                    <p className="text-xs text-white/35 font-medium leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 pt-10 border-t border-white/8"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.7s ease 0.3s',
            }}
          >
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl lg:text-3xl font-black text-white mb-1">{value}</p>
                <p className="text-white/30 text-xs font-medium uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── SERVICES ── */}
      <section className="px-6 py-24 lg:px-10 bg-white">
        <div ref={services.ref} className="mx-auto max-w-6xl">
          <div
            className="text-center mb-14"
            style={{ opacity: services.inView ? 1 : 0, transform: services.inView ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
              <span className="text-slate-500 text-[0.62rem] font-black uppercase tracking-widest">Our Services</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-4">Bringing Your Vision to Life</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              From student ID cards to full branding packages — precision and creativity on every project.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 p-6"
                style={{
                  opacity: services.inView ? 1 : 0,
                  transform: services.inView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s, box-shadow 0.3s, border-color 0.3s`,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center mb-4 group-hover:bg-slate-800 transition-colors">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-slate-900 mb-2 text-sm">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="px-6 py-24 lg:px-10 bg-slate-950 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-60px] left-[-40px] w-[350px] h-[350px] rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="absolute bottom-[-40px] right-[-40px] w-[300px] h-[300px] rounded-full bg-sky-500/10 blur-[90px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

        <div ref={process.ref} className="relative mx-auto max-w-6xl">
          <div
            className="text-center mb-14"
            style={{ opacity: process.inView ? 1 : 0, transform: process.inView ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="text-white/50 text-[0.62rem] font-black uppercase tracking-widest">How It Works</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-4">Simple. Fast. Precise.</h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
              Four steps from data submission to printed ID cards in your hands.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROCESS.map(({ step, title, desc }, i) => (
              <div
                key={step}
                className="relative rounded-2xl border border-white/8 bg-white/5 hover:bg-white/8 hover:border-white/15 transition-all duration-300 p-6"
                style={{
                  opacity: process.inView ? 1 : 0,
                  transform: process.inView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
                }}
              >
                <span className="text-5xl font-black text-white/8 leading-none block mb-4">{step}</span>
                <p className="font-black text-white text-sm mb-2">{title}</p>
                <p className="text-white/35 text-xs leading-relaxed">{desc}</p>
                {i < PROCESS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                    <FiArrowRight className="w-4 h-4 text-white/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="px-6 py-24 lg:px-10 bg-white">
        <div ref={why.ref} className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div
              style={{ opacity: why.inView ? 1 : 0, transform: why.inView ? 'translateX(0)' : 'translateX(-24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
                <span className="text-slate-500 text-[0.62rem] font-black uppercase tracking-widest">Why Choose Us</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-5">
                Because Your Brand<br />Deserves to Be<br />
                <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">Remembered.</span>
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-md">
                At Gographic, we craft experiences — not just prints. From creative design to flawless execution, every project leaves a lasting impression.
              </p>
              <div className="space-y-5">
                {WHY_US.map(({ title, desc }, i) => (
                  <div
                    key={title}
                    className="flex gap-4"
                    style={{
                      opacity: why.inView ? 1 : 0,
                      transform: why.inView ? 'translateX(0)' : 'translateX(-16px)',
                      transition: `opacity 0.5s ease ${0.1 + i * 0.09}s, transform 0.5s ease ${0.1 + i * 0.09}s`,
                    }}
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{title}</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Portal CTA card */}
            <div
              className="rounded-3xl bg-slate-950 p-8 lg:p-10 relative overflow-hidden"
              style={{ opacity: why.inView ? 1 : 0, transform: why.inView ? 'translateX(0)' : 'translateX(24px)', transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s' }}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-40px] right-[-40px] w-[220px] h-[220px] rounded-full bg-violet-600/20 blur-[80px]" />
                <div className="absolute bottom-[-30px] left-[-30px] w-[180px] h-[180px] rounded-full bg-sky-500/15 blur-[70px]" />
              </div>
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <p className="text-[0.62rem] font-black uppercase tracking-widest text-white/40 mb-3">School Portal</p>
                <h3 className="text-2xl font-black text-white mb-4 leading-tight">Manage your institution's ID cards with ease</h3>
                <p className="text-white/40 text-xs leading-relaxed mb-8">
                  Bulk upload, real-time tracking, role-based access, audit logs — everything you need in one secure platform.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {['Bulk student registration', 'Instant ID card generation', 'Role-based access control', 'Real-time audit logs'].map(f => (
                    <li key={f} className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-2 h-2 text-emerald-400" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="text-white/50 text-xs font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-white hover:bg-white/90 transition-all active:scale-[0.98] px-6 py-3 text-sm font-black text-slate-950"
                >
                  <FiLogIn className="w-4 h-4" />
                  Sign In to Portal
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GET CONNECTED ── */}
      <section className="px-6 py-24 lg:px-10 bg-slate-950 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-80px] right-[-60px] w-[420px] h-[420px] rounded-full bg-emerald-500/15 blur-[110px]" />
          <div className="absolute bottom-[-60px] left-[-40px] w-[380px] h-[380px] rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full bg-sky-500/10 blur-[90px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

        <div ref={getConnected.ref} className="relative mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left — platform intro */}
            <div
              style={{ opacity: getConnected.inView ? 1 : 0, transform: getConnected.inView ? 'translateX(0)' : 'translateX(-24px)', transition: 'opacity 0.65s ease, transform 0.65s ease' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[0.62rem] font-black uppercase tracking-widest">Get Connected</span>
              </div>

              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
                Ready to Bring Your<br />Institution Online?
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-md mb-10">
                Gographic is the all-in-one school ID management platform trusted by institutions across Jammu &amp; Kashmir. We handle everything — from student registration and photo integration to bulk printing and delivery — so your team can focus on what matters most.
              </p>

              <ul className="space-y-4 mb-10">
                {[
                  { title: 'Dedicated Onboarding', desc: 'Our team sets up your institution\'s portal from scratch, no technical knowledge required.' },
                  { title: 'Custom Branding', desc: 'ID cards designed to reflect your school\'s identity — colours, logo, and layout.' },
                  { title: 'Secure Role-based Access', desc: 'Faculty, faculty-admin, and admin roles — each with the right level of access.' },
                  { title: 'End-to-end Delivery', desc: 'Printed cards dispatched directly to your institution, fully quality-checked.' },
                ].map(({ title, desc }, i) => (
                  <li
                    key={title}
                    className="flex gap-4"
                    style={{
                      opacity: getConnected.inView ? 1 : 0,
                      transform: getConnected.inView ? 'translateX(0)' : 'translateX(-16px)',
                      transition: `opacity 0.5s ease ${0.15 + i * 0.09}s, transform 0.5s ease ${0.15 + i * 0.09}s`,
                    }}
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-black text-white text-sm">{title}</p>
                      <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — inquiry form */}
            <div
              className="rounded-3xl bg-white/5 border border-white/10 p-8 lg:p-10 relative overflow-hidden backdrop-blur-sm"
              style={{ opacity: getConnected.inView ? 1 : 0, transform: getConnected.inView ? 'translateX(0)' : 'translateX(24px)', transition: 'opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s' }}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-30px] right-[-30px] w-[180px] h-[180px] rounded-full bg-emerald-500/10 blur-[70px]" />
              </div>
              <div className="relative">
                <p className="text-[0.62rem] font-black uppercase tracking-widest text-white/30 mb-1">Send an Inquiry</p>
                <h3 className="text-xl font-black text-white leading-tight mb-6">
                  Let's onboard your institution.
                </h3>

                {inquiryStatus?.ok ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-5">
                      <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-white font-black text-base mb-2">Inquiry Sent!</p>
                    <p className="text-white/40 text-xs leading-relaxed max-w-xs">{inquiryStatus.msg}</p>
                    <button
                      onClick={() => setInquiryStatus(null)}
                      className="mt-6 text-[0.65rem] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
                    >
                      Send another →
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleInquiry} className="space-y-4">

                    {/* Institution name */}
                    <div>
                      <label className="block text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-1.5">
                        Institution Name <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <FiHome className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={inquiry.institutionName}
                          onChange={e => setInquiry(p => ({ ...p, institutionName: e.target.value }))}
                          placeholder="e.g. Government Higher Secondary School"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Name + Phone row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-1.5">
                          Your Name <span className="text-emerald-400">*</span>
                        </label>
                        <div className="relative">
                          <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={inquiry.contactName}
                            onChange={e => setInquiry(p => ({ ...p, contactName: e.target.value }))}
                            placeholder="Full name"
                            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all duration-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-1.5">
                          Phone
                        </label>
                        <div className="relative">
                          <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                          <input
                            type="tel"
                            value={inquiry.phone}
                            onChange={e => setInquiry(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+91 ..."
                            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-1.5">
                        Email <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={inquiry.email}
                          onChange={e => setInquiry(p => ({ ...p, email: e.target.value }))}
                          placeholder="principal@school.edu"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-1.5">
                        Message
                      </label>
                      <textarea
                        rows={3}
                        value={inquiry.message}
                        onChange={e => setInquiry(p => ({ ...p, message: e.target.value }))}
                        placeholder="Tell us about your institution and what you need…"
                        className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all duration-200 resize-none"
                      />
                    </div>

                    {/* Error */}
                    {inquiryStatus && !inquiryStatus.ok && (
                      <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                        <p className="text-rose-300 text-xs leading-relaxed">{inquiryStatus.msg}</p>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={inquiryLoading}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 mt-1"
                    >
                      {inquiryLoading ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <FiSend className="w-4 h-4" />
                          Send Inquiry
                          <FiArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="pt-4 border-t border-white/8 flex items-center justify-between gap-3">
                      <p className="text-white/25 text-[0.6rem]">Already have portal access?</p>
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 hover:bg-white/12 border border-white/12 transition-all px-3 py-1.5 text-[0.65rem] font-black text-white/60 hover:text-white"
                      >
                        <FiLogIn className="w-3 h-3" />
                        Sign In
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="px-6 py-24 lg:px-10 bg-slate-50">
        <div ref={contact.ref} className="mx-auto max-w-5xl">
          <div
            className="text-center mb-14"
            style={{ opacity: contact.inView ? 1 : 0, transform: contact.inView ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
              <span className="text-slate-500 text-[0.62rem] font-black uppercase tracking-widest">Get In Touch</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-4">Your Vision, Our Print</h2>
            <p className="text-slate-500 text-sm">
              Reach out for quotes, queries, or a quick hello — we are just a message away.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {CONTACTS.map(({ icon: Icon, label, value, href }, i) => (
              <a
                key={label}
                href={href}
                className="group rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 p-6 text-center"
                style={{
                  opacity: contact.inView ? 1 : 0,
                  transform: contact.inView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s, box-shadow 0.3s, border-color 0.3s`,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center mx-auto mb-4 group-hover:bg-slate-800 transition-colors">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-black text-slate-900 text-xs uppercase tracking-widest mb-2">{label}</p>
                <p className="text-slate-500 text-sm font-medium">{value}</p>
              </a>
            ))}
          </div>

          {/* CTA banner */}
          <div
            className="relative rounded-3xl bg-slate-950 overflow-hidden p-10 text-center"
            style={{
              opacity: contact.inView ? 1 : 0,
              transform: contact.inView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-[-60px] left-[-40px] w-[300px] h-[300px] rounded-full bg-violet-600/20 blur-[100px]" />
              <div className="absolute bottom-[-40px] right-[-40px] w-[260px] h-[260px] rounded-full bg-sky-500/15 blur-[90px]" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/50 text-[0.62rem] font-black uppercase tracking-widest">Portal Ready</span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black text-white mb-3">Ready to Get Started?</h3>
              <p className="text-white/40 text-sm mb-8 max-w-md mx-auto">Sign in to the portal or contact us directly for printing solutions.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-white hover:bg-white/90 transition-all active:scale-[0.98] px-7 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-white/10"
                >
                  <FiLogIn className="w-4 h-4" />
                  Login to Portal
                  <FiArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:info@gographic.in"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 hover:bg-white/5 hover:border-white/30 transition-all px-7 py-3.5 text-sm font-black text-white/60 hover:text-white"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 px-6 py-12 lg:px-10 border-t border-white/5">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-white text-sm">Gographic</p>
              <p className="text-white/25 text-[0.6rem] font-medium">Design · Print · Care</p>
            </div>
          </div>
          <p className="text-white/20 text-xs font-medium">
            © {new Date().getFullYear()} Gographic · School Identity & Printing Solutions
          </p>
          <div className="flex items-center gap-4">
            <a href="mailto:info@gographic.in" className="text-white/25 hover:text-white/50 transition-colors text-xs font-medium">Email</a>
            <a href="tel:+919541022460" className="text-white/25 hover:text-white/50 transition-colors text-xs font-medium">Phone</a>
          </div>
        </div>
      </footer>

    </main>
  );
}
