'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { FiHome, FiUserPlus, FiLogIn, FiLogOut, FiSettings, FiMenu, FiX } from 'react-icons/fi';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900 hover:opacity-80 transition">
          <span className="text-green-600 font-bold text-2xl">📚</span>
          <span className="text-green-600 font-bold text-xl">Gographic</span>
          <span className="text-xs text-slate-500 ml-1">Portal</span>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
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

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 md:hidden"
        >
          {isOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
        </button>
      </div>

      <div className={`md:hidden overflow-hidden bg-white transition-all duration-300 ${isOpen ? 'max-h-80 border-t border-slate-200' : 'max-h-0'}`}>
        <div className="space-y-2 px-6 py-4">
          <Link href="/" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            <FiHome className="w-4 h-4" />
            Home
          </Link>
          <Link href="/register" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            <FiUserPlus className="w-4 h-4" />
            Register
          </Link>
          <Link href="/login" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            <FiLogIn className="w-4 h-4" />
            Login
          </Link>
          {user?.role === 'admin' ? (
            <Link href="/admin" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              <FiSettings className="w-4 h-4" />
              Admin
            </Link>
          ) : null}
          {user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                closeMenu();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-700"
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
