'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { FiHome, FiUserPlus, FiLogIn, FiLogOut, FiSettings } from 'react-icons/fi';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900 hover:opacity-80 transition">
          <span className="text-green-600 font-bold text-2xl">📚</span>
          <span className="text-green-600 font-bold text-xl">Gographic</span>
          <span className="text-xs text-slate-500 ml-1">Portal</span>
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg">
            <FiHome className="w-4 h-4" />
            Home
          </Link>
          <Link href="/register" className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg">
            <FiUserPlus className="w-4 h-4" />
            Register
          </Link>
          <Link href="/login" className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg">
            <FiLogIn className="w-4 h-4" />
            Login
          </Link>
          {user?.role === 'admin' ? (
            <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg">
              <FiSettings className="w-4 h-4" />
              Admin
            </Link>
          ) : null}
          {user ? (
            <button 
              onClick={logout} 
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-700"
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
