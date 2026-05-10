import Link from 'next/link';
import { FiLogIn } from 'react-icons/fi';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* ── Hero ── */}
      <section className="relative bg-black overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none" />
        <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32 lg:px-10 relative">
          <div className="grid gap-16 lg:grid-cols-2 items-center">

            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Professional Printing Portal</p>
                <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight">
                  Gographic
                </h1>
                <p className="text-xl font-semibold text-white/50">Design · Print · Care</p>
              </div>
              <p className="text-base text-white/40 leading-relaxed max-w-md">
                High-quality student ID card printing for colleges and institutions. Manage student data, bulk import records, and get print-ready cards delivered with precision.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded bg-white px-7 py-3.5 text-sm font-black text-black transition hover:bg-white/90 shadow-lg"
                >
                  <FiLogIn className="w-4 h-4" />
                  Login to Portal
                </Link>
                <a
                  href="mailto:info@gographic.in"
                  className="inline-flex items-center gap-2 rounded border border-white/20 px-7 py-3.5 text-sm font-black text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  Contact Us
                </a>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🎓', title: 'Student ID Cards', desc: 'High-quality ID cards for institutions' },
                { icon: '📋', title: 'Bulk Import', desc: 'Upload Excel files for batch processing' },
                { icon: '🪪', title: 'ID Generation', desc: 'Print-ready cards with photo & details' },
                { icon: '📊', title: 'PDF Reports', desc: 'Export full registry reports instantly' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="rounded border border-white/10 bg-white/5 p-5 space-y-2 hover:bg-white/10 transition">
                  <span className="text-2xl">{icon}</span>
                  <p className="text-sm font-black text-white">{title}</p>
                  <p className="text-xs text-white/40 font-medium leading-snug">{desc}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="px-6 py-20 lg:px-10 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Our Services</p>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">Bringing Your Vision to Life</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-base">
              From student ID cards to full branding packages — we deliver precision and creativity on every project.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: '🎨', title: 'Business Cards', desc: 'Professional cards with premium finishes' },
              { icon: '✏️', title: 'Custom Designs', desc: 'Tailored solutions for your brand identity' },
              { icon: '🎓', title: 'Student ID Cards', desc: 'High-quality ID production for institutions' },
              { icon: '📸', title: 'Photo Printing', desc: 'Vibrant prints with superior colour accuracy' },
              { icon: '☕', title: 'Custom Mugs', desc: 'Personalised mugs for gifts and merchandise' },
              { icon: '⭐', title: 'Full Solutions', desc: 'Complete branding and printing packages' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded border border-slate-200 bg-white p-6 hover:shadow-md hover:border-slate-300 transition">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-black text-slate-900 mb-1">{title}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ── */}
      <section className="px-6 py-20 lg:px-10 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Why Choose Us</p>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-6">Because Your Brand Deserves to Be Remembered</h2>
              <p className="text-slate-500 text-base mb-8 leading-relaxed">
                At Gographic, we believe in more than just printing — we craft experiences. From creative design to flawless execution, every project leaves a lasting impression.
              </p>
              <div className="space-y-5">
                {[
                  { title: 'Quality Assurance', desc: 'Premium materials and rigorous quality checks on every order.' },
                  { title: 'Creative Excellence', desc: 'Expert design team with years of industry experience.' },
                  { title: 'Fast Turnaround', desc: 'Quick delivery without ever compromising quality.' },
                  { title: 'Dedicated Support', desc: 'We are with you at every step from order to delivery.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-6 h-6 rounded bg-black flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-xs font-black">✓</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{title}</p>
                      <p className="text-slate-500 text-sm mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { step: '01', title: 'Submit Data', desc: 'Faculty uploads student information via the portal' },
                { step: '02', title: 'Design', desc: 'Our team creates print-ready ID card layouts' },
                { step: '03', title: 'Print', desc: 'Professional printing with full quality control' },
                { step: '04', title: 'Deliver', desc: 'Cards dispatched quickly to your institution' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="rounded border border-slate-200 p-5">
                  <p className="text-3xl font-black text-slate-100 mb-2">{step}</p>
                  <p className="font-black text-slate-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-slate-500 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="px-6 py-20 lg:px-10 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Get In Touch</p>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">Your Vision, Our Print</h2>
            <p className="text-slate-500 text-base">
              Reach out for quotes, queries, or a quick hello — we are just a message away.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: '📞', label: 'WhatsApp / Call', value: '+91 95410 2246' },
              { icon: '✉️', label: 'Email', value: 'info@gographic.in' },
              { icon: '📍', label: 'Address', value: 'Nazuk Muhalla, Ganjiwara, Anantnag, J&K' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="rounded border border-slate-200 bg-white p-6 text-center">
                <div className="text-2xl mb-3">{icon}</div>
                <p className="font-black text-slate-900 text-sm mb-1">{label}</p>
                <p className="text-slate-500 text-sm">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-black rounded p-8 text-center">
            <h3 className="text-xl font-black text-white mb-2">Ready to Get Started?</h3>
            <p className="text-white/40 text-sm mb-6">Sign in to the portal or contact us directly for printing solutions.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded bg-white px-7 py-3 text-sm font-black text-black transition hover:bg-white/90"
              >
                <FiLogIn className="w-4 h-4" />
                Login to Portal
              </Link>
              <a
                href="mailto:info@gographic.in"
                className="inline-flex items-center gap-2 rounded border border-white/20 px-7 py-3 text-sm font-black text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <h3 className="text-lg font-black text-white mb-1">Gographic</h3>
          <p className="text-sm text-slate-500 mb-1">Design · Print · Care</p>
          <div className="border-t border-slate-800 mt-6 pt-6 text-xs text-slate-600">
            © {new Date().getFullYear()} Gographic. All rights reserved.
          </div>
        </div>
      </footer>

    </main>
  );
}
