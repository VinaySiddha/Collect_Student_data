'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import {
  registerUser,
  getUsersByCollege,
  getStudentsByCollege,
  addStudentToDb,
  deleteStudentFromDb,
  deleteUser,
  getDeletedStudentsByCollege,
  restoreStudentInDb,
  getDeletedUsersByCollege,
  restoreUserInDb,
} from '@/lib/actions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DbUser, StudentRecord } from '@/lib/types';
import {
  FiLayout, FiUsers, FiLogOut, FiPlus, FiTrash2, FiUser, FiMail,
  FiLock, FiMenu, FiX, FiDownload, FiChevronDown, FiMapPin, FiShield,
  FiUserPlus, FiUpload, FiRotateCcw,
} from 'react-icons/fi';
import { hashPasswordClient } from '@/lib/clientHash';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';
import ConfirmDialog from '@/components/ConfirmDialog';

type View = 'dashboard' | 'faculty' | 'register';

export default function FacultyAdminPage() {
  const router = useRouter();
  const { user, initialized, logout, colleges } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>('dashboard');

  // College-scoped students
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Faculty management
  const [facultyUsers, setFacultyUsers] = useState<DbUser[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', password: '' });
  const [facultyMsg, setFacultyMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Register view state
  const [form, setForm] = useState({ name: '', studentId: '', course: '', year: '', email: '', phone: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Deleted students
  const [deletedStudents, setDeletedStudents] = useState<StudentRecord[]>([]);
  const [showDeletedStudents, setShowDeletedStudents] = useState(false);

  // Deleted faculty
  const [deletedFaculty, setDeletedFaculty] = useState<DbUser[]>([]);
  const [showDeletedFaculty, setShowDeletedFaculty] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'faculty_admin') { router.push('/faculty'); return; }
  }, [user, initialized, router]);

  // Load college's students
  useEffect(() => {
    if (!user?.college) return;
    setStudentsLoading(true);
    getStudentsByCollege(user.college).then(data => {
      setStudents(data);
      setStudentsLoading(false);
    });
  }, [user?.college]);

  // Load faculty (active + deleted) when faculty view is active
  useEffect(() => {
    if (activeView === 'faculty' && user?.college) {
      setFacultyLoading(true);
      Promise.all([
        getUsersByCollege(user.college),
        getDeletedUsersByCollege(user.college),
      ]).then(([active, deleted]) => {
        setFacultyUsers(active);
        setDeletedFaculty(deleted);
        setFacultyLoading(false);
      });
    }
  }, [activeView, user?.college]);

  const handleRestoreFaculty = async (id: number) => {
    const result = await restoreUserInDb(id);
    if (result.success) {
      const restored = deletedFaculty.find(u => u.id === id);
      setDeletedFaculty(prev => prev.filter(u => u.id !== id));
      if (restored) setFacultyUsers(prev => [restored, ...prev]);
    }
  };

  // Load deleted students when on dashboard
  useEffect(() => {
    if (activeView === 'dashboard' && user?.college) {
      getDeletedStudentsByCollege(user.college).then(setDeletedStudents);
    }
  }, [activeView, user?.college]);

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      const restored = deletedStudents.find(s => s.id === id);
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      if (restored) setStudents(prev => [restored, ...prev]);
    }
  };

  const handleDeleteStudent = (id: string) => {
    setConfirmDialog({
      title: 'Delete Student',
      message: 'The student record will be soft-deleted. You can restore it later from the Deleted Students section.',
      onConfirm: async () => {
        const deletedBy = user?.name || user?.email;
        const result = await deleteStudentFromDb(id, deletedBy);
        if (result.success) {
          const removed = students.find(s => s.id === id);
          setStudents(prev => prev.filter(s => s.id !== id));
          if (removed) setDeletedStudents(prev => [{ ...removed, deletedBy: deletedBy || null }, ...prev]);
          showToast('Student removed.', 'success');
        } else {
          showToast('Failed to remove student.', 'error');
        }
        setConfirmDialog(null);
      },
    });
  };

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

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      Name: s.name,
      'Student ID': s.studentId,
      College: s.college,
      Course: s.course,
      Year: s.year,
      Email: s.email,
      Phone: s.phone,
      'Added By': s.createdBy || 'Unknown',
      'Created At': new Date(s.createdAt).toLocaleDateString(),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `${user?.college ?? 'College'}_Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePhoto = (file: File | null) => {
    if (!file) { setPhotoPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX = 400;
        if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
        else { if (height > MAX) { width *= MAX / height; height = MAX; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const createStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.college) { setNotice({ message: 'No college associated with your account.', type: 'error' }); return; }
    const record: StudentRecord = {
      id: `${Date.now()}`,
      college: user.college,
      ...form,
      photo: photoPreview || undefined,
      createdBy: user?.name || user?.email || 'Unknown',
      createdAt: new Date().toISOString(),
    };
    const result = await addStudentToDb(record);
    if (result.success) {
      setStudents(prev => [record, ...prev]);
      setNotice({ message: 'Student record saved successfully.', type: 'success' });
      setForm({ name: '', studentId: '', course: '', year: '', email: '', phone: '' });
      setPhotoPreview(null);
      setUploadFile(null);
      setTimeout(() => setNotice(null), 3000);
    } else {
      setNotice({ message: 'Failed to save student record.', type: 'error' });
    }
  };

  const handleExcelUpload = async () => {
    if (!uploadFile) { setNotice({ message: 'Select an Excel file first.', type: 'error' }); return; }
    try {
      const data = await uploadFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      const [headers, ...values] = rows;
      if (!headers || !Array.isArray(headers)) {
        setNotice({ message: 'Excel file appears empty or invalid.', type: 'error' }); return;
      }
      const norm = headers.map((h) => String(h ?? '').trim().toLowerCase());
      const records: StudentRecord[] = values.map((row) => {
        const entry = Array.isArray(row)
          ? row.reduce<Record<string, string>>((acc, v, i) => { acc[norm[i] ?? ''] = String(v ?? ''); return acc; }, {})
          : {};
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          college: user?.college || '',
          name: entry.name || 'Unnamed Student',
          studentId: entry['student id'] || entry.studentid || 'N/A',
          course: entry.course || 'General Studies',
          year: entry.year || '1',
          email: entry.email || 'no-email@example.com',
          phone: entry.phone || 'N/A',
          createdBy: user?.name || user?.email || 'Imported',
          createdAt: new Date().toISOString(),
        };
      });
      for (const record of records) {
        await addStudentToDb(record);
      }
      setStudents(prev => [...records, ...prev]);
      setNotice({ message: `${records.length} records imported successfully.`, type: 'success' });
      setUploadFile(null);
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ message: 'Failed to parse Excel file.', type: 'error' });
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Name: 'John Doe', 'Student ID': 'STU-001', Course: 'Computer Science', Year: '2024', Email: 'john@college.edu', Phone: '+91 98765 43210' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student-import-template.xlsx');
  };

  const exportPDF = async () => {
    const el = document.getElementById('fa-registry-section');
    if (!el) return;
    setNotice({ message: 'Generating PDF…', type: 'success' });
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fcfdfe' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'px', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const props = pdf.getImageProperties(imgData);
    const ratio = Math.min(pw / props.width, ph / props.height);
    pdf.addImage(imgData, 'PNG', 0, 0, props.width * ratio, props.height * ratio);
    pdf.save(`${user?.college ?? 'College'}_Registry_${new Date().toISOString().slice(0, 10)}.pdf`);
    setNotice({ message: 'PDF exported successfully!', type: 'success' });
    setTimeout(() => setNotice(null), 3000);
  };

  if (!initialized || !user || user.role !== 'faculty_admin') return null;

  const initials = (user.name?.[0] ?? user.email[0]).toUpperCase();

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
          {[
            { view: 'dashboard' as const, icon: <FiLayout className="w-4 h-4 shrink-0" />, label: 'Dashboard' },
            { view: 'register' as const, icon: <FiUserPlus className="w-4 h-4 shrink-0" />, label: 'Register' },
            { view: 'faculty' as const, icon: <FiUsers className="w-4 h-4 shrink-0" />, label: 'Faculty' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${
                activeView === view ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {icon}
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </button>
          ))}
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
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <FiLogOut className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
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
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-500/20 border border-violet-500/30 text-[0.55rem] font-black uppercase tracking-widest text-violet-300 shrink-0">
            <FiShield className="w-2.5 h-2.5" /> Fac. Admin
          </span>
        </div>


        <main className="flex-1 min-w-0 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">

          {/* ── Dashboard ── */}
          {activeView === 'dashboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                    {studentsLoading ? 'Loading…' : `${students.length} students · ${user.college}`}
                  </p>
                </div>
                <button onClick={exportExcel} className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition shadow-sm" title="Export Excel">
                  <FiDownload className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
                {studentsLoading ? (
                  <div className="py-16 text-center text-sm text-slate-400 font-bold">Loading students…</div>
                ) : (
                  <StudentTable students={students} onDelete={handleDeleteStudent} />
                )}
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
                    {deletedStudents.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedStudents.length}</span>
                    )}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedStudents ? 'rotate-180' : ''}`} />
                </button>
                {showDeletedStudents && (
                  <div className="border-t border-slate-100">
                    {deletedStudents.length === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted students.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-separate border-spacing-0">
                          <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left">Student</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden sm:table-cell">Course</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden md:table-cell">Deleted By</th>
                              <th className="px-4 lg:px-6 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deletedStudents.map(s => (
                              <tr key={s.id} className="bg-rose-50/20">
                                <td className="px-4 lg:px-6 py-3">
                                  <p className="font-bold text-slate-400 text-sm">{s.name}</p>
                                  <p className="text-[0.65rem] text-slate-300">{s.studentId}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden sm:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{s.course}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden md:table-cell">
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
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Register ── */}
          {activeView === 'register' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Register Students</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Add new students manually or import via Excel</p>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">

                {/* Manual form */}
                <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-violet-500 p-2.5 rounded text-white shrink-0">
                      <FiUserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Manual Registration</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Fill in student details below</p>
                    </div>
                  </div>

                  <form onSubmit={createStudent} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Institution</span>
                        <input value={user.college ?? ''} readOnly className="input-field bg-slate-50 text-slate-500 cursor-not-allowed" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Course</span>
                        <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required className="input-field" placeholder="e.g. Computer Science" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Full Legal Name</span>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="Student's full name" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Registration ID</span>
                        <input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required className="input-field" placeholder="ID-00000" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Academic Year</span>
                        <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required className="input-field" placeholder="e.g. 2024" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Email</span>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="input-field" placeholder="name@college.edu" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Contact</span>
                        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="input-field" placeholder="+91 00000 00000" />
                      </label>
                      <div className="sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Profile Photograph</span>
                        <div className="relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => { const f = e.target.files?.[0] ?? null; setUploadFile(f); handlePhoto(f); }}
                            className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                          />
                          <div className="flex items-center justify-between gap-3 p-4 rounded border-2 border-dashed border-slate-200 group-hover:border-violet-500 transition bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                                {photoPreview
                                  ? <img src={photoPreview} className="w-full h-full object-cover" alt="" />
                                  : <FiUpload className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">{photoPreview ? 'Photo Ready' : 'Choose File'}</p>
                                <p className="text-xs text-slate-400">{photoPreview ? 'Compressed for DB' : 'JPG, PNG'}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 bg-white rounded border border-slate-200 text-xs font-bold text-slate-600 group-hover:text-violet-600 transition shrink-0">Browse</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {notice && (
                      <p className={`text-sm font-bold p-3 rounded ${notice.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {notice.message}
                      </p>
                    )}

                    <button type="submit" className="w-full bg-violet-500 text-white font-black py-3.5 rounded hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm">
                      Register Student Profile
                    </button>
                  </form>
                </div>

                {/* Bulk + Export */}
                <div className="space-y-6">
                  <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-violet-500 p-2.5 rounded text-white shrink-0">
                        <FiUpload className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">Bulk Import</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Batch process Excel data sheets</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={downloadTemplate}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-black py-2.5 rounded hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600 transition text-sm"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download Excel Template
                      </button>
                      <div className="relative group">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                          className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                        />
                        <div className="p-8 rounded border-2 border-dashed border-slate-200 group-hover:border-violet-500 transition bg-slate-50/50 text-center space-y-2">
                          <FiUpload className="w-6 h-6 mx-auto text-slate-300 group-hover:text-violet-500 transition" />
                          <p className="text-sm font-bold text-slate-500">{uploadFile ? uploadFile.name : 'Drop Excel File Here'}</p>
                          <p className="text-xs text-slate-400">Click to browse</p>
                        </div>
                      </div>
                      <button type="button" onClick={handleExcelUpload} className="w-full bg-slate-900 text-white font-black py-3 rounded hover:bg-violet-600 transition shadow-sm text-sm active:scale-95">
                        Process All Records
                      </button>
                    </div>
                  </div>

                  <div id="fa-registry-section" className="bg-slate-900 rounded border border-slate-800 p-4 lg:p-6 text-white">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-white/10 p-2.5 rounded border border-white/10 text-violet-400 shrink-0">
                        <FiDownload className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">Export</h2>
                        <p className="text-xs text-white/50 mt-0.5">Download student data</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={exportExcel} className="bg-white text-slate-900 font-black py-3 rounded hover:bg-slate-100 transition text-sm flex items-center justify-center gap-2 active:scale-95">
                        <FiDownload className="w-4 h-4" /> Excel
                      </button>
                      <button type="button" onClick={exportPDF} className="bg-slate-800 text-white font-black py-3 rounded hover:bg-slate-700 transition border border-white/10 text-sm flex items-center justify-center gap-2 active:scale-95">
                        <FiDownload className="w-4 h-4" /> PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Faculty ── */}
          {activeView === 'faculty' && (
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

                {facultyLoading ? (
                  <div className="px-6 py-16 text-center text-sm text-slate-400 font-bold">Loading faculty…</div>
                ) : facultyUsers.length === 0 ? (
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
                              <p className="text-slate-400 font-medium text-xs">{new Date(u.created_at).toLocaleDateString()}</p>
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
            </div>
          )}

        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900 border-t border-white/10 flex">
        {([
          { view: 'dashboard' as const, icon: <FiLayout className="w-5 h-5" />, label: 'Dashboard' },
          { view: 'register' as const, icon: <FiUserPlus className="w-5 h-5" />, label: 'Register' },
          { view: 'faculty' as const, icon: <FiUsers className="w-5 h-5" />, label: 'Faculty' },
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

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${
          toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
        }`}>
          <span className="shrink-0">{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="truncate">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
