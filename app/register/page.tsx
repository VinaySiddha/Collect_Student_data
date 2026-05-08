'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FiUser, FiMail, FiLock, FiUserCheck, FiSettings } from 'react-icons/fi';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, colleges } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState(colleges[0] ?? '');
  const [role, setRole] = useState<'admin' | 'faculty'>('faculty');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!college && colleges.length) {
      setCollege(colleges[0]);
    }
  }, [colleges, college]);

  if (user) {
    router.push('/student');
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = register(name, email, password, college, role);
    setMessage(result.message);
    if (result.success) {
      router.push('/student');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white px-6 py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Left Side - Content with Images */}
          <div className="space-y-6 hidden lg:block">
            <div className="space-y-3">
              <div className="text-5xl font-bold text-green-600">🎓</div>
              <h2 className="text-4xl font-bold text-slate-900">College Registration</h2>
              <p className="text-lg text-slate-600">Create your account to manage student registrations, data collection, and printing services.</p>
            </div>

            {/* Role Info Cards */}
            <div className="space-y-4 mt-8">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-3">
                  <div className="text-2xl">👨‍💼</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FiSettings className="w-4 h-4" /> College Admin
                    </h4>
                    <p className="text-sm text-slate-600">Full control over college operations and staff management</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex gap-3">
                  <div className="text-2xl">👨‍🏫</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FiUserCheck className="w-4 h-4" /> College Faculty
                    </h4>
                    <p className="text-sm text-slate-600">Register and manage student data and registrations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex gap-3">
                <div className="text-xl">✅</div>
                <p className="text-sm text-slate-600"><span className="font-semibold">Quick Setup</span> - Get started in minutes</p>
              </div>
              <div className="flex gap-3">
                <div className="text-xl">✅</div>
                <p className="text-sm text-slate-600"><span className="font-semibold">Secure Data</span> - Enterprise-grade security</p>
              </div>
              <div className="flex gap-3">
                <div className="text-xl">✅</div>
                <p className="text-sm text-slate-600"><span className="font-semibold">24/7 Support</span> - Always here to help</p>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-10 shadow-glass backdrop-blur-xl">
            <div className="mb-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600/90 flex items-center gap-2">
                <FiUserCheck className="w-4 h-4" />
                College Registration
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">Create Your Account</h1>
              <p className="text-slate-600">Register once, then manage student details, data exports, and printing orders.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* College/School */}
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiSettings className="w-4 h-4" />
                  College/School Name
                </span>
                <select
                  value={college}
                  onChange={(event) => setCollege(event.target.value)}
                  required
                  className="input-field w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-cyan-400 focus:outline-none transition"
                >
                  {colleges.length ? colleges.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  )) : (
                    <option value="">Select college</option>
                  )}
                </select>
              </label>

              {/* Full Name */}
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiUser className="w-4 h-4" />
                  Full Name
                </span>
                <input 
                  value={name} 
                  onChange={(event) => setName(event.target.value)} 
                  placeholder="Enter your full name"
                  required 
                  className="input-field w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-cyan-400 focus:outline-none transition"
                />
              </label>

              {/* Email */}
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiMail className="w-4 h-4" />
                  Email Address
                </span>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(event) => setEmail(event.target.value)} 
                  placeholder="Enter your email"
                  required 
                  className="input-field w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-cyan-400 focus:outline-none transition"
                />
              </label>

              {/* Password */}
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiLock className="w-4 h-4" />
                  Password
                </span>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(event) => setPassword(event.target.value)} 
                  placeholder="Create a strong password"
                  required 
                  className="input-field w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-cyan-400 focus:outline-none transition"
                />
              </label>

              {/* Role Selection */}
              <div className="block">
                <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiSettings className="w-4 h-4" />
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('faculty')}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                      role === 'faculty'
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl">👨‍🏫</div>
                    <span className="text-sm font-semibold">College Faculty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                      role === 'admin'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl">👨‍💼</div>
                    <span className="text-sm font-semibold">College Admin</span>
                  </button>
                </div>
              </div>

              {message ? <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">{message}</p> : null}
              <button 
                type="submit" 
                className="button-primary w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
              >
                <FiUserCheck className="w-5 h-5" />
                Create Account
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-600">
              <p>Already have an account? <Link href="/login" className="text-cyan-600 hover:text-cyan-700 font-semibold">Login here</Link>.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
