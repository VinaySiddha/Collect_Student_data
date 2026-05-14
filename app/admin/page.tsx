'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import StudentTable from '@/components/StudentTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FiUsers, FiDownload, FiPlus, FiTrash2, FiMapPin, FiLogOut, FiLayout, FiUser, FiMail, FiLock, FiBook, FiChevronDown, FiChevronLeft, FiChevronRight, FiSearch, FiMenu, FiX, FiEdit2, FiSave, FiRotateCcw, FiArchive, FiUpload, FiCamera, FiRefreshCw, FiFileText, FiActivity } from 'react-icons/fi';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';
import {
  registerUser, getUsers, deleteUser, updateUser, changeMyPassword,
  getDeletedStudents, getDeletedUsers, getDeletedColleges,
  restoreStudentInDb, restoreUserInDb, restoreCollegeFromDb,
  getAuditLogs, getLoginHistory,
} from '@/lib/actions';
import { hashPasswordClient } from '@/lib/clientHash';
import TableSkeleton from '@/components/TableSkeleton';
import { formatISTDate, formatISTDateTime } from '@/lib/formatDate';
import { AuditLog, DbUser, LoginHistory, StudentRecord } from '@/lib/types';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

type View = 'dashboard' | 'institutes' | 'users' | 'logs';

export default function AdminPage() {
  const router = useRouter();
  const { user, initialized, logout, students, colleges, addCollege, removeCollege, deleteStudent, updateStudent, refreshStudents, refreshColleges } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newCollege, setNewCollege] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'faculty' as 'faculty' | 'faculty_admin', college: '' });
  const [userMsg, setUserMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegePage, setCollegePage] = useState(1);
  const [collegeRowsPerPage, setCollegeRowsPerPage] = useState(10);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', studentId: '', course: '', year: '', email: '', phone: '', college: '' });
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilterCollege, setActiveFilterCollege] = useState<string | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [userEditForm, setUserEditForm] = useState({ name: '', email: '', role: 'faculty' as 'faculty' | 'faculty_admin', college: '', newPassword: '' });
  const [userEditMsg, setUserEditMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [instituteFormOpen, setInstituteFormOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ current: '', next: '', confirm: '' });
  const [changePwdMsg, setChangePwdMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [changePwdSaving, setChangePwdSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [deletedStudents, setDeletedStudents] = useState<StudentRecord[]>([]);
  const [showDeletedStudents, setShowDeletedStudents] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState<DbUser[]>([]);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [deletedColleges, setDeletedColleges] = useState<{ name: string; deletedBy: string | null }[]>([]);
  const [showDeletedColleges, setShowDeletedColleges] = useState(false);

  // Logs state
  const [auditLogs, setAuditLogs]         = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory]   = useState<LoginHistory[]>([]);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [logsTab, setLogsTab]             = useState<'audit' | 'login'>('audit');

  // Inactivity logout (15 min)
  const { warningVisible, secondsLeft, stayLoggedIn } = useInactivityLogout(logout);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'admin') {
      router.push('/faculty');
    }
  }, [user, initialized, router]);

  useEffect(() => {
    if (activeView === 'users' && user?.role === 'admin') {
      setUsersLoading(true);
      Promise.all([getUsers(), getDeletedUsers()]).then(([active, deleted]) => {
        setDbUsers(active);
        setDeletedUsers(deleted);
        setUsersLoading(false);
      });
    }
  }, [activeView, user]);

  useEffect(() => {
    if (colleges.length > 0 && !activeFilterCollege) {
      setActiveFilterCollege(colleges[0]);
    }
  }, [colleges, activeFilterCollege]);

  useEffect(() => {
    if (activeView === 'dashboard') {
      getDeletedStudents().then(setDeletedStudents);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'institutes') {
      getDeletedColleges().then(setDeletedColleges);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'logs') {
      setLogsLoading(true);
      Promise.all([getAuditLogs(), getLoginHistory()]).then(([audit, login]) => {
        setAuditLogs(audit);
        setLoginHistory(login);
        setLogsLoading(false);
      });
    }
  }, [activeView]);

  const openEditModal = (student: StudentRecord) => {
    setEditStudent(student);
    setEditForm({ name: student.name, studentId: student.studentId ?? '', course: student.course ?? '', year: student.year ?? '', email: student.email ?? '', phone: student.phone, college: student.college });
    setEditPhoto(student.photo ?? null);
    setEditMsg(null);
  };

  const handleEditPhotoFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let { width, height } = img;
        if (width > height) { if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; } }
        else                { if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setEditPhoto(canvas.toDataURL('image/png'));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    if (!editForm.name || !editForm.studentId || !editForm.course || !editForm.year) {
      setEditMsg({ text: 'Name, Student ID, course and year are required.', type: 'error' });
      return;
    }
    setEditSaving(true);
    const updated: StudentRecord = { ...editStudent, ...editForm, photo: editPhoto ?? undefined };
    await updateStudent(updated);
    setEditMsg({ text: 'Student updated successfully.', type: 'success' });
    setEditSaving(false);
    setTimeout(() => { setEditStudent(null); setEditMsg(null); }, 1200);
  };

  const openEditUser = (u: DbUser) => {
    setEditingUser(u);
    setUserEditForm({ name: u.name, email: u.email, role: u.role === 'faculty_admin' ? 'faculty_admin' : 'faculty', college: u.college ?? '', newPassword: '' });
    setUserEditMsg(null);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    if (!userEditForm.name || !userEditForm.email) {
      setUserEditMsg({ text: 'Name and email are required.', type: 'error' });
      return;
    }
    setUserEditSaving(true);
    const passwordHash = userEditForm.newPassword
      ? await hashPasswordClient(userEditForm.email, userEditForm.newPassword)
      : undefined;
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

  const handleChangeMyPassword = async () => {
    if (!changePwdForm.current || !changePwdForm.next) {
      setChangePwdMsg({ text: 'All fields are required.', type: 'error' });
      return;
    }
    if (changePwdForm.next !== changePwdForm.confirm) {
      setChangePwdMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (changePwdForm.next.length < 6) {
      setChangePwdMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    setChangePwdSaving(true);
    const currentHash = await hashPasswordClient(user!.email, changePwdForm.current);
    const newHash = await hashPasswordClient(user!.email, changePwdForm.next);
    const result = await changeMyPassword(user!.email, currentHash, newHash);
    setChangePwdMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    setChangePwdSaving(false);
    if (result.success) {
      setChangePwdForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setChangePwdOpen(false); setChangePwdMsg(null); }, 1500);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      setUserMsg({ text: 'Name, email and password are required.', type: 'error' });
      return;
    }
    if (!userForm.college) {
      setUserMsg({ text: 'College is required — all faculty accounts must be assigned to an institute.', type: 'error' });
      return;
    }
    const passwordHash = await hashPasswordClient(userForm.email, userForm.password);
    const result = await registerUser(userForm.name, userForm.email, passwordHash, userForm.role, userForm.college || undefined);
    setUserMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setUserForm({ name: '', email: '', password: '', role: 'faculty' as 'faculty' | 'faculty_admin', college: '' });
      setUserFormOpen(false);
      getUsers().then(setDbUsers);
      setTimeout(() => setUserMsg(null), 3000);
    }
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

  const handleAddCollege = async () => {
    const result = await addCollege(newCollege);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setNewCollege('');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemoveCollege = (college: string) => {
    setConfirmDialog({
      title: 'Remove Institute',
      message: `"${college}" will be soft-deleted. It can be restored later and its name can be reused.`,
      onConfirm: async () => {
        const result = await removeCollege(college);
        setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
        if (result.success) {
          const deletedBy = user?.name || user?.email || null;
          setDeletedColleges(prev => [...prev, { name: college, deletedBy }].sort((a, b) => a.name.localeCompare(b.name)));
          setTimeout(() => setMessage(null), 3000);
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      await refreshStudents();
    }
  };

  const handleRestoreUser = async (id: number) => {
    const result = await restoreUserInDb(id);
    if (result.success) {
      const restored = deletedUsers.find(u => u.id === id);
      setDeletedUsers(prev => prev.filter(u => u.id !== id));
      if (restored) setDbUsers(prev => [restored, ...prev]);
    }
  };

  const handleRestoreCollege = async (name: string) => {
    const result = await restoreCollegeFromDb(name);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setDeletedColleges(prev => prev.filter(c => c.name !== name));
      await refreshColleges();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const collegeSlug = (college: string) =>
    college.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const exportZip = async () => {
    const exportList = activeFilterCollege ? students.filter(s => s.college === activeFilterCollege) : students;
    if (exportList.length === 0) {
      setMessage({ text: 'No student records to export.', type: 'error' }); return;
    }
    setMessage({ text: 'Preparing export…', type: 'success' });

    const sorted = [...exportList].sort((a, b) => a.name.localeCompare(b.name));

    const zip    = new JSZip();
    const photos = zip.folder('photos')!;

    const ws = XLSX.utils.json_to_sheet(sorted.map((s, i) => ({
      '#':           i + 1,
      'Photo':       s.photo ? `${i + 1}.png` : '',
      Name:          s.name,
      Parentage:     s.parentage    || '',
      'Student ID':  s.studentId    || '',
      'Roll No.':    s.rollNo       || '',
      Class:         s.studentClass || '',
      College:       s.college,
      Course:        s.course       || '',
      Year:          s.year         || '',
      Email:         s.email        || '',
      Phone:         s.phone,
      'Bus Stop':    s.busStop      || '',
      'Blood Group': s.bloodGroup   || '',
      'Added By':    s.createdBy    || 'Unknown',
      'Created At':  formatISTDate(s.createdAt),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    zip.file('students.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));

    let photoCount = 0;
    sorted.forEach((s, i) => {
      if (!s.photo) return;
      const base64 = s.photo.replace(/^data:image\/\w+;base64,/, '');
      photos.file(`${i + 1}.png`, base64, { base64: true });
      photoCount++;
    });

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFilterCollege || 'export'}-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: `Exported ${sorted.length} students · ${photoCount} photo${photoCount !== 1 ? 's' : ''} in photos/ folder.`, type: 'success' });
    setTimeout(() => setMessage(null), 5000);
  };

  const exportExcel = () => {
    const exportList = (activeFilterCollege ? students.filter(s => s.college === activeFilterCollege) : students)
      .sort((a, b) => a.name.localeCompare(b.name));
    const worksheet = XLSX.utils.json_to_sheet(exportList.map((s, i) => ({
      '#':           i + 1,
      'Photo':       s.photo ? `${i + 1}.png` : '',
      Name:          s.name,
      Parentage:     s.parentage    || '',
      'Student ID':  s.studentId    || '',
      'Roll No.':    s.rollNo       || '',
      Class:         s.studentClass || '',
      College:       s.college,
      Course:        s.course       || '',
      Year:          s.year         || '',
      Email:         s.email        || '',
      Phone:         s.phone,
      'Bus Stop':    s.busStop      || '',
      'Blood Group': s.bloodGroup   || '',
      'Added By':    s.createdBy    || 'Unknown',
      'Created At':  formatISTDate(s.createdAt),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `${activeFilterCollege || 'Admin'}_Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!initialized || !user || user.role !== 'admin') return null;

  const studentCountByCollege = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.college] = (acc[s.college] || 0) + 1;
    return acc;
  }, {});
  const filteredColleges = colleges.filter(c =>
    c.toLowerCase().includes(collegeSearch.toLowerCase())
  );
  const totalCollegePages = Math.max(1, Math.ceil(filteredColleges.length / collegeRowsPerPage));
  const safeCollegePage = Math.min(collegePage, totalCollegePages);
  const paginatedColleges = filteredColleges.slice(
    (safeCollegePage - 1) * collegeRowsPerPage,
    safeCollegePage * collegeRowsPerPage
  );

  const initials = (user.name?.[0] ?? user.email[0]).toUpperCase();

  const filteredUsers = dbUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.college ?? '').toLowerCase().includes(userSearch.toLowerCase())
  );
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userRowsPerPage));
  const safeUserPage = Math.min(userPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice((safeUserPage - 1) * userRowsPerPage, safeUserPage * userRowsPerPage);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-slate-900 flex flex-col overflow-hidden transition-all duration-300 w-64 lg:sticky lg:top-0 lg:shrink-0 lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand + toggle */}
        <div className="border-b border-white/10 px-3 py-4 flex items-center justify-between gap-2">

          {/* Mobile: always show full brand + close button */}
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:hidden">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white transition lg:hidden shrink-0"
          >
            <FiX className="w-4 h-4" />
          </button>

          {/* Desktop: collapsed/expanded toggle */}
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="hidden lg:flex w-8 h-8 bg-green-500 rounded items-center justify-center mx-auto group transition"
            >
              <span className="text-white text-sm font-black group-hover:hidden">G</span>
              <GoSidebarCollapse className="w-4 h-4 text-white hidden group-hover:block" />
            </button>
          ) : (
            <div className="hidden lg:flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">G</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm leading-none">Gographic</p>
                  <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Admin Panel</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition shrink-0"
              >
                <GoSidebarExpand className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {[
            { view: 'dashboard' as const, icon: <FiLayout className="w-4 h-4 shrink-0" />, label: 'Dashboard' },
            { view: 'institutes' as const, icon: <FiMapPin className="w-4 h-4 shrink-0" />, label: 'Institutes' },
            { view: 'users' as const, icon: <FiUsers className="w-4 h-4 shrink-0" />, label: 'Users' },
            { view: 'logs' as const, icon: <FiActivity className="w-4 h-4 shrink-0" />, label: 'Audit Logs' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all ${
                collapsed ? 'lg:justify-center lg:px-2' : ''
              } ${
                activeView === view
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {icon}
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer: user + logout */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <div
            className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title={collapsed ? (user.name || 'Admin') : undefined}
          >
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{initials}</span>
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-black truncate leading-none">{user.name || 'Admin'}</p>
              <p className="text-white/40 text-[0.6rem] truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { setChangePwdOpen(true); setChangePwdForm({ current: '', next: '', confirm: '' }); setChangePwdMsg(null); }}
            title={collapsed ? 'Change Password' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all ${
              collapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <FiLock className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Change Password</span>
          </button>
          <button
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all ${
              collapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
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
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 text-white/70 hover:text-white transition"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">G</span>
            </div>
            <p className="text-white font-black text-sm truncate">Gographic</p>
          </div>
          <span className="text-white/40 text-[0.6rem] font-black uppercase tracking-widest shrink-0 capitalize">
            {activeView}
          </span>
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">

          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <div id="admin-registry-section" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{students.length} students in registry</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => { setRefreshing(true); await refreshStudents(); setRefreshing(false); }}
                    disabled={refreshing}
                    title="Refresh data"
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95 disabled:opacity-60"
                  >
                    <FiRefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button onClick={exportZip} disabled={!activeFilterCollege || students.filter(s => s.college === activeFilterCollege).length === 0} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white rounded font-black text-sm hover:bg-green-700 transition shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                    <FiArchive className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Export ZIP</span>
                    <span className="sm:hidden">ZIP</span>
                  </button>
                  <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95">
                    <FiDownload className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                </div>
              </div>
              <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
                <StudentTable key={tableKey} students={[...students].sort((a, b) => a.name.localeCompare(b.name))} onDelete={deleteStudent} onEdit={openEditModal} colleges={colleges} defaultFilterCollege={colleges[0]} onFilterCollegeChange={c => {
                  if (c === null) {
                    setActiveFilterCollege(colleges[0] ?? null);
                    setTableKey(k => k + 1);
                  } else {
                    setActiveFilterCollege(c);
                  }
                }} />
              </div>

              {/* Deleted Students */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowDeletedStudents(v => !v)}
                  className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-black text-slate-500">
                    <FiRotateCcw className="w-4 h-4" />
                    Deleted Students
                    {(() => { const c = (activeFilterCollege ? deletedStudents.filter(s => s.college === activeFilterCollege) : deletedStudents).length; return c > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{c}</span>; })()}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedStudents ? 'rotate-180' : ''}`} />
                </button>
                {showDeletedStudents && (
                  <div className="border-t border-slate-100">
                    {(() => {
                      const filtered = activeFilterCollege ? deletedStudents.filter(s => s.college === activeFilterCollege) : deletedStudents;
                      return filtered.length === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted students{activeFilterCollege ? ` for ${activeFilterCollege}` : ''}.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-separate border-spacing-0">
                          <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left">Student</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden sm:table-cell">College</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden md:table-cell">Course</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden lg:table-cell">Deleted By</th>
                              <th className="px-4 lg:px-6 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filtered.map(s => (
                              <tr key={s.id} className="bg-rose-50/20">
                                <td className="px-4 lg:px-6 py-3">
                                  <p className="font-bold text-slate-400 text-sm">{s.name}</p>
                                  <p className="text-[0.65rem] text-slate-300">{s.studentId}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden sm:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{s.college}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden md:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{s.course}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden lg:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{s.deletedBy ?? '—'}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 text-right">
                                  <button
                                    onClick={() => handleRestoreStudent(s.id)}
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
                    );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Institutes */}
          {activeView === 'institutes' && (
            <div className="space-y-5">

              {/* Header row */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">Institutes</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Manage authorized colleges and institutions</p>
                </div>
                <button
                  onClick={() => { setInstituteFormOpen(o => !o); setNewCollege(''); setMessage(null); }}
                  className={`flex items-center gap-2 font-black px-4 py-2.5 rounded transition shadow-sm active:scale-95 text-sm shrink-0 ${instituteFormOpen ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-green-700'}`}
                >
                  {instituteFormOpen ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
                  <span className="hidden sm:inline">{instituteFormOpen ? 'Close' : 'Add Institute'}</span>
                  <span className="sm:hidden">{instituteFormOpen ? 'Close' : 'New'}</span>
                </button>
              </div>

              {/* Inline add form */}
              {instituteFormOpen && (
                <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-slate-900 p-2.5 rounded text-white shrink-0">
                      <FiMapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Add New Institute</h2>
                      <p className="text-slate-500 font-medium text-xs mt-0.5">Expand the institutional network</p>
                    </div>
                  </div>
                  <div className="flex gap-2 max-w-lg">
                    <input
                      type="text"
                      value={newCollege}
                      onChange={(e) => setNewCollege(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCollege()}
                      placeholder="Official Institution Name"
                      className="input-field text-sm flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleAddCollege}
                      className="bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 flex items-center gap-2 text-sm shrink-0"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  {message && (
                    <p className={`mt-3 text-sm font-bold p-3 rounded max-w-lg ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {message.text}
                    </p>
                  )}
                </div>
              )}

              {/* Registry table */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">

                {/* Table header */}
                <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Institute Registry</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">{colleges.length} total · {filteredColleges.length} shown</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search institutes…"
                      value={collegeSearch}
                      onChange={(e) => { setCollegeSearch(e.target.value); setCollegePage(1); }}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400 transition bg-slate-50 font-medium"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-4 lg:px-6 py-3.5 text-left w-12">#</th>
                        <th className="px-4 lg:px-6 py-3.5 text-left">Institute Name</th>
                        <th className="px-4 lg:px-6 py-3.5 text-left hidden sm:table-cell">Students</th>
                        <th className="px-4 lg:px-6 py-3.5 text-left hidden md:table-cell">Status</th>
                        <th className="px-4 lg:px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedColleges.map((college, idx) => (
                        <tr key={college} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 lg:px-6 py-4">
                            <span className="text-xs font-black text-slate-400">
                              {(safeCollegePage - 1) * collegeRowsPerPage + idx + 1}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center shrink-0">
                                <FiMapPin className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <p className="font-black text-slate-900 text-sm">{college}</p>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                            <span className="text-sm font-bold text-slate-700">
                              {studentCountByCollege[college] ?? 0}
                              <span className="text-slate-400 font-medium ml-1">student{(studentCountByCollege[college] ?? 0) !== 1 ? 's' : ''}</span>
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                            <span className="inline-flex items-center px-2.5 py-1 rounded text-[0.65rem] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-100">
                              Authorized
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveCollege(college)}
                              className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition ml-auto"
                              title="Remove institute"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredColleges.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-xl">🏫</div>
                              <div>
                                <p className="text-base font-black text-slate-900">
                                  {collegeSearch ? 'No matches found' : 'No institutes registered yet'}
                                </p>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                  {collegeSearch ? 'Try a different search term.' : 'Add the first institution above.'}
                                </p>
                              </div>
                              {collegeSearch && (
                                <button onClick={() => setCollegeSearch('')} className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-black transition">
                                  Clear Search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="bg-slate-50/50 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                      <select
                        value={collegeRowsPerPage}
                        onChange={(e) => { setCollegeRowsPerPage(Number(e.target.value)); setCollegePage(1); }}
                        className="bg-white border border-slate-200 rounded text-xs font-black px-2 py-1 outline-none focus:border-slate-400 transition cursor-pointer"
                      >
                        {[5, 10, 25].map(val => <option key={val} value={val}>{val}</option>)}
                      </select>
                    </div>
                    <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="text-slate-900 font-black">
                        {filteredColleges.length === 0 ? 0 : (safeCollegePage - 1) * collegeRowsPerPage + 1}–{Math.min(safeCollegePage * collegeRowsPerPage, filteredColleges.length)}
                      </span>
                      {' '}of <span className="text-slate-900 font-black">{filteredColleges.length}</span>
                    </p>
                  </div>
                  {totalCollegePages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCollegePage(p => Math.max(1, p - 1))}
                        disabled={safeCollegePage === 1}
                        className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <FiChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {Array.from({ length: totalCollegePages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCollegePage(page)}
                          className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${safeCollegePage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCollegePage(p => Math.min(totalCollegePages, p + 1))}
                        disabled={safeCollegePage === totalCollegePages}
                        className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Deleted Institutes */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowDeletedColleges(v => !v)}
                  className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-black text-slate-500">
                    <FiRotateCcw className="w-4 h-4" />
                    Deleted Institutes
                    {deletedColleges.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedColleges.length}</span>
                    )}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedColleges ? 'rotate-180' : ''}`} />
                </button>
                {showDeletedColleges && (
                  <div className="border-t border-slate-100">
                    {deletedColleges.length === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted institutes.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {deletedColleges.map(({ name, deletedBy: deletedByWho }) => (
                          <div key={name} className="flex items-center justify-between px-4 lg:px-6 py-3 bg-rose-50/20">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded bg-rose-50 flex items-center justify-center shrink-0">
                                <FiMapPin className="w-3.5 h-3.5 text-rose-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-400">{name}</p>
                                {deletedByWho && (
                                  <p className="text-[0.6rem] text-slate-300 font-medium mt-0.5">by {deletedByWho}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRestoreCollege(name)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition"
                            >
                              <FiRotateCcw className="w-3 h-3" /> Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Users */}
          {activeView === 'users' && (
            <div className="space-y-5">

              {/* Header row */}
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

              {/* Inline create user form */}
              {userFormOpen && (
                <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-slate-900 p-2.5 rounded text-white shrink-0">
                      <FiUser className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Create New User</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Add a faculty account to the system</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                        <FiUser className="w-3 h-3" /> Full Name
                      </span>
                      <input type="text" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Ramesh Kumar" className="input-field text-sm" />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                        <FiMail className="w-3 h-3" /> Email Address
                      </span>
                      <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@college.edu" className="input-field text-sm" />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                        <FiLock className="w-3 h-3" /> Password
                      </span>
                      <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Set a secure password" className="input-field text-sm" />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                        <FiBook className="w-3 h-3" /> Role
                      </span>
                      <div className="relative">
                        <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'faculty' | 'faculty_admin' }))} className="input-field text-sm appearance-none pr-8">
                          <option value="faculty">Faculty</option>
                          <option value="faculty_admin">Faculty Admin</option>
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                        <FiMapPin className="w-3 h-3" /> College <span className="text-rose-500">*</span>
                      </span>
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
                    <p className={`mt-4 text-sm font-bold p-3 rounded ${userMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {userMsg.text}
                    </p>
                  )}

                  <div className="mt-5 flex gap-3">
                    <button onClick={handleCreateUser} className="flex items-center gap-2 bg-slate-900 text-white font-black px-6 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm">
                      <FiPlus className="w-4 h-4" /> Create User
                    </button>
                    <button onClick={() => setUserFormOpen(false)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Users table */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">

                {/* Table header with search */}
                <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">All Users</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">{dbUsers.length} total · {filteredUsers.length} shown</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search name, email, role…"
                      value={userSearch}
                      onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400 transition bg-slate-50 font-medium"
                    />
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
                                    <span className="text-xs font-black text-slate-600 uppercase">
                                      {u.name?.[0] ?? u.email[0]}
                                    </span>
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
                              <td className="px-4 lg:px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-[0.65rem] font-black uppercase tracking-widest whitespace-nowrap ${
                                  u.role === 'admin'
                                    ? 'bg-slate-900 text-white'
                                    : u.role === 'faculty_admin'
                                    ? 'bg-violet-50 text-violet-700 border border-violet-100'
                                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}>
                                  {u.role === 'faculty_admin' ? 'Fac. Admin' : u.role}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                                <p className="text-slate-500 font-medium text-sm">{u.college ?? '—'}</p>
                              </td>
                              <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                                <p className="text-slate-400 font-medium text-xs">{formatISTDate(u.created_at)}</p>
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-right">
                                {u.role !== 'admin' && (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditUser(u)}
                                      className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"
                                      title="Edit user"
                                    >
                                      <FiEdit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition"
                                      title="Delete user"
                                    >
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
                                  {userSearch && (
                                    <button onClick={() => setUserSearch('')} className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-black transition">
                                      Clear Search
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="bg-slate-50/50 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                          <select
                            value={userRowsPerPage}
                            onChange={e => { setUserRowsPerPage(Number(e.target.value)); setUserPage(1); }}
                            className="bg-white border border-slate-200 rounded text-xs font-black px-2 py-1 outline-none focus:border-slate-400 transition cursor-pointer"
                          >
                            {[10, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                          <span className="text-slate-900 font-black">
                            {filteredUsers.length === 0 ? 0 : (safeUserPage - 1) * userRowsPerPage + 1}–{Math.min(safeUserPage * userRowsPerPage, filteredUsers.length)}
                          </span>{' '}of <span className="text-slate-900 font-black">{filteredUsers.length}</span>
                        </p>
                      </div>
                      {totalUserPages > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            disabled={safeUserPage === 1}
                            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                          >
                            <FiChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setUserPage(page)}
                              className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${safeUserPage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                            disabled={safeUserPage === totalUserPages}
                            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                          >
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
                <button
                  onClick={() => setShowDeletedUsers(v => !v)}
                  className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-black text-slate-500">
                    <FiRotateCcw className="w-4 h-4" />
                    Deleted Users
                    {deletedUsers.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedUsers.length}</span>
                    )}
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
                                <td className="px-4 lg:px-6 py-3 hidden sm:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{u.email}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden md:table-cell">
                                  <span className="text-xs font-black text-slate-400 uppercase tracking-wide">
                                    {u.role === 'faculty_admin' ? 'Fac. Admin' : u.role}
                                  </span>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden lg:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{u.college ?? '—'}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden xl:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{u.deletedBy ?? '—'}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 text-right">
                                  <button
                                    onClick={() => handleRestoreUser(u.id)}
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
            </div>
          )}

          {/* ── Logs ── */}
          {activeView === 'logs' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">Audit Logs</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Track all actions, exports, and login events</p>
                </div>
                <button
                  onClick={() => {
                    setLogsLoading(true);
                    Promise.all([getAuditLogs(), getLoginHistory()]).then(([a, l]) => {
                      setAuditLogs(a); setLoginHistory(l); setLogsLoading(false);
                    });
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95"
                >
                  <FiRefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                {(['audit', 'login'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setLogsTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-black transition ${logsTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab === 'audit' ? <FiFileText className="w-3.5 h-3.5" /> : <FiActivity className="w-3.5 h-3.5" />}
                    {tab === 'audit' ? `Audit Trail (${auditLogs.length})` : `Login History (${loginHistory.length})`}
                  </button>
                ))}
              </div>

              {logsLoading ? (
                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                  <TableSkeleton rows={8} cols={4} />
                </div>
              ) : logsTab === 'audit' ? (
                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                  {auditLogs.length === 0 ? (
                    <p className="px-6 py-16 text-center text-sm text-slate-400 font-bold">No audit logs yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">User</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Action</th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">Details</th>
                            <th className="px-4 py-3 text-left hidden lg:table-cell whitespace-nowrap">IP Address</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="text-xs font-bold text-slate-500">{formatISTDate(log.createdAt)}</p>
                                <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(log.createdAt)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{log.userName || log.userEmail}</p>
                                <p className="text-[0.65rem] text-slate-400 truncate max-w-[120px]">{log.userEmail}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-[0.65rem] font-black uppercase tracking-wide ${
                                  log.action.startsWith('export') ? 'bg-blue-50 text-blue-600' :
                                  log.action.startsWith('delete') ? 'bg-rose-50 text-rose-600' :
                                  log.action.startsWith('add') ? 'bg-emerald-50 text-emerald-600' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">{log.details ?? '—'}</p>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <p className="text-xs font-mono text-slate-400">{log.ipAddress ?? '—'}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                  {loginHistory.length === 0 ? (
                    <p className="px-6 py-16 text-center text-sm text-slate-400 font-bold">No login history yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">User</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell">IP Address</th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">Device / Browser</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loginHistory.map(entry => {
                            const ua = entry.userAgent ?? '';
                            const isMobile = /mobile|android|iphone|ipad/i.test(ua);
                            const browser =
                              /edg/i.test(ua) ? 'Edge' :
                              /chrome/i.test(ua) ? 'Chrome' :
                              /safari/i.test(ua) ? 'Safari' :
                              /firefox/i.test(ua) ? 'Firefox' : 'Other';
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <p className="text-xs font-bold text-slate-500">{formatISTDate(entry.createdAt)}</p>
                                  <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(entry.createdAt)}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-800 text-sm truncate max-w-[140px]">{entry.userName || entry.userEmail}</p>
                                  <p className="text-[0.65rem] text-slate-400 truncate max-w-[140px]">{entry.userEmail}</p>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  <p className="text-xs font-mono text-slate-400">{entry.ipAddress ?? '—'}</p>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[0.65rem] font-black ${isMobile ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {isMobile ? '📱' : '💻'} {browser}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900 border-t border-white/10 flex safe-area-bottom">
        {([
          { view: 'dashboard' as const, icon: <FiLayout className="w-5 h-5" />, label: 'Dashboard' },
          { view: 'institutes' as const, icon: <FiMapPin className="w-5 h-5" />, label: 'Institutes' },
          { view: 'users' as const, icon: <FiUsers className="w-5 h-5" />, label: 'Users' },
          { view: 'logs' as const, icon: <FiActivity className="w-5 h-5" />, label: 'Logs' },
        ] as const).map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-4 text-[0.55rem] font-black uppercase tracking-widest transition-colors ${
              activeView === view ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            <span className={`transition-transform ${activeView === view ? 'scale-110' : ''}`}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setEditStudent(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full max-w-lg sm:max-w-lg p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Edit Student</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Update student record details</p>
              </div>
              <button onClick={() => setEditStudent(null)} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Student name' },
                { label: 'Student ID', key: 'studentId', type: 'text', placeholder: 'e.g. STU001' },
                { label: 'Course', key: 'course', type: 'text', placeholder: 'e.g. B.Tech CSE' },
                { label: 'Year', key: 'year', type: 'text', placeholder: 'e.g. 3' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'student@email.com' },
                { label: 'Phone', key: 'phone', type: 'text', placeholder: '10-digit number' },
              ].map(({ label, key, type, placeholder }) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
                  <input
                    type={type}
                    value={editForm[key as keyof typeof editForm]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field text-sm"
                  />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">College</span>
                <div className="relative">
                  <select
                    value={editForm.college}
                    onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))}
                    className="input-field text-sm appearance-none pr-8"
                  >
                    {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </label>

              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Photo <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span>
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center">
                    {editPhoto
                      ? <img src={editPhoto} alt="Photo" className="w-full h-full object-cover" />
                      : <FiCamera className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleEditPhotoFile(e.target.files?.[0] ?? null)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2 rounded hover:bg-slate-100 transition text-sm">
                        <FiUpload className="w-3.5 h-3.5" /> Upload New Photo
                      </button>
                    </div>
                    {editPhoto && (
                      <button type="button" onClick={() => setEditPhoto(null)} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition text-left">
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {editMsg && (
              <p className={`text-sm font-bold p-3 rounded ${editMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {editMsg.text}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60"
              >
                <FiSave className="w-3.5 h-3.5" />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditStudent(null)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change My Password Modal */}
      {changePwdOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setChangePwdOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Update your admin account password</p>
              </div>
              <button onClick={() => setChangePwdOpen(false)} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Current Password', key: 'current', placeholder: 'Enter your current password' },
                { label: 'New Password', key: 'next', placeholder: 'At least 6 characters' },
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
              <button
                onClick={handleChangeMyPassword}
                disabled={changePwdSaving}
                className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60"
              >
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
                <input
                  type="text"
                  value={userEditForm.name}
                  onChange={e => setUserEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="input-field text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Email Address</span>
                <input
                  type="email"
                  value={userEditForm.email}
                  onChange={e => setUserEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@college.edu"
                  className="input-field text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Role</span>
                <div className="relative">
                  <select
                    value={userEditForm.role}
                    onChange={e => setUserEditForm(f => ({ ...f, role: e.target.value as 'faculty' | 'faculty_admin' }))}
                    className="input-field text-sm appearance-none pr-8"
                  >
                    <option value="faculty">Faculty</option>
                    <option value="faculty_admin">Faculty Admin</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">College</span>
                <div className="relative">
                  <select
                    value={userEditForm.college}
                    onChange={e => setUserEditForm(f => ({ ...f, college: e.target.value }))}
                    className="input-field text-sm appearance-none pr-8"
                  >
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
                <input
                  type="password"
                  value={userEditForm.newPassword}
                  onChange={e => setUserEditForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Enter new password to reset"
                  className="input-field text-sm"
                />
              </label>
            </div>

            {userEditMsg && (
              <p className={`text-sm font-bold p-3 rounded ${userEditMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {userEditMsg.text}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSaveUserEdit}
                disabled={userEditSaving}
                className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60"
              >
                <FiSave className="w-3.5 h-3.5" />
                {userEditSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingUser(null)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
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

      {/* Toast */}
      {message && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${
          message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
        }`}>
          <span className="shrink-0">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="truncate">{message.text}</span>
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
              <button
                onClick={stayLoggedIn}
                className="flex-1 bg-slate-900 text-white font-black py-2.5 rounded-lg hover:bg-green-700 transition text-sm"
              >
                Stay Logged In
              </button>
              <button
                onClick={logout}
                className="flex-1 border border-slate-200 text-slate-600 font-black py-2.5 rounded-lg hover:bg-slate-50 transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
