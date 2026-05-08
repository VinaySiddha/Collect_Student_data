'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (user) {
    if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/student');
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = login(email, password, 'faculty');
    setMessage(result.message);
    if (result.success) {
      router.push('/student');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white px-6 py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Left Side - Content */}
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

          {/* Right Side - Form */}
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-10 shadow-glass backdrop-blur-xl">
            <div className="mb-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600/90 flex items-center gap-2">
                <FiLogIn className="w-4 h-4" />
                College Login Only
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">Access Your Account</h1>
              <p className="text-slate-600">Enter your credentials to continue managing student data.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="input-field w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-cyan-400 focus:outline-none transition"
                />
              </label>
              {message ? <p className="text-sm text-rose-500 bg-rose-50 p-3 rounded-lg">{message}</p> : null}
              <button 
                type="submit" 
                className="button-primary w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
              >
                <FiLogIn className="w-5 h-5" />
                Login to Dashboard
              </button>
            </form>
            <div className="mt-8 text-center text-sm text-slate-600">
              <p>New here? <Link href="/register" className="text-cyan-600 hover:text-cyan-700 font-semibold">Register your college</Link></p>
              <p className="mt-3">Or switch to <Link href="/admin" className="text-cyan-600 hover:text-cyan-700 font-semibold">admin login</Link>.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
