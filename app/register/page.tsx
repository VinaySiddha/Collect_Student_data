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

  useEffect(() => {
    if (user) {
      router.push('/student');
    }
  }, [user, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await register(name, email, password, role, role === 'admin' ? undefined : college);
    setMessage(result.message);
    if (result.success) {
      router.push('/student');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white px-4 sm:px-6 py-10 sm:py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          {/* Left Side — visible on large screens */}
          <div className="space-y-6 hidden lg:block">
            <div className="space-y-3">
              <div className="text-5xl font-bold text-green-600">🎓</div>
              <h2 className="text-4xl font-bold text-slate-900">College Registration</h2>
              <p className="text-lg text-slate-600">Create your account to manage student registrations, data collection, and printing services.</p>
            </div>

            <div className="space-y-4 mt-8">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
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
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
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

          {/* Right Side — Form */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-slate-200/70 bg-white/90 p-5 sm:p-8 lg:p-10 shadow-xl backdrop-blur-xl">
            {/* Mobile brand header */}
            <div className="flex items-center gap-2 mb-5 lg:hidden">
              <span className="text-2xl font-bold text-green-600">🎓</span>
              <div>
                <p className="font-bold text-green-600 leading-none">Gographic</p>
                <p className="text-xs text-slate-400">College Registration</p>
              </div>
            </div>

            <div className="mb-5 sm:mb-8 space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-green-600 flex items-center gap-2">
                <FiUserCheck className="w-4 h-4" />
                College Registration
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Create Your Account</h1>
              <p className="text-slate-600 text-sm sm:text-base">Register once, then manage student details, data exports, and printing orders.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* College/School */}
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiSettings className="w-4 h-4" />
                  College/School Name
                </span>
                <select
                  value={college}
                  onChange={(event) => setCollege(event.target.value)}
                  required={role !== 'admin'}
                  className="input-field"
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
                  className="input-field"
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
                  className="input-field"
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
                  className="input-field"
                />
              </label>

              {/* Role Selection */}
              <div className="block">
                <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiSettings className="w-4 h-4" />
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('faculty')}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                      role === 'faculty'
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl">👨‍🏫</div>
                    <span className="text-xs sm:text-sm font-semibold">College Faculty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                      role === 'admin'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl">👨‍💼</div>
                    <span className="text-xs sm:text-sm font-semibold">College Admin</span>
                  </button>
                </div>
              </div>

              {message ? <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">{message}</p> : null}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white transition duration-300 hover:bg-green-700 hover:shadow-lg active:scale-[0.98]"
              >
                <FiUserCheck className="w-5 h-5" />
                Create Account
              </button>
            </form>

            <div className="mt-6 sm:mt-8 text-center text-sm text-slate-600">
              <p>Already have an account? <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold">Login here</Link>.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
