'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { StudentRecord } from '@/lib/types';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FiUserPlus, FiUpload, FiDownload, FiUsers } from 'react-icons/fi';

export default function StudentPage() {
  const router = useRouter();
  const { user, students, addStudent, importStudents, deleteStudent, colleges } = useAuth();
  const [form, setForm] = useState({ college: '', name: '', studentId: '', course: '', year: '', email: '', phone: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.college) {
      setForm((prev) => ({ ...prev, college: user.college! }));
    } else if (!form.college && colleges.length) {
      setForm((prev) => ({ ...prev, college: colleges[0] }));
    }
  }, [user, router, colleges, form.college]);

  const studentCount = students.length;
  const selectedCollegeCount = useMemo(
    () => students.filter((item) => item.college === form.college).length,
    [students, form.college],
  );

  const handlePhoto = (file: File | null) => {
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 400;
        if (width > height) {
          if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const createStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: StudentRecord = {
      id: `${Date.now()}`,
      college: form.college,
      name: form.name,
      studentId: form.studentId,
      course: form.course,
      year: form.year,
      email: form.email,
      phone: form.phone,
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
    if (!uploadFile) {
      setNotice({ message: 'Select an Excel file first.', type: 'error' });
      return;
    }
    try {
      const data = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
      const [headers, ...values] = rows;
      if (!headers || !Array.isArray(headers)) {
        setNotice({ message: 'Excel file appears to be empty or invalid.', type: 'error' });
        return;
      }
      const normalizedHeaders = headers.map((header) => String(header ?? '').trim().toLowerCase());
      const mappedRecords = values.map((row) => {
        const entry = Array.isArray(row)
          ? row.reduce<Record<string, string>>((memo, value, index) => {
              memo[normalizedHeaders[index] ?? ''] = String(value ?? '');
              return memo;
            }, {})
          : {};
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          college: entry.college || 'Engineering College',
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
      await importStudents(mappedRecords);
      setNotice({ message: `${mappedRecords.length} records imported successfully.`, type: 'success' });
      setUploadFile(null);
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ message: 'Failed to parse Excel file. Please use a valid .xlsx file.', type: 'error' });
    }
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(students.map((item) => ({
      Name: item.name,
      'Student ID': item.studentId,
      College: item.college,
      Course: item.course,
      Year: item.year,
      Email: item.email,
      Phone: item.phone,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student-records.xlsx');
  };

  const exportPDF = async () => {
    const element = document.getElementById('student-registry-section');
    if (!element) return;
    setNotice({ message: 'Generating PDF report...', type: 'success' });
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fcfdfe' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'px', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageProps = pdf.getImageProperties(imgData);
    const ratio = Math.min(pageWidth / imageProps.width, pageHeight / imageProps.height);
    pdf.addImage(imgData, 'PNG', 0, 0, imageProps.width * ratio, imageProps.height * ratio);
    pdf.save(`Student_Registry_Report_${new Date().toLocaleDateString()}.pdf`);
    setNotice({ message: 'PDF exported successfully!', type: 'success' });
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 sm:px-6 py-8 sm:py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8 sm:space-y-12">

        {/* Header Section */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-white p-5 sm:p-8 lg:p-12 shadow-2xl shadow-slate-200/50 border border-white/40">
          <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-cyan-100 rounded-full -mr-32 sm:-mr-64 -mt-32 sm:-mt-64 blur-[80px] sm:blur-[120px] opacity-40 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-blue-100 rounded-full -ml-24 sm:-ml-48 -mb-24 sm:-mb-48 blur-[60px] sm:blur-[100px] opacity-30 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-6 sm:gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 sm:space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700 text-[0.65rem] sm:text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Active Portal
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Database</span><br className="hidden sm:block" /> Management.
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-lg">A professional environment for college administrators to manage, track, and export student credentials.</p>
            </div>
            <div className="flex flex-row sm:flex-col gap-4 w-full sm:w-auto">
              <div className="rounded-2xl sm:rounded-[2.5rem] bg-white p-5 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 sm:min-w-[180px] text-center group hover:scale-105 transition duration-500">
                <p className="text-[0.6rem] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total Registry</p>
                <p className="mt-2 sm:mt-3 text-4xl sm:text-5xl font-black text-slate-900 group-hover:text-cyan-600 transition tracking-tighter">{studentCount}</p>
              </div>
              <div className="rounded-2xl sm:rounded-[2.5rem] bg-slate-900 p-5 sm:p-8 shadow-2xl shadow-slate-900/20 flex-1 sm:min-w-[180px] text-center group hover:scale-105 transition duration-500">
                <p className="text-[0.6rem] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Active College</p>
                <p className="mt-2 sm:mt-3 text-4xl sm:text-5xl font-black text-white group-hover:text-cyan-400 transition tracking-tighter">{selectedCollegeCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Add Student Form */}
          <div className="rounded-2xl sm:rounded-[2.5rem] bg-white p-5 sm:p-8 lg:p-12 shadow-xl shadow-slate-200/50 border border-white/40">
            <div className="flex items-center gap-4 sm:gap-5 mb-7 sm:mb-10">
              <div className="bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white shadow-lg shrink-0"><FiUserPlus className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900">Registration</h2>
                <p className="text-slate-500 font-medium text-sm">Initialize new student profiles manually.</p>
              </div>
            </div>

            <form onSubmit={createStudent} className="space-y-5 sm:space-y-8">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Institution</span>
                  <select
                    value={form.college}
                    onChange={(event) => setForm({ ...form, college: event.target.value })}
                    className="input-field"
                  >
                    {colleges.map((college) => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Course</span>
                  <input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} required className="input-field" placeholder="e.g. Computer Science" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Legal Name</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="input-field" placeholder="Enter student's full name" />
                </label>
                <label className="block">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Registration ID</span>
                  <input value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required className="input-field" placeholder="ID-00000" />
                </label>
                <label className="block">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Academic Year</span>
                  <input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} required className="input-field" placeholder="e.g. 2024" />
                </label>
                <label className="block">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email</span>
                  <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className="input-field" placeholder="name@college.edu" />
                </label>
                <label className="block">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Contact</span>
                  <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required className="input-field" placeholder="+91 00000 00000" />
                </label>
                <div className="sm:col-span-2">
                  <span className="mb-2 sm:mb-3 block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Profile Photograph</span>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setUploadFile(file);
                        handlePhoto(file);
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-cyan-500 transition duration-300 bg-slate-50/50">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                          {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover rounded-xl" /> : <FiUpload className="w-4 h-4" />}
                        </div>
                        <div className="text-left">
                          <p className="text-xs sm:text-sm font-bold text-slate-700">{photoPreview ? 'Photo Ready' : 'Choose File'}</p>
                          <p className="text-xs text-slate-400">{photoPreview ? 'Compressed for DB' : 'Supports JPG, PNG'}</p>
                        </div>
                      </div>
                      <button type="button" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg sm:rounded-xl border border-slate-200 text-xs font-bold text-slate-600 group-hover:text-cyan-600 transition shrink-0">Browse</button>
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="button-primary w-full shadow-2xl shadow-slate-900/10 py-3.5 sm:py-4 text-sm sm:text-base">
                Register Student Profile
              </button>
            </form>
          </div>

          {/* Bulk Operations */}
          <div className="space-y-6 sm:space-y-10">
            <div className="rounded-2xl sm:rounded-[2.5rem] bg-white p-5 sm:p-8 lg:p-12 shadow-xl shadow-slate-200/50 border border-white/40">
              <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-10">
                <div className="bg-blue-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-blue-200 shrink-0"><FiUpload className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900">Bulk Import</h2>
                  <p className="text-slate-500 font-medium text-sm">Batch process Excel data sheets.</p>
                </div>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="relative group">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                  />
                  <div className="p-6 sm:p-10 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-blue-500 transition duration-300 bg-slate-50/50 text-center space-y-2 sm:space-y-3">
                    <FiUpload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-slate-300 group-hover:text-blue-500 transition duration-300" />
                    <p className="text-xs sm:text-sm font-bold text-slate-500">{uploadFile ? uploadFile.name : 'Drop Excel File Here'}</p>
                    <p className="text-xs text-slate-400">Click to browse your device</p>
                  </div>
                </div>
                <button onClick={handleExcelUpload} className="w-full bg-blue-600 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-blue-700 transition shadow-xl shadow-blue-100 text-sm sm:text-base">
                  Process All Records
                </button>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-[2.5rem] bg-slate-900 p-5 sm:p-8 lg:p-12 shadow-2xl shadow-slate-900/30 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 blur-2xl group-hover:scale-150 transition duration-1000 pointer-events-none"></div>
              <div className="relative z-10 flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                <div className="bg-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg shrink-0"><FiDownload className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black">Export Engine</h2>
                  <p className="text-xs sm:text-sm opacity-60">High-fidelity data output.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button onClick={exportExcel} className="bg-white text-slate-900 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-slate-100 transition shadow-xl active:scale-95 flex items-center justify-center gap-2 text-sm">
                  <FiDownload className="w-4 h-4" /> Excel
                </button>
                <button onClick={exportPDF} className="bg-slate-800 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-slate-700 transition shadow-xl border border-white/10 active:scale-95 flex items-center justify-center gap-2 text-sm">
                  <FiDownload className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        {notice && (
          <div className={`fixed bottom-6 sm:bottom-10 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 sm:gap-4 font-black text-xs sm:text-sm border-2 animate-bounce ${
            notice.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
          }`}>
            <span className="text-base sm:text-lg">{notice.type === 'success' ? '⚡' : '⚠️'}</span> {notice.message}
          </div>
        )}

        {/* Student Registry */}
        <section className="space-y-6 sm:space-y-8 pt-8 sm:pt-10 border-t border-slate-200" id="student-registry-section">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 ml-1 sm:ml-2">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100 shrink-0"><FiUsers className="w-5 h-5 sm:w-7 sm:h-7" /></div>
              <div>
                <p className="text-[0.6rem] sm:text-xs font-black uppercase tracking-[0.3em] text-cyan-600 mb-1">Global Registry</p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">Active Student Database</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 rounded-lg sm:rounded-xl border border-slate-200 text-xs font-bold text-slate-500">
                Sync Status: <span className="text-emerald-600">Encrypted</span>
              </div>
            </div>
          </div>

          <StudentTable students={students} onDelete={deleteStudent} />
        </section>
      </div>
    </main>
  );
}
