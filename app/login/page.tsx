'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    }
  }, [user, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await login(email, password, 'faculty');
    setMessage(result.message);
    if (result.success) {
      router.push('/student');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white px-4 sm:px-6 py-10 sm:py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Left Side — visible on large screens */}
          <div className="space-y-6 hidden lg:block">
            <div className="space-y-3">
              <div className="text-5xl font-bold text-green-600">📚</div>
              <h2 className="text-4xl font-bold text-slate-900">College Login</h2>
              <p className="text-lg text-slate-600">Access your college dashboard to manage student data, registrations, and exports with ease.</p>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="text-2xl">🔐</div>
                <div>
                  <h4 className="font-semibold text-slate-900">Secure Authentication</h4>
                  <p className="text-sm text-slate-600">Your data is protected with industry-standard security</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h4 className="font-semibold text-slate-900">Quick Access</h4>
                  <p className="text-sm text-slate-600">Login once and manage all your student records</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h4 className="font-semibold text-slate-900">Easy Management</h4>
                  <p className="text-sm text-slate-600">Intuitive interface for all college operations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side — Form */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-slate-200/70 bg-white/90 p-5 sm:p-8 lg:p-10 shadow-xl backdrop-blur-xl">
            {/* Mobile brand header */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <span className="text-2xl font-bold text-green-600">📚</span>
              <div>
                <p className="font-bold text-green-600 leading-none">Gographic</p>
                <p className="text-xs text-slate-400">College Portal</p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-green-600 flex items-center gap-2">
                <FiLogIn className="w-4 h-4" />
                College Login Only
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Access Your Account</h1>
              <p className="text-slate-600 text-sm sm:text-base">Enter your credentials to continue managing student data.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <FiLock className="w-4 h-4" />
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input-field"
                />
              </label>
              {message ? <p className="text-sm text-rose-500 bg-rose-50 p-3 rounded-lg">{message}</p> : null}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white transition duration-300 hover:bg-green-700 hover:shadow-lg active:scale-[0.98]"
              >
                <FiLogIn className="w-5 h-5" />
                Login to Dashboard
              </button>
            </form>

            <div className="mt-6 sm:mt-8 text-center text-sm text-slate-600 space-y-2">
              <p>New here? <Link href="/register" className="text-green-600 hover:text-green-700 font-semibold">Register your college</Link></p>
              <p>Or switch to <Link href="/admin" className="text-green-600 hover:text-green-700 font-semibold">admin login</Link>.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
