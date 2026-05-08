'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { StudentRecord } from '@/lib/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

export default function StudentPage() {
  const router = useRouter();
  const { user, students, addStudent, importStudents, colleges } = useAuth();
  const [form, setForm] = useState({ college: '', name: '', studentId: '', course: '', year: '', email: '', phone: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.college) {
      setForm((prev) => ({ ...prev, college: user.college! }));
      return;
    }
    if (!form.college && colleges.length) {
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
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createStudent = (event: React.FormEvent<HTMLFormElement>) => {
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
    addStudent(record);
    setNotice('Student record saved successfully.');
    setForm({ college: user?.college || colleges[0] || '', name: '', studentId: '', course: '', year: '', email: '', phone: '' });
    setPhotoPreview(null);
    setUploadFile(null);
  };

  const handleExcelUpload = async () => {
    if (!uploadFile) {
      setNotice('Select an Excel file first.');
      return;
    }
    try {
      const data = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
      const [headers, ...values] = rows;
      if (!headers || !Array.isArray(headers)) {
        setNotice('Excel file appears to be empty or invalid.');
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
      importStudents(mappedRecords);
      setNotice(`${mappedRecords.length} records imported successfully.`);
      setUploadFile(null);
    } catch (error) {
      setNotice('Failed to parse Excel file. Please use a valid .xlsx file.');
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
      'Added By': item.createdBy || 'Unknown',
      'Created At': formatDate(item.createdAt),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student-records.xlsx');
  };

  const exportPDF = async () => {
    const element = document.getElementById('student-report');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#020617' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'px', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageProps = pdf.getImageProperties(imgData);
    const ratio = Math.min(pageWidth / imageProps.width, pageHeight / imageProps.height);
    pdf.addImage(imgData, 'PNG', 0, 0, imageProps.width * ratio, imageProps.height * ratio);
    pdf.save('student-report.pdf');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="glass-panel p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-600/90">Student portal</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Add students, upload bulk records, and export clean reports.</h1>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200/80 bg-slate-100/70 p-5">
                <p className="text-sm text-slate-600">Total records</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{studentCount}</p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-slate-100/70 p-5">
                <p className="text-sm text-slate-600">Selected college</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{selectedCollegeCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.95fr_0.85fr]">
          <div className="glass-panel p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Enter student details</h2>
            <p className="mt-2 text-slate-600">Save student records with optional photo uploads for a strong ID card presentation.</p>
            <form onSubmit={createStudent} className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">College</span>
                  <select value={form.college} onChange={(event) => setForm({ ...form, college: event.target.value })} className="input-field">
                    {colleges.map((college) => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Course / Department</span>
                  <input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} required className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Student full name</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Student ID</span>
                  <input value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Year / Semester</span>
                  <input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} required className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Phone</span>
                  <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Email</span>
                  <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className="input-field" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Photo upload</span>
                  <input type="file" accept="image/*" onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setUploadFile(file);
                    handlePhoto(file);
                  }} className="input-field border-dashed" />
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" className="button-primary w-full sm:w-auto">Save student</button>
                <p className="text-sm text-slate-400">Upload a photo to preview the student card details.</p>
              </div>
            </form>
          </div>
          <div className="glass-panel p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Bulk import & exports</h2>
            <p className="mt-2 text-slate-600">Bring in student records from Excel and export data when you need official reports.</p>
            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Bulk Excel upload</span>
                <input type="file" accept=".xlsx,.xls" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="input-field border-dashed" />
              </label>
              <button onClick={handleExcelUpload} className="button-secondary w-full">Import data from Excel</button>
              <div className="grid gap-4 sm:grid-cols-2">
                <button onClick={exportExcel} className="button-primary w-full">Export to Excel</button>
                <button onClick={exportPDF} className="button-secondary w-full">Export to PDF</button>
              </div>
            </div>
            {notice ? <p className="mt-4 rounded-3xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{notice}</p> : null}
          </div>
        </section>

        <section className="glass-panel p-8" id="student-report">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600/90">Student registry</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Active student list</h2>
            </div>
            <p className="text-sm text-slate-600">Records are stored locally and ready for export anytime.</p>
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
                  <th className="px-4 py-4">Added</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
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
                    <td className="px-4 py-4 text-slate-600">{formatDate(student.createdAt)}</td>
                  </tr>
                ))}
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No student records yet. Add a student or upload Excel data to begin.</td>
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
