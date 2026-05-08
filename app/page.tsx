import Link from 'next/link';
import Image from 'next/image';
import { FiPrinter, FiUsers, FiAward, FiBarChart } from 'react-icons/fi';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative isolate px-6 py-20 lg:px-10 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 -z-10 opacity-15">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-green-50 via-white to-white" />
        </div>
        
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 items-center lg:grid-cols-2">
            <div className="space-y-8">
              <div className="space-y-3">
                <h1 className="text-6xl font-bold text-slate-950 leading-tight">
                  Gographic
                </h1>
                <p className="text-2xl font-semibold text-green-600">Design | Print | Care</p>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                We bring your vision to life with high-quality print solutions. From custom designs to professional printing, we deliver precision, creativity, and lasting impact on every project.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg">
                  <FiUsers className="w-5 h-5" />
                  Submit Student Data
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-green-600 px-8 py-3 font-semibold text-green-600 hover:bg-green-50 transition-all duration-300">
                  <FiBarChart className="w-5 h-5" />
                  Student Login
                </Link>
              </div>
            </div>
            <div className="glass-panel p-8 shadow-xl rounded-3xl">
              <div className="space-y-6 rounded-2xl bg-gradient-to-br from-green-50 to-white p-8 border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FiPrinter className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-sm uppercase tracking-widest font-semibold text-green-700">Professional Printing</h2>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900">Student ID Card Collection</h3>
                  {/* Student ID Card Image */}
                  <div className="mt-4 rounded-xl h-48 overflow-hidden shadow-md border border-slate-200">
                    <img 
                      src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=500&q=80" 
                      alt="Student ID Card" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-slate-600">
                  Easy data collection for colleges. Register your student information, and our team handles the rest with precision and care.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white border border-green-100 p-5 hover:shadow-md transition">
                    <FiBarChart className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-sm text-slate-500 font-semibold">Secure Process</p>
                    <p className="mt-2 font-semibold text-slate-900">Seamless Data Entry</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-green-100 p-5 hover:shadow-md transition">
                    <FiPrinter className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-sm text-slate-500 font-semibold">Quick Results</p>
                    <p className="mt-2 font-semibold text-slate-900">Fast Printing Service</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="px-6 py-16 lg:px-10 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-widest font-semibold text-green-600 mb-3">Our Services</h2>
            <h3 className="text-4xl font-bold text-slate-950 mb-4">Bringing Your Vision to Life</h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              At Gographic, we offer a variety of services to meet your needs — ensuring precision, creativity, and lasting impact on every project.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Business Cards', desc: 'Professional business card printing with premium finishes', icon: '🎨' },
              { title: 'Custom Designs', desc: 'Tailored design solutions for your unique brand identity', icon: '✏️' },
              { title: 'Student ID Cards', desc: 'High-quality ID card production for educational institutions', icon: '🎓' },
              { title: 'Photo Printing', desc: 'Premium photo prints with vibrant colors and clarity', icon: '📸' },
              { title: 'Custom Mugs', desc: 'Personalized mugs perfect for gifts and merchandise', icon: '☕' },
              { title: 'Full Solutions', desc: 'Complete branding and printing packages for businesses', icon: '⭐' },
            ].map((service, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-green-200 transition-all duration-300 bg-slate-50 hover:bg-green-50">
                <div className="text-4xl mb-3">{service.icon}</div>
                <h4 className="font-bold text-lg text-slate-900 mb-2">{service.title}</h4>
                <p className="text-slate-600 text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Process Section */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-widest font-semibold text-green-600 mb-3">Our Process</h2>
            <h3 className="text-4xl font-bold text-slate-950 mb-4">From Idea to Delivery</h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We make printing simple and stress-free. Here's how your order moves from concept to doorstep — handled by experienced hands at every stage.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Idea', desc: 'Share your vision and requirements' },
              { step: '2', title: 'Design', desc: 'Our team creates the perfect design' },
              { step: '3', title: 'Print', desc: 'Professional printing with quality control' },
              { step: '4', title: 'Delivery', desc: 'Fast delivery to your doorstep' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="rounded-2xl border-2 border-green-200 bg-white p-6 text-center h-full">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-bold mb-4">
                    {item.step}
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
                {i < 3 && <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-green-300 transform -translate-y-1/2" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="px-6 py-16 lg:px-10 bg-gradient-to-br from-green-50 to-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-widest font-semibold text-green-600 mb-3">Why Choose Us</h2>
            <h3 className="text-4xl font-bold text-slate-950 mb-4">Because Your Brand Deserves to Be Remembered</h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              At Gographic, we believe in more than just printing — we craft experiences. From creative design to flawless execution, every project leaves a lasting impression.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {[
              { icon: '✓', title: 'Quality Assurance', desc: 'Premium materials and rigorous quality checks' },
              { icon: '✓', title: 'Creative Excellence', desc: 'Expert design team with industry experience' },
              { icon: '✓', title: 'Fast Turnaround', desc: 'Quick service without compromising quality' },
              { icon: '✓', title: 'Customer Care', desc: 'Dedicated support at every step' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="text-2xl text-green-600 font-bold flex-shrink-0">{item.icon}</div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-6 py-16 lg:px-10 bg-white">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-widest font-semibold text-green-600 mb-3">Get In Touch</h2>
            <h3 className="text-4xl font-bold text-slate-950 mb-4">Your Vision, Our Print — Let's Talk!</h3>
            <p className="text-lg text-slate-600">
              We're just a message away. Reach out for quotes, queries, or a quick hello — let's make something great together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-2xl font-bold text-green-600 mb-3">📞</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">WhatsApp / Call</h4>
              <p className="text-slate-600 text-sm">+91 95410 2246</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-2xl font-bold text-green-600 mb-3">✉️</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">Email</h4>
              <p className="text-slate-600 text-sm">info@gographic.in</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-2xl font-bold text-green-600 mb-3">📍</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">Address</h4>
              <p className="text-slate-600 text-sm">Nazuk Muhalla, Ganjiwara,<br />Anantnag, Jammu & Kashmir</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="mb-6 text-green-100">
              Submit your student data or reach out to us for printing solutions
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-semibold text-green-600 hover:bg-green-50 transition">
                Register Now
              </Link>
              <a href="mailto:info@gographic.in" className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-3 font-semibold text-white hover:bg-white/10 transition">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 px-6 py-12 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-1">Gographic</h3>
            <p className="text-green-400 font-semibold">Design | Print | Care</p>
          </div>
          <p className="text-sm mb-6">
            Your trusted partner for creative design and quality printing solutions. From business branding to personal projects — we deliver ideas with precision, care, and style.
          </p>
          <div className="border-t border-slate-700 pt-6 text-sm">
            <p>© 2026 Gographic. All rights reserved. Professional Printing & Design Solutions.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
