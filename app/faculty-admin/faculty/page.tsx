'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  registerUser, getUsersByCollege,
  deleteUser, getDeletedUsersByCollege, restoreUserInDb,
} from '@/lib/actions';
import { DbUser } from '@/lib/types';
import { hashPasswordClient } from '@/lib/clientHash';
import {
  FiPlus, FiTrash2, FiUser, FiMail, FiLock, FiRotateCcw, FiChevronDown,
} from 'react-icons/fi';
import { formatISTDate } from '@/lib/formatDate';
import TableSkeleton from '@/components/TableSkeleton';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function FacultyAdminFacultyPage() {
  const { user } = useAuth();

  const [facultyUsers,       setFacultyUsers]       = useState<DbUser[]>([]);
  const [facultyLoading,     setFacultyLoading]     = useState(false);
  const [facultyForm,        setFacultyForm]        = useState({ name: '', email: '', password: '' });
  const [facultyMsg,         setFacultyMsg]         = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deletedFaculty,     setDeletedFaculty]     = useState<DbUser[]>([]);
  const [showDeletedFaculty, setShowDeletedFaculty] = useState(false);
  const [confirmDialog,      setConfirmDialog]      = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!user?.college) return;
    setFacultyLoading(true);
    Promise.all([
      getUsersByCollege(user.college),
      getDeletedUsersByCollege(user.college),
    ]).then(([active, deleted]) => {
      setFacultyUsers(active);
      setDeletedFaculty(deleted);
      setFacultyLoading(false);
    });
  }, [user?.college]);

  if (!user) return null;

  const handleCreateFaculty = async () => {
    if (!facultyForm.name || !facultyForm.email || !facultyForm.password) {
      setFacultyMsg({ text: 'Name, email and password are required.', type: 'error' });
      return;
    }
    if (!user?.college) {
      setFacultyMsg({ text: 'No college associated with your account.', type: 'error' });
      return;
    }
    const passwordHash = await hashPasswordClient(facultyForm.email, facultyForm.password);
    const result = await registerUser(facultyForm.name, facultyForm.email, passwordHash, 'faculty', user.college);
    setFacultyMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setFacultyForm({ name: '', email: '', password: '' });
      getUsersByCollege(user.college).then(setFacultyUsers);
      setTimeout(() => setFacultyMsg(null), 3000);
    }
  };

  const handleDeleteFaculty = (id: number) => {
    setConfirmDialog({
      title: 'Remove Faculty',
      message: 'This faculty member will be soft-deleted and lose access immediately.',
      onConfirm: async () => {
        const deletedBy = user?.name || user?.email;
        const result = await deleteUser(id, deletedBy);
        if (result.success) {
          const removed = facultyUsers.find(u => u.id === id);
          setFacultyUsers(prev => prev.filter(u => u.id !== id));
          if (removed) setDeletedFaculty(prev => [{ ...removed, deletedBy: deletedBy || null }, ...prev]);
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleRestoreFaculty = async (id: number) => {
    const result = await restoreUserInDb(id);
    if (result.success) {
      const restored = deletedFaculty.find(u => u.id === id);
      setDeletedFaculty(prev => prev.filter(u => u.id !== id));
      if (restored) setFacultyUsers(prev => [restored, ...prev]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Faculty</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Manage faculty members for {user.college}
        </p>
      </div>

      {/* Add faculty form */}
      <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-violet-500 p-2.5 rounded text-white shrink-0">
            <FiUser className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Add Faculty Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">New faculty will be assigned to {user.college}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
              <FiUser className="w-3 h-3" /> Full Name
            </span>
            <input
              type="text"
              value={facultyForm.name}
              onChange={e => setFacultyForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Dr. Ramesh Kumar"
              className="input-field text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
              <FiMail className="w-3 h-3" /> Email
            </span>
            <input
              type="email"
              value={facultyForm.email}
              onChange={e => setFacultyForm(f => ({ ...f, email: e.target.value }))}
              placeholder="faculty@college.edu"
              className="input-field text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
              <FiLock className="w-3 h-3" /> Password
            </span>
            <input
              type="password"
              value={facultyForm.password}
              onChange={e => setFacultyForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Set a secure password"
              className="input-field text-sm"
            />
          </label>
        </div>

        {facultyMsg && (
          <p className={`mt-4 text-sm font-bold p-3 rounded ${facultyMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            {facultyMsg.text}
          </p>
        )}

        <button
          onClick={handleCreateFaculty}
          className="mt-5 flex items-center gap-2 bg-slate-900 text-white font-black px-6 py-3 rounded hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm"
        >
          <FiPlus className="w-4 h-4" /> Add Faculty
        </button>
      </div>

      {/* Faculty list */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Faculty Members</h2>
          <span className="text-xs text-slate-400 font-bold">{facultyUsers.length} total</span>
        </div>

        {facultyLoading ? <TableSkeleton rows={4} cols={4} /> : facultyUsers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-xl">👩‍🏫</div>
              <div>
                <p className="text-base font-black text-slate-900">No faculty members yet</p>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Add the first faculty member above.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-0">
              <thead className="bg-slate-50 text-slate-400 text-[0.65rem] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-4 lg:px-6 py-3.5 text-left">Name</th>
                  <th className="px-4 lg:px-6 py-3.5 text-left hidden sm:table-cell">Email</th>
                  <th className="px-4 lg:px-6 py-3.5 text-left hidden lg:table-cell">Added</th>
                  <th className="px-4 lg:px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facultyUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-violet-600 uppercase">{u.name?.[0] ?? u.email[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">{u.name}</p>
                          <p className="text-[0.65rem] text-slate-400 font-bold sm:hidden truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                      <p className="text-slate-600 font-medium text-sm truncate max-w-[200px]">{u.email}</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                      <p className="text-slate-400 font-medium text-xs">{formatISTDate(u.created_at)}</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteFaculty(u.id)}
                        className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition ml-auto"
                        title="Remove faculty"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deleted Faculty */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDeletedFaculty(v => !v)}
          className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left"
        >
          <span className="flex items-center gap-2 text-sm font-black text-slate-500">
            <FiRotateCcw className="w-4 h-4" />
            Deleted Faculty
            {deletedFaculty.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedFaculty.length}</span>
            )}
          </span>
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedFaculty ? 'rotate-180' : ''}`} />
        </button>
        {showDeletedFaculty && (
          <div className="border-t border-slate-100">
            {deletedFaculty.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted faculty members.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left">Name</th>
                      <th className="px-4 lg:px-6 py-3 text-left hidden sm:table-cell">Email</th>
                      <th className="px-4 lg:px-6 py-3 text-left hidden md:table-cell">Deleted By</th>
                      <th className="px-4 lg:px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedFaculty.map(u => (
                      <tr key={u.id} className="bg-rose-50/20">
                        <td className="px-4 lg:px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded bg-rose-50 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-rose-300 uppercase">{u.name?.[0] ?? u.email[0]}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-400 text-sm truncate">{u.name}</p>
                              <p className="text-[0.65rem] text-slate-300 sm:hidden truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 hidden sm:table-cell">
                          <p className="text-sm text-slate-400 font-medium truncate max-w-[200px]">{u.email}</p>
                        </td>
                        <td className="px-4 lg:px-6 py-3 hidden md:table-cell">
                          <p className="text-sm text-slate-400 font-medium">{u.deletedBy ?? '—'}</p>
                        </td>
                        <td className="px-4 lg:px-6 py-3 text-right">
                          <button
                            onClick={() => handleRestoreFaculty(u.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition ml-auto"
                          >
                            <FiRotateCcw className="w-3 h-3" /> Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
