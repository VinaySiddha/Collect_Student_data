'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { StudentRecord } from '@/lib/types';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FiUserPlus, FiUpload, FiDownload, FiUsers, FiLogOut, FiLayout, FiMenu, FiX } from 'react-icons/fi';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';

type View = 'dashboard' | 'register';

export default function FacultyPage() {
  const router = useRouter();
  const { user, initialized, logout, students, addStudent, importStudents, deleteStudent, colleges } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [form, setForm] = useState({ college: '', name: '', studentId: '', course: '', year: '', email: '', phone: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.push('/login'); return; }
    if (user.college) {
      setForm((prev) => ({ ...prev, college: user.college! }));
    } else if (!form.college && colleges.length) {
      setForm((prev) => ({ ...prev, college: colleges[0] }));
    }
  }, [user, initialized, router, colleges, form.college]);

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
    const record: StudentRecord = {
      id: `${Date.now()}`,
      ...form,
      photo: photoPreview || undefined,
      createdBy: user?.name || user?.email || 'Unknown',
      createdAt: new Date().toISOString(),
    };
    await addStudent(record);
    setNotice({ message: 'Student record saved successfully.', type: 'success' });
    setForm({ college: user?.college || colleges[0] || '', name: '', studentId: '', course: '', year: '', email: '', phone: '' });
    setPhotoPreview(null);
    setUploadFile(null);
    setTimeout(() => setNotice(null), 3000);
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
      const records = values.map((row) => {
        const entry = Array.isArray(row)
          ? row.reduce<Record<string, string>>((acc, v, i) => { acc[norm[i] ?? ''] = String(v ?? ''); return acc; }, {})
          : {};
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          college: user?.college || entry.college || '',
          name: entry.name || 'Unnamed Student',
          studentId: entry['student id'] || entry.studentId || 'N/A',
          course: entry.course || 'General Studies',
          year: entry.year || '1',
          email: entry.email || 'no-email@example.com',
          phone: entry.phone || 'N/A',
          createdBy: user?.name || user?.email || 'Imported',
          createdAt: new Date().toISOString(),
        } as StudentRecord;
      });
      await importStudents(records);
      setNotice({ message: `${records.length} records imported successfully.`, type: 'success' });
      setUploadFile(null);
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ message: 'Failed to parse Excel file.', type: 'error' });
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(facultyStudents.map((s) => ({
      Name: s.name, 'Student ID': s.studentId, College: s.college,
      Course: s.course, Year: s.year, Email: s.email, Phone: s.phone,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `student-records-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
    const el = document.getElementById('faculty-registry-section');
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
    pdf.save(`Faculty_Registry_${new Date().toISOString().slice(0, 10)}.pdf`);
    setNotice({ message: 'PDF exported successfully!', type: 'success' });
    setTimeout(() => setNotice(null), 3000);
  };

  const facultyStudents = user?.college
    ? students.filter((s) => s.college === user.college)
    : students;

  if (!initialized || !user) return null;

  const initials = (user.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();

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
      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-blue-950 flex flex-col overflow-hidden transition-all duration-300 w-64 lg:sticky lg:top-0 lg:shrink-0 lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand + toggle */}
        <div className="border-b border-white/10 px-3 py-4 flex items-center justify-between gap-2">

          {/* Mobile: always show full brand + close button */}
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Portal</p>
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
              className="hidden lg:flex w-8 h-8 bg-blue-500 rounded items-center justify-center mx-auto group transition"
            >
              <span className="text-white text-sm font-black group-hover:hidden">G</span>
              <GoSidebarCollapse className="w-4 h-4 text-white hidden group-hover:block" />
            </button>
          ) : (
            <div className="hidden lg:flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">G</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm leading-none">Gographic</p>
                  <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Portal</p>
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
            { view: 'register' as const, icon: <FiUserPlus className="w-4 h-4 shrink-0" />, label: 'Register' },
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
            title={collapsed ? (user?.name || 'User') : undefined}
          >
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{initials}</span>
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-black truncate leading-none">{user?.name || 'User'}</p>
              <p className="text-white/40 text-[0.6rem] truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
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
        <div className="sticky top-0 z-30 lg:hidden bg-blue-950 px-4 py-3 flex items-center gap-3 shadow-lg">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 text-white/70 hover:text-white transition"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">G</span>
            </div>
            <p className="text-white font-black text-sm">Gographic</p>
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-y-auto">

          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <div id="faculty-registry-section" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{facultyStudents.length} students in registry</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={exportExcel} className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition shadow-sm" title="Export Excel">
                    <FiDownload className="w-4 h-4" />
                  </button>
                  <button onClick={exportPDF} className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition shadow-sm" title="Export PDF">
                    <FiUsers className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
                <StudentTable students={facultyStudents} onDelete={deleteStudent} />
              </div>
            </div>
          )}

          {/* Register */}
          {activeView === 'register' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Register Students</h1>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Add new students manually or import via Excel</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

                {/* Manual form */}
                <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-600 p-2.5 rounded text-white shrink-0">
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
                        <input value={form.college} readOnly className="input-field bg-slate-50 text-slate-500 cursor-not-allowed" />
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
                          <div className="flex items-center justify-between gap-3 p-4 rounded border-2 border-dashed border-slate-200 group-hover:border-blue-500 transition bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                                {photoPreview
                                  ? <img src={photoPreview} className="w-full h-full object-cover rounded" alt="" />
                                  : <FiUpload className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">{photoPreview ? 'Photo Ready' : 'Choose File'}</p>
                                <p className="text-xs text-slate-400">{photoPreview ? 'Compressed for DB' : 'JPG, PNG'}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 bg-white rounded border border-slate-200 text-xs font-bold text-slate-600 group-hover:text-blue-600 transition shrink-0">Browse</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-black py-3.5 rounded hover:bg-blue-700 transition shadow-sm active:scale-95 text-sm">
                      Register Student Profile
                    </button>
                  </form>
                </div>

                {/* Bulk + Export */}
                <div className="space-y-6">
                  <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-blue-600 p-2.5 rounded text-white shrink-0">
                        <FiUpload className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">Bulk Import</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Batch process Excel data sheets</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={downloadTemplate}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-black py-2.5 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm"
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
                        <div className="p-8 rounded border-2 border-dashed border-slate-200 group-hover:border-blue-500 transition bg-slate-50/50 text-center space-y-2">
                          <FiUpload className="w-6 h-6 mx-auto text-slate-300 group-hover:text-blue-500 transition" />
                          <p className="text-sm font-bold text-slate-500">{uploadFile ? uploadFile.name : 'Drop Excel File Here'}</p>
                          <p className="text-xs text-slate-400">Click to browse</p>
                        </div>
                      </div>
                      <button onClick={handleExcelUpload} className="w-full bg-slate-900 text-white font-black py-3 rounded hover:bg-blue-700 transition shadow-sm text-sm active:scale-95">
                        Process All Records
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded border border-slate-800 p-4 lg:p-6 text-white">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-white/10 p-2.5 rounded border border-white/10 text-blue-400 shrink-0">
                        <FiDownload className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">Export</h2>
                        <p className="text-xs text-white/50 mt-0.5">Download student data</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={exportExcel} className="bg-white text-slate-900 font-black py-3 rounded hover:bg-slate-100 transition text-sm flex items-center justify-center gap-2 active:scale-95">
                        <FiDownload className="w-4 h-4" /> Excel
                      </button>
                      <button onClick={exportPDF} className="bg-slate-800 text-white font-black py-3 rounded hover:bg-slate-700 transition border border-white/10 text-sm flex items-center justify-center gap-2 active:scale-95">
                        <FiDownload className="w-4 h-4" /> PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Toast */}
      {notice && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded shadow-2xl flex items-center gap-3 font-black text-sm border-2 whitespace-nowrap ${
          notice.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
        }`}>
          <span>{notice.type === 'success' ? '✅' : '⚠️'}</span> {notice.message}
        </div>
      )}
    </div>
  );
}
