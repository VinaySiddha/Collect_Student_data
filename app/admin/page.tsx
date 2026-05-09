'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AdminPage() {
  const router = useRouter();
  const { user, login, logout, students, colleges, addCollege, removeCollege } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('All colleges');
  const [newCollege, setNewCollege] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const filteredStudents = useMemo(
    () => (filter === 'All colleges' ? students : students.filter((student) => student.college === filter)),
    [filter, students],
  );

  const collegeOptions = ['All colleges', ...colleges];

  const topColleges = useMemo(() => {
    return colleges.map((college) => ({ college, count: students.filter((record) => record.college === college).length }));
  }, [students, colleges]);

  const handleAddCollege = () => {
    const result = addCollege(newCollege);
    setMessage(result.message);
    if (result.success) {
      setNewCollege('');
      setFilter(newCollege.trim());
    }
  };

  const handleRemoveCollege = (college: string) => {
    const result = removeCollege(college);
    setMessage(result.message);
    if (result.success) {
      setFilter('All colleges');
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await login(email, password, 'admin');
    setMessage(result.message);
    if (result.success) {
      router.push('/admin');
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
    XLSX.writeFile(workbook, 'admin-college-report.xlsx');
  };

  const exportPDF = async () => {
    const element = document.getElementById('admin-report');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#020617' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'px', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageProps = pdf.getImageProperties(imgData);
    const ratio = Math.min(pageWidth / imageProps.width, pageHeight / imageProps.height);
    pdf.addImage(imgData, 'PNG', 0, 0, imageProps.width * ratio, imageProps.height * ratio);
    pdf.save('admin-report.pdf');
  };

  if (!user || user.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200/70 bg-white/90 p-10 shadow-glass backdrop-blur-xl">
          <div className="mb-8 space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-600/90">Admin sign in</p>
            <h1 className="text-4xl font-semibold text-slate-900">Review college-wise student data.</h1>
            <p className="text-slate-600">Use the admin account to access dashboards and export reports.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-600">Admin email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="input-field" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-600">Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="input-field" />
            </label>
            {message ? <p className="text-sm text-rose-300">{message}</p> : null}
            <button type="submit" className="button-primary w-full">Login as Admin</button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-600">Default admin: admin@college.edu / Admin@123</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="glass-panel p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-600/90">Admin dashboard</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">College-wise reports and exports.</h1>
            </div>
            <button onClick={logout} className="button-secondary w-full sm:w-auto">Logout</button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {topColleges.map((item) => (
            <div key={item.college} className="rounded-3xl border border-slate-200/80 bg-slate-100/70 p-6">
              <p className="text-sm text-slate-600">{item.college}</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{item.count}</p>
            </div>
          ))}
        </section>

        <section className="glass-panel p-8" id="admin-report">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-600/90">Reports</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Filter by college and export data.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportExcel} className="button-primary">Export Excel</button>
              <button onClick={exportPDF} className="button-secondary">Export PDF</button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="mb-2 block text-sm text-slate-600">College filter</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value)} className="input-field w-full sm:w-72">
                  {collegeOptions.map((college) => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
              </label>
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-600">Add college</span>
                  <input
                    type="text"
                    value={newCollege}
                    onChange={(event) => setNewCollege(event.target.value)}
                    placeholder="Enter new college name"
                    className="input-field w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-cyan-400 focus:outline-none transition"
                  />
                </label>
                <button type="button" onClick={handleAddCollege} className="button-primary w-full">
                  Add College
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600">Showing {filteredStudents.length} record(s).</p>
          </div>
          {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
          <div className="mt-8 rounded-3xl border border-slate-200/80 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Registered Colleges</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {colleges.map((college) => (
                <div key={college} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 border border-slate-200">
                  <span className="text-sm text-slate-700">{college}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCollege(college)}
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200/80 bg-white/80">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-900">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-4">Student</th>
                  <th className="px-4 py-4">College</th>
                  <th className="px-4 py-4">Course</th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Phone</th>
                  <th className="px-4 py-4">Added By</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-t border-slate-200/70 hover:bg-slate-100">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-200">
                          {student.photo ? <img src={student.photo} alt={student.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">No photo</div>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-600">{student.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{student.college}</td>
                    <td className="px-4 py-4 text-slate-600">{student.course}</td>
                    <td className="px-4 py-4 text-slate-600">{student.email}</td>
                    <td className="px-4 py-4 text-slate-600">{student.phone}</td>
                    <td className="px-4 py-4 text-slate-600">{student.createdBy || 'Unknown'}</td>
                  </tr>
                ))}
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No matching records for this college yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
