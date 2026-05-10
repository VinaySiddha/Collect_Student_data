'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import StudentTable from '@/components/StudentTable';
import { FiUsers, FiDownload, FiPlus, FiTrash2, FiMapPin, FiLogOut, FiSettings } from 'react-icons/fi';

export default function AdminPage() {
  const router = useRouter();
  const { user, login, logout, students, colleges, addCollege, removeCollege, deleteStudent } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('All colleges');
  const [newCollege, setNewCollege] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      router.push('/admin');
    }
  }, [user, router]);

  const filteredStudents = useMemo(
    () => (filter === 'All colleges' ? students : students.filter((s) => s.college === filter)),
    [filter, students],
  );

  const collegeOptions = ['All colleges', ...colleges];

  const topColleges = useMemo(() => {
    return colleges
      .map((college) => ({ college, count: students.filter((r) => r.college === college).length }))
      .sort((a, b) => b.count - a.count);
  }, [students, colleges]);

  const handleAddCollege = () => {
    const result = addCollege(newCollege);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setNewCollege('');
      setFilter(newCollege.trim());
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemoveCollege = (college: string) => {
    const result = removeCollege(college);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setFilter('All colleges');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await login(email, password, 'admin');
    if (!result.success) {
      setMessage({ text: result.message, type: 'error' });
    }
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredStudents.map((item) => ({
        Name: item.name,
        'Student ID': item.studentId,
        College: item.college,
        Course: item.course,
        Year: item.year,
        Email: item.email,
        Phone: item.phone,
        'Added By': item.createdBy || 'Unknown',
        'Created At': new Date(item.createdAt).toLocaleDateString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'College Report');
    XLSX.writeFile(workbook, `Admin_Report_${filter.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportPDF = async () => {
    const element = document.getElementById('admin-registry-section');
    if (!element) return;
    setMessage({ text: 'Generating PDF report...', type: 'success' });
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fcfdfe' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'px', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageProps = pdf.getImageProperties(imgData);
    const ratio = Math.min(pageWidth / imageProps.width, pageHeight / imageProps.height);
    pdf.addImage(imgData, 'PNG', 0, 0, imageProps.width * ratio, imageProps.height * ratio);
    pdf.save(`Admin_Registry_Report_${new Date().toLocaleDateString()}.pdf`);
    setMessage({ text: 'PDF exported successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  /* ── Admin login gate ─────────────────────────────────────────── */
  if (!user || user.role !== 'admin') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white px-4 sm:px-6 py-10 sm:py-12 text-slate-900 lg:px-10 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl sm:rounded-[2.5rem] border border-slate-200 bg-white p-6 sm:p-10 lg:p-12 shadow-2xl">
          <div className="mb-8 sm:mb-10 text-center space-y-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white text-xl sm:text-2xl mx-auto shadow-xl">🔐</div>
            <p className="text-xs uppercase tracking-[0.3em] text-green-600 font-black">Admin Access</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">Control Center.</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Admin Identifier</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="admin@college.edu" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Secure Key</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="••••••••" />
            </label>
            {message && (
              <p className={`text-sm font-bold p-3 sm:p-4 rounded-xl sm:rounded-2xl ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {message.text}
              </p>
            )}
            <button type="submit" className="button-primary w-full py-4 sm:py-5 text-sm sm:text-base">Authorize Session</button>
          </form>
          <div className="mt-8 sm:mt-10 pt-8 sm:pt-10 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Default: <span className="text-slate-900 font-bold">admin@college.edu</span> / <span className="text-slate-900 font-bold">Admin@123</span>
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ── Authenticated admin dashboard ───────────────────────────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 sm:px-6 py-8 sm:py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">

        {/* ── Hero header ── */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-white p-5 sm:p-8 lg:p-10 shadow-2xl shadow-slate-200/50 border border-white/40">
          <div className="absolute top-0 right-0 w-[200px] sm:w-[420px] h-[200px] sm:h-[420px] bg-slate-100 rounded-full -mr-24 sm:-mr-52 -mt-24 sm:-mt-52 blur-[60px] sm:blur-[100px] opacity-40 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-900 text-white text-[0.65rem] sm:text-xs font-bold uppercase tracking-widest shadow-lg">
                <FiSettings className="animate-spin-slow w-3 h-3" /> Admin Dashboard
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Institutional <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Overwatch.</span>
              </h1>
            </div>
            <button
              onClick={logout}
              className="group self-start sm:self-auto flex items-center gap-2 sm:gap-3 bg-white border border-slate-200 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all duration-300 shadow-lg active:scale-95"
            >
              <FiLogOut className="group-hover:-translate-x-1 transition-transform w-4 h-4" /> Sign Out
            </button>
          </div>
        </section>

        {/* ── Stats grid ── */}
        <section className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-lg border border-slate-100 group hover:scale-[1.02] transition duration-300 text-center">
            <p className="text-[0.6rem] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2">Total Students</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter group-hover:text-green-600 transition">{students.length}</p>
          </div>
          {topColleges.slice(0, 3).map((item) => (
            <div key={item.college} className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-lg border border-slate-100 group hover:scale-[1.02] transition duration-300 text-center">
              <p className="text-[0.6rem] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2 truncate">{item.college}</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter group-hover:text-green-600 transition">{item.count}</p>
            </div>
          ))}
        </section>

        {/* ── College management (now ABOVE the student table) ── */}
        <section className="grid gap-5 sm:gap-6 sm:grid-cols-2">

          {/* Add Institution */}
          <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
              <div className="bg-green-600 p-2.5 sm:p-3 rounded-xl text-white shadow-md shadow-green-200 shrink-0">
                <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-slate-900">Add Institution</h2>
                <p className="text-slate-500 font-medium text-xs sm:text-sm">Expand the institutional network.</p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <input
                type="text"
                value={newCollege}
                onChange={(e) => setNewCollege(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCollege()}
                placeholder="Official Institution Name"
                className="input-field text-sm"
              />
              <button
                onClick={handleAddCollege}
                className="w-full bg-slate-900 text-white font-black py-3 sm:py-3.5 rounded-xl hover:bg-green-700 transition shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <FiPlus className="w-4 h-4" /> Register Institution
              </button>
            </div>
          </div>

          {/* Registry Management */}
          <div className="rounded-2xl bg-slate-900 p-5 sm:p-7 shadow-2xl shadow-slate-900/30 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="bg-white/10 p-2.5 sm:p-3 rounded-xl border border-white/10 text-green-400 shrink-0">
                  <FiMapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-white">Registry Management</h2>
                  <p className="text-xs sm:text-sm opacity-60">Manage authorized colleges.</p>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3 max-h-[200px] sm:max-h-[220px] overflow-y-auto pr-1 custom-scrollbar-dark">
                {colleges.length === 0 && (
                  <p className="text-xs text-white/40 font-bold text-center py-6">No colleges registered yet.</p>
                )}
                {colleges.map((college) => (
                  <div key={college} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/10 hover:bg-white/10 transition duration-200">
                    <div className="min-w-0 mr-3">
                      <p className="text-xs sm:text-sm font-black tracking-tight truncate">{college}</p>
                      <p className="text-[0.55rem] font-bold text-white/40 uppercase tracking-widest mt-0.5">Authorized</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCollege(college)}
                      className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-200 shrink-0"
                      title="Remove"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Master Student Registry (now BELOW college management) ── */}
        <section className="space-y-5 sm:space-y-6" id="admin-registry-section">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-slate-900 p-2.5 sm:p-3.5 rounded-xl text-white shadow-lg shrink-0">
                <FiUsers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[0.6rem] sm:text-xs font-black uppercase tracking-[0.3em] text-green-600 mb-0.5">Global Data</p>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 leading-tight">Master Registry</h2>
              </div>
            </div>
            {/* Filter + Export in one row */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 sm:flex-none sm:w-52 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-green-400 outline-none transition shadow-sm"
              >
                {collegeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={exportExcel} className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-sm" title="Export Excel">
                <FiDownload className="w-4 h-4" />
              </button>
              <button onClick={exportPDF} className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-sm" title="Export PDF">
                <FiUsers className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl shadow-slate-200/40 border border-white/40 p-4 sm:p-6">
            <StudentTable students={filteredStudents} onDelete={deleteStudent} />
          </div>
        </section>

      </div>

      {/* Toast notification */}
      {message && (
        <div className={`fixed bottom-5 sm:bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 z-50 px-5 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-2xl backdrop-blur-xl flex items-center gap-3 font-black text-xs sm:text-sm border-2 ${
          message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
        }`}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span> {message.text}
        </div>
      )}
    </main>
  );
}
