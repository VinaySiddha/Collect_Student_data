'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FiHome, FiLogIn, FiLogOut, FiSettings, FiMenu, FiX, FiUser } from 'react-icons/fi';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (
    pathname === '/login' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/faculty')
  ) return null;

  const closeMenu = () => setIsOpen(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900 hover:opacity-80 transition shrink-0">
          <span className="text-green-600 font-bold text-2xl">📚</span>
          <span className="text-green-600 font-bold text-xl">Gographic</span>
          <span className="text-xs text-slate-500 ml-1 hidden sm:inline">Portal</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded">
            <FiHome className="w-4 h-4" />
            Home
          </Link>

          {!user ? (
            <>
              <Link href="/login" className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 shadow-sm">
                <FiLogIn className="w-4 h-4" />
                Login
              </Link>
            </>
          ) : (
            <>
              {/* Greeting chip */}
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-green-50 border border-green-100">
                <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center text-white shrink-0">
                  <FiUser className="w-3 h-3" />
                </div>
                <span className="text-sm font-semibold text-green-800 max-w-[140px] truncate">
                  Hello, {displayName}
                </span>
              </div>

              {user.role === 'admin' && (
                <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded">
                  <FiSettings className="w-4 h-4" />
                  Admin
                </Link>
              )}

              <button
                onClick={logout}
                className="flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 md:hidden"
        >
          {isOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`md:hidden overflow-hidden bg-white transition-all duration-300 ${isOpen ? 'max-h-96 border-t border-slate-200' : 'max-h-0'}`}>
        <div className="space-y-1 px-5 py-4">
          <Link href="/" onClick={closeMenu} className="flex items-center gap-2 rounded px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
            <FiHome className="w-4 h-4" />
            Home
          </Link>

          {!user ? (
            <>
              <Link href="/login" onClick={closeMenu} className="flex items-center gap-2 rounded px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                <FiLogIn className="w-4 h-4" />
                Login
              </Link>
            </>
          ) : (
            <>
              {/* Greeting row */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-green-50 border border-green-100">
                <div className="w-7 h-7 rounded bg-green-600 flex items-center justify-center text-white shrink-0">
                  <FiUser className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide leading-none mb-0.5">Logged in as</p>
                  <p className="text-sm font-black text-slate-900 truncate">{displayName}</p>
                </div>
              </div>

              {user.role === 'admin' && (
                <Link href="/admin" onClick={closeMenu} className="flex items-center gap-2 rounded px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                  <FiSettings className="w-4 h-4" />
                  Admin
                </Link>
              )}

              <button
                type="button"
                onClick={() => { logout(); closeMenu(); }}
                className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
