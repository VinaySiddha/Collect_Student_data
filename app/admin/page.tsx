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
    () => (filter === 'All colleges' ? students : students.filter((student) => student.college === filter)),
    [filter, students],
  );

  const collegeOptions = ['All colleges', ...colleges];

  const topColleges = useMemo(() => {
    return colleges.map((college) => ({ 
      college, 
      count: students.filter((record) => record.college === college).length 
    })).sort((a, b) => b.count - a.count);
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
    const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map((item) => ({
      Name: item.name,
      'Student ID': item.studentId,
      College: item.college,
      Course: item.course,
      Year: item.year,
      Email: item.email,
      Phone: item.phone,
      'Added By': item.createdBy || 'Unknown',
      'Created At': new Date(item.createdAt).toLocaleDateString(),
    })));
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

  if (!user || user.role !== 'admin') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white px-6 py-12 text-slate-900 lg:px-10 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-[3rem] border border-slate-200 bg-white p-12 shadow-2xl">
          <div className="mb-10 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-2xl mx-auto shadow-xl">🔐</div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-600 font-black">Admin Access</p>
            <h1 className="text-4xl font-black text-slate-900">Control Center.</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Admin Identifier</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="input-field" placeholder="admin@college.edu" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Secure Key</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="input-field" placeholder="••••••••" />
            </label>
            {message && <p className={`text-sm font-bold p-4 rounded-2xl ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{message.text}</p>}
            <button type="submit" className="button-primary w-full py-5 text-base">Authorize Session</button>
          </form>
          <div className="mt-10 pt-10 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Standard Admin: <span className="text-slate-900 font-bold underline">admin@college.edu</span> / <span className="text-slate-900 font-bold underline">Admin@123</span></p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-12">
        
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-[3rem] bg-white p-12 shadow-2xl shadow-slate-200/50 border border-white/40">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-100 rounded-full -mr-64 -mt-64 blur-[120px] opacity-40"></div>
          <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-widest shadow-lg">
                <FiSettings className="animate-spin-slow" /> Admin Dashboard
              </div>
              <h1 className="text-6xl font-black text-slate-900 leading-[1] tracking-tight">
                Institutional <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Overwatch.</span>
              </h1>
            </div>
            <button onClick={logout} className="group flex items-center gap-3 bg-white border border-slate-200 px-8 py-4 rounded-2xl font-black text-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all duration-300 shadow-xl active:scale-95">
              <FiLogOut className="group-hover:-translate-x-1 transition-transform" /> Sign Out
            </button>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-slate-200/40 border border-white/40 group hover:scale-[1.02] transition duration-500">
             <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 text-center">Global Students</p>
             <p className="text-5xl font-black text-slate-900 text-center tracking-tighter group-hover:text-cyan-600 transition">{students.length}</p>
          </div>
          {topColleges.slice(0, 3).map((item) => (
            <div key={item.college} className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-slate-200/40 border border-white/40 group hover:scale-[1.02] transition duration-500">
               <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 text-center truncate px-2">{item.college}</p>
               <p className="text-5xl font-black text-slate-900 text-center tracking-tighter group-hover:text-cyan-600 transition">{item.count}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Main Registry Section */}
          <div className="space-y-8" id="admin-registry-section">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-4">
              <div className="flex items-center gap-5">
                <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg"><FiUsers className="w-7 h-7" /></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-600 mb-1">Global Data</p>
                  <h2 className="text-4xl font-black text-slate-900 leading-tight">Master Registry</h2>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={exportExcel} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-900 hover:bg-slate-50 transition shadow-sm" title="Export Excel">
                  <FiDownload className="w-5 h-5" />
                </button>
                <button onClick={exportPDF} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-900 hover:bg-slate-50 transition shadow-sm" title="Export PDF Report">
                  <FiUsers className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl shadow-slate-200/40 border border-white/40">
              <div className="mb-10 px-2">
                <label className="block w-full max-w-sm">
                  <span className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Institutional Filter</span>
                  <select value={filter} onChange={(event) => setFilter(event.target.value)} className="input-field">
                    {collegeOptions.map((college) => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </label>
              </div>
              <StudentTable students={filteredStudents} onDelete={deleteStudent} />
            </div>
          </div>

          {/* College Management Section */}
          <div className="space-y-10">
            <div className="rounded-[3rem] bg-white p-12 shadow-xl shadow-slate-200/50 border border-white/40">
              <div className="flex items-center gap-5 mb-10">
                <div className="bg-cyan-600 p-4 rounded-2xl text-white shadow-lg shadow-cyan-200"><FiPlus className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Add Institution</h2>
                  <p className="text-slate-500 font-medium">Expand the institutional network.</p>
                </div>
              </div>
              <div className="space-y-6">
                <input
                  type="text"
                  value={newCollege}
                  onChange={(event) => setNewCollege(event.target.value)}
                  placeholder="Official Institution Name"
                  className="input-field"
                />
                <button onClick={handleAddCollege} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition shadow-xl active:scale-95 flex items-center justify-center gap-3">
                  <FiPlus /> Register Institution
                </button>
              </div>
            </div>

            <div className="rounded-[3rem] bg-slate-900 p-12 shadow-2xl shadow-slate-900/30 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition duration-1000"></div>
              <div className="relative z-10 flex items-center gap-5 mb-8">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 shadow-lg text-cyan-400"><FiMapPin className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-3xl font-black text-white">Registry Management</h2>
                  <p className="text-sm opacity-60">Manage authorized colleges.</p>
                </div>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {colleges.map((college) => (
                  <div key={college} className="flex items-center justify-between rounded-2xl bg-white/5 p-5 border border-white/10 group/item hover:bg-white/10 transition duration-300">
                    <div>
                      <p className="text-sm font-black tracking-tight">{college}</p>
                      <p className="text-[0.6rem] font-bold text-white/40 uppercase tracking-widest mt-1">Authorized Provider</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCollege(college)}
                      className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-sm"
                      title="Remove College"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-10 py-5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-4 font-black text-sm border-2 animate-bounce ${
            message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
          }`}>
            <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span> {message.text}
          </div>
        )}

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
