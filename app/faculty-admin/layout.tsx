'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { changeMyPassword } from '@/lib/actions';
import { hashPasswordClient } from '@/lib/clientHash';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import {
  FiLayout, FiUserPlus, FiUsers, FiLogOut, FiLock,
  FiMenu, FiX, FiSave,
} from 'react-icons/fi';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';

const NAV_ITEMS = [
  { href: '/faculty-admin/dashboard', icon: FiLayout,   label: 'Dashboard' },
  { href: '/faculty-admin/register',  icon: FiUserPlus, label: 'Register'  },
  { href: '/faculty-admin/faculty',   icon: FiUsers,    label: 'Faculty'   },
];

export default function FacultyAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, initialized, logout } = useAuth();

  const [collapsed,       setCollapsed]       = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [changePwdOpen,   setChangePwdOpen]   = useState(false);
  const [changePwdForm,   setChangePwdForm]   = useState({ current: '', next: '', confirm: '' });
  const [changePwdMsg,    setChangePwdMsg]    = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [changePwdSaving, setChangePwdSaving] = useState(false);

  const { warningVisible, secondsLeft, stayLoggedIn } = useInactivityLogout(logout);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'faculty_admin') { router.push('/faculty'); return; }
  }, [user, initialized, router]);

  const handleChangePassword = async () => {
    if (!changePwdForm.current || !changePwdForm.next) {
      setChangePwdMsg({ text: 'All fields are required.', type: 'error' }); return;
    }
    if (changePwdForm.next !== changePwdForm.confirm) {
      setChangePwdMsg({ text: 'New passwords do not match.', type: 'error' }); return;
    }
    if (changePwdForm.next.length < 6) {
      setChangePwdMsg({ text: 'New password must be at least 6 characters.', type: 'error' }); return;
    }
    setChangePwdSaving(true);
    const currentHash = await hashPasswordClient(user!.email, changePwdForm.current);
    const newHash     = await hashPasswordClient(user!.email, changePwdForm.next);
    const result      = await changeMyPassword(user!.email, currentHash, newHash);
    setChangePwdMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    setChangePwdSaving(false);
    if (result.success) {
      setChangePwdForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setChangePwdOpen(false); setChangePwdMsg(null); }, 1500);
    }
  };

  if (!initialized || !user || user.role !== 'faculty_admin') return null;

  const initials    = (user.name?.[0] ?? user.email[0]).toUpperCase();
  const activeLabel = NAV_ITEMS.find(n => pathname.startsWith(n.href))?.label ?? '';

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-slate-900 flex flex-col overflow-hidden transition-all duration-300 w-64 lg:sticky lg:top-0 lg:shrink-0 lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand + toggle */}
        <div className="border-b border-white/10 px-3 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:hidden">
            <div className="w-8 h-8 bg-violet-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Admin</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white transition lg:hidden shrink-0">
            <FiX className="w-4 h-4" />
          </button>

          {collapsed ? (
            <button onClick={() => setCollapsed(false)} title="Expand sidebar" className="hidden lg:flex w-8 h-8 bg-violet-500 rounded items-center justify-center mx-auto group transition">
              <span className="text-white text-sm font-black group-hover:hidden">G</span>
              <GoSidebarCollapse className="w-4 h-4 text-white hidden group-hover:block" />
            </button>
          ) : (
            <div className="hidden lg:flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-violet-500 rounded flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">G</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm leading-none">Gographic</p>
                  <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Admin</p>
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} title="Collapse sidebar" className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition shrink-0">
                <GoSidebarExpand className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* College badge */}
        {!collapsed && user.college && (
          <div className="mx-3 mt-3 px-3 py-2 bg-violet-500/20 rounded border border-violet-500/30">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-violet-300/70">College</p>
            <p className="text-white/80 text-xs font-bold mt-0.5 truncate">{user.college}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`} title={collapsed ? (user.name || 'Faculty Admin') : undefined}>
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{initials}</span>
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-black truncate leading-none">{user.name || 'Faculty Admin'}</p>
              <p className="text-white/40 text-[0.6rem] truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { setChangePwdOpen(true); setChangePwdForm({ current: '', next: '', confirm: '' }); setChangePwdMsg(null); }}
            title={collapsed ? 'Change Password' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <FiLock className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Change Password</span>
          </button>
          <button
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <FiLogOut className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Content wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 lg:hidden bg-slate-900 px-4 py-3 flex items-center gap-3 shadow-lg">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-white/70 hover:text-white transition">
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-violet-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              {user.college && (
                <p className="text-white/40 text-[0.55rem] font-bold truncate mt-0.5">{user.college}</p>
              )}
            </div>
          </div>
          <span className="text-white/40 text-[0.6rem] font-black uppercase tracking-widest shrink-0">{activeLabel}</span>
        </div>

        <main className="flex-1 min-w-0 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900 border-t border-white/10 flex safe-area-bottom">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-4 text-[0.55rem] font-black uppercase tracking-widest transition-colors ${active ? 'text-white' : 'text-white/35 hover:text-white/70'}`}
            >
              <span className={`transition-transform ${active ? 'scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Change Password Modal */}
      {changePwdOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setChangePwdOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Update your faculty admin account password</p>
              </div>
              <button onClick={() => setChangePwdOpen(false)} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Current Password',    key: 'current', placeholder: 'Enter your current password' },
                { label: 'New Password',         key: 'next',    placeholder: 'At least 6 characters' },
                { label: 'Confirm New Password', key: 'confirm', placeholder: 'Re-enter new password' },
              ].map(({ label, key, placeholder }) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
                  <input
                    type="password"
                    value={changePwdForm[key as keyof typeof changePwdForm]}
                    onChange={e => setChangePwdForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field text-sm"
                  />
                </label>
              ))}
            </div>
            {changePwdMsg && (
              <p className={`text-sm font-bold p-3 rounded ${changePwdMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {changePwdMsg.text}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={handleChangePassword} disabled={changePwdSaving} className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm disabled:opacity-60">
                <FiSave className="w-3.5 h-3.5" />
                {changePwdSaving ? 'Saving…' : 'Update Password'}
              </button>
              <button onClick={() => setChangePwdOpen(false)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inactivity warning */}
      {warningVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-2xl">⏱️</div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Session Expiring</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                You will be logged out due to inactivity in{' '}
                <span className="font-black text-amber-600">{secondsLeft}s</span>.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={stayLoggedIn} className="flex-1 bg-violet-600 text-white font-black py-2.5 rounded-lg hover:bg-violet-700 transition text-sm">
                Stay Logged In
              </button>
              <button onClick={logout} className="flex-1 border border-slate-200 text-slate-600 font-black py-2.5 rounded-lg hover:bg-slate-50 transition text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
