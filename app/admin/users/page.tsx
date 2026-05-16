'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FiUsers, FiPlus, FiTrash2, FiUser, FiMail, FiLock, FiBook,
  FiMapPin, FiSearch, FiChevronDown, FiChevronLeft, FiChevronRight,
  FiRotateCcw, FiEdit2, FiSave, FiX,
} from 'react-icons/fi';
import {
  registerUser, getUsers, deleteUser, updateUser,
  restoreUserInDb, getUsersPageData,
} from '@/lib/actions';
import { hashPasswordClient } from '@/lib/clientHash';
import TableSkeleton from '@/components/TableSkeleton';
import { formatISTDate } from '@/lib/formatDate';
import { DbUser } from '@/lib/types';

export default function AdminUsersPage() {
  const { user, colleges } = useAuth();

  const [dbUsers,           setDbUsers]           = useState<DbUser[]>([]);
  const [usersLoading,      setUsersLoading]      = useState(true);
  const [userForm,          setUserForm]          = useState({ name: '', email: '', password: '', role: 'faculty' as 'faculty' | 'faculty_admin', college: '' });
  const [userMsg,           setUserMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [userSearch,        setUserSearch]        = useState('');
  const [userPage,          setUserPage]          = useState(1);
  const [userRowsPerPage,   setUserRowsPerPage]   = useState(10);
  const [userFormOpen,      setUserFormOpen]      = useState(false);
  const [editingUser,       setEditingUser]       = useState<DbUser | null>(null);
  const [userEditForm,      setUserEditForm]      = useState({ name: '', email: '', role: 'faculty' as 'faculty' | 'faculty_admin', college: '', newPassword: '' });
  const [userEditMsg,       setUserEditMsg]       = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [userEditSaving,    setUserEditSaving]    = useState(false);
  const [deletedUsers,      setDeletedUsers]      = useState<DbUser[]>([]);
  const [showDeletedUsers,  setShowDeletedUsers]  = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    setUsersLoading(true);
    getUsersPageData().then(({ users, deletedUsers }) => {
      setDbUsers(users);
      setDeletedUsers(deletedUsers);
      setUsersLoading(false);
    }).catch(() => {});
  }, [user?.email]);

  const filteredUsers    = dbUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.college ?? '').toLowerCase().includes(userSearch.toLowerCase())
  );
  const totalUserPages   = Math.max(1, Math.ceil(filteredUsers.length / userRowsPerPage));
  const safeUserPage     = Math.min(userPage, totalUserPages);
  const paginatedUsers   = filteredUsers.slice((safeUserPage - 1) * userRowsPerPage, safeUserPage * userRowsPerPage);

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      setUserMsg({ text: 'Name, email and password are required.', type: 'error' }); return;
    }
    if (!userForm.college) {
      setUserMsg({ text: 'College is required — all faculty accounts must be assigned to an institute.', type: 'error' }); return;
    }
    const passwordHash = await hashPasswordClient(userForm.email, userForm.password);
    const result = await registerUser(userForm.name, userForm.email, passwordHash, userForm.role, userForm.college || undefined);
    setUserMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setUserForm({ name: '', email: '', password: '', role: 'faculty', college: '' });
      setUserFormOpen(false);
      getUsers().then(setDbUsers);
      setTimeout(() => setUserMsg(null), 3000);
    }
  };

  const openEditUser = (u: DbUser) => {
    setEditingUser(u);
    setUserEditForm({ name: u.name, email: u.email, role: u.role === 'faculty_admin' ? 'faculty_admin' : 'faculty', college: u.college ?? '', newPassword: '' });
    setUserEditMsg(null);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    if (!userEditForm.name || !userEditForm.email) {
      setUserEditMsg({ text: 'Name and email are required.', type: 'error' }); return;
    }
    setUserEditSaving(true);
    const passwordHash = userEditForm.newPassword ? await hashPasswordClient(userEditForm.email, userEditForm.newPassword) : undefined;
    const result = await updateUser(editingUser.id, { name: userEditForm.name, email: userEditForm.email, role: userEditForm.role, college: userEditForm.college || null, passwordHash });
    if (result.success) {
      setDbUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: userEditForm.name, email: userEditForm.email.toLowerCase(), role: userEditForm.role, college: userEditForm.college || null } : u));
      setUserEditMsg({ text: 'User updated successfully.', type: 'success' });
      setTimeout(() => { setEditingUser(null); setUserEditMsg(null); }, 1200);
    } else {
      setUserEditMsg({ text: 'Failed to update user.', type: 'error' });
    }
    setUserEditSaving(false);
  };

  const handleDeleteUser = (id: number) => {
    setConfirmDialog({
      title: 'Delete User',
      message: 'This user will be soft-deleted and lose access immediately. You can restore them later.',
      onConfirm: async () => {
        const deletedBy = user?.name || user?.email;
        const result = await deleteUser(id, deletedBy);
        if (result.success) {
          const removed = dbUsers.find(u => u.id === id);
          setDbUsers(prev => prev.filter(u => u.id !== id));
          if (removed) setDeletedUsers(prev => [{ ...removed, deletedBy: deletedBy || null }, ...prev]);
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleRestoreUser = async (id: number) => {
    const result = await restoreUserInDb(id);
    if (result.success) {
      const restored = deletedUsers.find(u => u.id === id);
      setDeletedUsers(prev => prev.filter(u => u.id !== id));
      if (restored) setDbUsers(prev => [restored, ...prev]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Users</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Manage faculty accounts</p>
        </div>
        <button
          onClick={() => { setUserFormOpen(o => !o); setUserForm({ name: '', email: '', password: '', role: 'faculty', college: '' }); setUserMsg(null); }}
          className={`flex items-center gap-2 font-black px-4 py-2.5 rounded transition shadow-sm active:scale-95 text-sm shrink-0 ${userFormOpen ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-green-700'}`}
        >
          {userFormOpen ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
          <span className="hidden sm:inline">{userFormOpen ? 'Close' : 'Create User'}</span>
          <span className="sm:hidden">{userFormOpen ? 'Close' : 'New'}</span>
        </button>
      </div>

      {/* Create user form */}
      {userFormOpen && (
        <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-slate-900 p-2.5 rounded text-white shrink-0"><FiUser className="w-4 h-4" /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">Create New User</h2>
              <p className="text-xs text-slate-500 mt-0.5">Add a faculty account to the system</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400"><FiUser className="w-3 h-3" /> Full Name</span>
              <input type="text" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Ramesh Kumar" className="input-field text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400"><FiMail className="w-3 h-3" /> Email Address</span>
              <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@college.edu" className="input-field text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400"><FiLock className="w-3 h-3" /> Password</span>
              <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Set a secure password" className="input-field text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400"><FiBook className="w-3 h-3" /> Role</span>
              <div className="relative">
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'faculty' | 'faculty_admin' }))} className="input-field text-sm appearance-none pr-8">
                  <option value="faculty">Faculty</option>
                  <option value="faculty_admin">Faculty Admin</option>
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400"><FiMapPin className="w-3 h-3" /> College <span className="text-rose-500">*</span></span>
              <div className="relative">
                <select value={userForm.college} onChange={e => setUserForm(f => ({ ...f, college: e.target.value }))} className={`input-field text-sm appearance-none pr-8 ${!userForm.college ? 'border-rose-200 text-slate-400' : ''}`}>
                  <option value="">— Select an institute —</option>
                  {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </label>
          </div>
          {userMsg && (
            <p className={`mt-4 text-sm font-bold p-3 rounded ${userMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{userMsg.text}</p>
          )}
          <div className="mt-5 flex gap-3">
            <button onClick={handleCreateUser} className="flex items-center gap-2 bg-slate-900 text-white font-black px-6 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm">
              <FiPlus className="w-4 h-4" /> Create User
            </button>
            <button onClick={() => setUserFormOpen(false)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">All Users</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">{dbUsers.length} total · {filteredUsers.length} shown</p>
          </div>
          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input type="text" placeholder="Search name, email, role…" value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }} className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400 transition bg-slate-50 font-medium" />
          </div>
        </div>

        {usersLoading ? <TableSkeleton rows={5} cols={5} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-0">
                <thead className="bg-slate-50 text-slate-400 text-[0.65rem] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-4 lg:px-6 py-3.5 text-left">User</th>
                    <th className="px-4 lg:px-6 py-3.5 text-left hidden sm:table-cell">Email</th>
                    <th className="px-4 lg:px-6 py-3.5 text-left">Role</th>
                    <th className="px-4 lg:px-6 py-3.5 text-left hidden md:table-cell">College</th>
                    <th className="px-4 lg:px-6 py-3.5 text-left hidden lg:table-cell">Created</th>
                    <th className="px-4 lg:px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-slate-600 uppercase">{u.name?.[0] ?? u.email[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 text-sm truncate">{u.name}</p>
                            <p className="text-[0.65rem] text-slate-400 font-bold sm:hidden truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden sm:table-cell"><p className="text-slate-600 font-medium text-sm truncate max-w-[200px]">{u.email}</p></td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-[0.65rem] font-black uppercase tracking-widest whitespace-nowrap ${u.role === 'admin' ? 'bg-slate-900 text-white' : u.role === 'faculty_admin' ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                          {u.role === 'faculty_admin' ? 'Fac. Admin' : u.role}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden md:table-cell"><p className="text-slate-500 font-medium text-sm">{u.college ?? '—'}</p></td>
                      <td className="px-4 lg:px-6 py-4 hidden lg:table-cell"><p className="text-slate-400 font-medium text-xs">{formatISTDate(u.created_at)}</p></td>
                      <td className="px-4 lg:px-6 py-4 text-right">
                        {u.role !== 'admin' && (
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => openEditUser(u)} className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition" title="Edit user">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition" title="Delete user">
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-xl">🔍</div>
                          <div>
                            <p className="text-base font-black text-slate-900">{userSearch ? 'No matches found' : 'No users yet'}</p>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">{userSearch ? 'Try a different search term.' : 'Create the first user above.'}</p>
                          </div>
                          {userSearch && <button onClick={() => setUserSearch('')} className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-black transition">Clear Search</button>}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-slate-50/50 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                  <select value={userRowsPerPage} onChange={e => { setUserRowsPerPage(Number(e.target.value)); setUserPage(1); }} className="bg-white border border-slate-200 rounded text-xs font-black px-2 py-1 outline-none focus:border-slate-400 transition cursor-pointer">
                    {[10, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                  <span className="text-slate-900 font-black">{filteredUsers.length === 0 ? 0 : (safeUserPage - 1) * userRowsPerPage + 1}–{Math.min(safeUserPage * userRowsPerPage, filteredUsers.length)}</span>
                  {' '}of <span className="text-slate-900 font-black">{filteredUsers.length}</span>
                </p>
              </div>
              {totalUserPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={safeUserPage === 1} className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all">
                    <FiChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setUserPage(page)} className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${safeUserPage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{page}</button>
                  ))}
                  <button onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} disabled={safeUserPage === totalUserPages} className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all">
                    <FiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Deleted Users */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <button onClick={() => setShowDeletedUsers(v => !v)} className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left">
          <span className="flex items-center gap-2 text-sm font-black text-slate-500">
            <FiRotateCcw className="w-4 h-4" />
            Deleted Users
            {deletedUsers.length > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedUsers.length}</span>}
          </span>
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedUsers ? 'rotate-180' : ''}`} />
        </button>
        {showDeletedUsers && (
          <div className="border-t border-slate-100">
            {deletedUsers.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted users.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left">User</th>
                      <th className="px-4 lg:px-6 py-3 text-left hidden sm:table-cell">Email</th>
                      <th className="px-4 lg:px-6 py-3 text-left hidden md:table-cell">Role</th>
                      <th className="px-4 lg:px-6 py-3 text-left hidden lg:table-cell">College</th>
                      <th className="px-4 lg:px-6 py-3 text-left hidden xl:table-cell">Deleted By</th>
                      <th className="px-4 lg:px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedUsers.map(u => (
                      <tr key={u.id} className="bg-rose-50/20">
                        <td className="px-4 lg:px-6 py-3">
                          <p className="font-bold text-slate-400 text-sm">{u.name}</p>
                          <p className="text-[0.65rem] text-slate-300 sm:hidden">{u.email}</p>
                        </td>
                        <td className="px-4 lg:px-6 py-3 hidden sm:table-cell"><p className="text-sm text-slate-400 font-medium">{u.email}</p></td>
                        <td className="px-4 lg:px-6 py-3 hidden md:table-cell"><span className="text-xs font-black text-slate-400 uppercase tracking-wide">{u.role === 'faculty_admin' ? 'Fac. Admin' : u.role}</span></td>
                        <td className="px-4 lg:px-6 py-3 hidden lg:table-cell"><p className="text-sm text-slate-400 font-medium">{u.college ?? '—'}</p></td>
                        <td className="px-4 lg:px-6 py-3 hidden xl:table-cell"><p className="text-sm text-slate-400 font-medium">{u.deletedBy ?? '—'}</p></td>
                        <td className="px-4 lg:px-6 py-3 text-right">
                          <button onClick={() => handleRestoreUser(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition ml-auto">
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Edit User</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Update account details for {editingUser.name}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Full Name</span>
                <input type="text" value={userEditForm.name} onChange={e => setUserEditForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Ramesh Kumar" className="input-field text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Email Address</span>
                <input type="email" value={userEditForm.email} onChange={e => setUserEditForm(f => ({ ...f, email: e.target.value }))} placeholder="user@college.edu" className="input-field text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Role</span>
                <div className="relative">
                  <select value={userEditForm.role} onChange={e => setUserEditForm(f => ({ ...f, role: e.target.value as 'faculty' | 'faculty_admin' }))} className="input-field text-sm appearance-none pr-8">
                    <option value="faculty">Faculty</option>
                    <option value="faculty_admin">Faculty Admin</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">College</span>
                <div className="relative">
                  <select value={userEditForm.college} onChange={e => setUserEditForm(f => ({ ...f, college: e.target.value }))} className="input-field text-sm appearance-none pr-8">
                    <option value="">— No college assigned —</option>
                    {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  New Password <span className="text-slate-300 normal-case tracking-normal font-medium">(leave blank to keep current)</span>
                </span>
                <input type="password" value={userEditForm.newPassword} onChange={e => setUserEditForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Enter new password to reset" className="input-field text-sm" />
              </label>
            </div>
            {userEditMsg && (
              <p className={`text-sm font-bold p-3 rounded ${userEditMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{userEditMsg.text}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={handleSaveUserEdit} disabled={userEditSaving} className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60">
                <FiSave className="w-3.5 h-3.5" />
                {userEditSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingUser(null)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

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
