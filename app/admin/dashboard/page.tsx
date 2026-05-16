'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import StudentTable from '@/components/StudentTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FiDownload, FiArchive, FiRefreshCw, FiRotateCcw, FiChevronDown,
  FiCamera, FiUpload, FiSave, FiX, FiChevronDown as FiChevDown,
} from 'react-icons/fi';
import { getDeletedStudents, getAuditLogs, restoreStudentInDb } from '@/lib/actions';
import TableSkeleton from '@/components/TableSkeleton';
import { formatISTDate } from '@/lib/formatDate';
import { AuditLog, StudentRecord } from '@/lib/types';

export default function AdminDashboardPage() {
  const { user, dataLoaded, students, colleges, deleteStudent, updateStudent, refreshStudents } = useAuth();

  const [refreshing,          setRefreshing]          = useState(false);
  const [activeFilterCollege, setActiveFilterCollege] = useState<string | null>(null);
  const [tableKey,            setTableKey]            = useState(0);
  const [deletedStudents,     setDeletedStudents]     = useState<StudentRecord[]>([]);
  const [deletedLoading,      setDeletedLoading]      = useState(false);
  const [showDeletedStudents, setShowDeletedStudents] = useState(false);
  const [auditLogs,           setAuditLogs]           = useState<AuditLog[]>([]);
  const [logsLoading,         setLogsLoading]         = useState(false);
  const [logsFetched,         setLogsFetched]         = useState(false);
  const [message,             setMessage]             = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit student modal
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [editForm,    setEditForm]    = useState({ name: '', studentId: '', course: '', year: '', email: '', phone: '', college: '' });
  const [editPhoto,   setEditPhoto]   = useState<string | null>(null);
  const [editMsg,     setEditMsg]     = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editSaving,  setEditSaving]  = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (colleges.length > 0 && !activeFilterCollege) setActiveFilterCollege(colleges[0]);
  }, [colleges, activeFilterCollege]);

  // Fetch audit logs once on mount (for download history panel)
  useEffect(() => {
    if (!user?.email || logsFetched) return;
    setLogsFetched(true);
    setLogsLoading(true);
    getAuditLogs()
      .then(a => { setAuditLogs(a); setLogsLoading(false); })
      .catch(() => setLogsLoading(false));
  }, [user?.email, logsFetched]);

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
      setEditMsg({ text: 'Name, Student ID, course and year are required.', type: 'error' }); return;
    }
    setEditSaving(true);
    const updated: StudentRecord = { ...editStudent, ...editForm, photo: editPhoto ?? undefined };
    await updateStudent(updated);
    setEditMsg({ text: 'Student updated successfully.', type: 'success' });
    setEditSaving(false);
    setTimeout(() => { setEditStudent(null); setEditMsg(null); }, 1200);
  };

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      await refreshStudents();
    }
  };

  const exportZip = async () => {
    const exportList = activeFilterCollege ? students.filter(s => s.college === activeFilterCollege) : students;
    if (exportList.length === 0) { setMessage({ text: 'No student records to export.', type: 'error' }); return; }
    setMessage({ text: 'Preparing export…', type: 'success' });
    const sorted = [...exportList].sort((a, b) => a.name.localeCompare(b.name));
    const zip = new JSZip();
    const photos = zip.folder('photos')!;
    const ws = XLSX.utils.json_to_sheet(sorted.map((s, i) => ({
      '#': i + 1, 'Photo': s.photo ? `${i + 1}.png` : '', Name: s.name, Parentage: s.parentage || '',
      'Student ID': s.studentId || '', 'Roll No.': s.rollNo || '', Class: s.studentClass || '',
      College: s.college, Course: s.course || '', Year: s.year || '', Email: s.email || '',
      Phone: s.phone, 'Bus Stop': s.busStop || '', 'Blood Group': s.bloodGroup || '',
      'Added By': s.createdBy || 'Unknown', 'Created At': formatISTDate(s.createdAt),
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
    a.href = url; a.download = `${activeFilterCollege || 'export'}-${new Date().toISOString().slice(0, 10)}.zip`; a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: `Exported ${sorted.length} students · ${photoCount} photo${photoCount !== 1 ? 's' : ''} in photos/ folder.`, type: 'success' });
    setTimeout(() => setMessage(null), 5000);
  };

  const exportExcel = () => {
    const exportList = (activeFilterCollege ? students.filter(s => s.college === activeFilterCollege) : students)
      .sort((a, b) => a.name.localeCompare(b.name));
    const worksheet = XLSX.utils.json_to_sheet(exportList.map((s, i) => ({
      '#': i + 1, 'Photo': s.photo ? `${i + 1}.png` : '', Name: s.name, Parentage: s.parentage || '',
      'Student ID': s.studentId || '', 'Roll No.': s.rollNo || '', Class: s.studentClass || '',
      College: s.college, Course: s.course || '', Year: s.year || '', Email: s.email || '',
      Phone: s.phone, 'Bus Stop': s.busStop || '', 'Blood Group': s.bloodGroup || '',
      'Added By': s.createdBy || 'Unknown', 'Created At': formatISTDate(s.createdAt),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `${activeFilterCollege || 'Admin'}_Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!user) return null;

  const total        = students.length;
  const withPhoto    = students.filter(s => s.photo && s.photo.length > 0).length;
  const missingPhoto = total - withPhoto;
  const completed    = students.filter(s => s.photo && s.photo.length > 0 && s.parentage && s.phone).length;
  const pending      = total - completed;

  const byCollege = colleges.map(c => {
    const cs = students.filter(s => s.college === c);
    return { college: c, total: cs.length, withPhoto: cs.filter(s => s.photo && s.photo.length > 0).length, pending: cs.filter(s => !s.photo || !s.photo.length || !s.parentage).length };
  }).filter(c => c.total > 0);

  const byFaculty = Object.entries(
    students.reduce<Record<string, number>>((acc, s) => { const k = s.createdBy || 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const downloads = auditLogs.filter(l => l.action.startsWith('export_')).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{students.length} students in registry</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={async () => { setRefreshing(true); await refreshStudents(); setRefreshing(false); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95 disabled:opacity-60"
          >
            <FiRefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={exportZip}
            disabled={!activeFilterCollege || students.filter(s => s.college === activeFilterCollege).length === 0}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white rounded font-black text-sm hover:bg-green-700 transition shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
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

      {/* Stat Cards */}
      {!dataLoaded ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
                <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded w-1/3" />
                <div className="h-2 bg-slate-100 rounded w-1/4" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <div className="h-3 bg-slate-200 rounded w-24" />
                </div>
                <TableSkeleton rows={4} cols={3} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Students', value: total,        icon: '👥', color: 'bg-blue-50 border-blue-100',       num: 'text-blue-700',    sub: 'text-blue-400'    },
              { label: 'Completed',       value: completed,    icon: '✅', color: 'bg-emerald-50 border-emerald-100', num: 'text-emerald-700', sub: 'text-emerald-400' },
              { label: 'Pending',         value: pending,      icon: '⏳', color: 'bg-amber-50 border-amber-100',     num: 'text-amber-700',   sub: 'text-amber-400'   },
              { label: 'Missing Photos',  value: missingPhoto, icon: '📷', color: 'bg-rose-50 border-rose-100',       num: 'text-rose-700',    sub: 'text-rose-400'    },
            ].map(({ label, value, icon, color, num, sub }) => (
              <div key={label} className={`rounded-lg border p-4 ${color}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-[0.65rem] font-black uppercase tracking-widest ${sub}`}>{label}</p>
                    <p className={`text-3xl font-black mt-1 ${num}`}>{value}</p>
                    {total > 0 && <p className={`text-[0.65rem] font-bold mt-1 ${sub}`}>{Math.round(value / total * 100)}% of total</p>}
                  </div>
                  <span className="text-xl">{icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* School-wise */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-base">🏫</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">School-wise Report</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {byCollege.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 text-center font-bold">No data yet.</p>
                ) : byCollege.map(({ college, total: ct, withPhoto: wp, pending: pend }) => (
                  <div key={college} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/60">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{college}</p>
                      <p className="text-[0.6rem] text-slate-400 font-medium">{wp} photos · {pend} pending</p>
                    </div>
                    <span className="text-sm font-black text-slate-900 shrink-0">{ct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Faculty productivity */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-base">👩‍🏫</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Faculty Productivity</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {byFaculty.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 text-center font-bold">No entries yet.</p>
                ) : byFaculty.map(([name, count], i) => (
                  <div key={name} className="px-4 py-2.5 flex items-center gap-3">
                    <span className={`w-5 h-5 rounded text-[0.6rem] font-black flex items-center justify-center shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
                    <p className="text-xs font-bold text-slate-700 truncate flex-1">{name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(count / (byFaculty[0]?.[1] || 1) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-600">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download history */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-base">📥</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Download History</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {logsLoading ? <TableSkeleton rows={3} cols={2} /> : downloads.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 text-center font-bold">No downloads yet.</p>
                ) : downloads.map(log => (
                  <div key={log.id} className="px-4 py-2.5 flex items-start gap-2">
                    <span className="text-sm mt-0.5">{log.action === 'export_zip' ? '🗜️' : log.action === 'export_excel' ? '📊' : '📄'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate">{log.userName || log.userEmail}</p>
                      <p className="text-[0.6rem] text-slate-400 font-medium">{log.action.replace('export_', '').toUpperCase()} · {new Date(log.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Table */}
      {!dataLoaded ? (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="px-4 py-3 border-b border-slate-100"><div className="h-3 bg-slate-200 rounded w-32" /></div>
          <TableSkeleton rows={6} cols={5} />
        </div>
      ) : (
        <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
          <StudentTable
            key={tableKey}
            students={[...students].sort((a, b) => a.name.localeCompare(b.name))}
            onDelete={deleteStudent}
            onEdit={openEditModal}
            colleges={colleges}
            defaultFilterCollege={colleges[0]}
            onFilterCollegeChange={c => {
              if (c === null) { setActiveFilterCollege(colleges[0] ?? null); setTableKey(k => k + 1); }
              else             { setActiveFilterCollege(c); }
            }}
          />
        </div>
      )}

      {/* Deleted Students */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => {
            setShowDeletedStudents(v => !v);
            if (deletedStudents.length === 0 && !deletedLoading) {
              setDeletedLoading(true);
              getDeletedStudents().then(d => { setDeletedStudents(d); setDeletedLoading(false); }).catch(() => setDeletedLoading(false));
            }
          }}
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
            {deletedLoading ? <TableSkeleton rows={3} cols={4} /> : (() => {
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
                          <td className="px-4 lg:px-6 py-3 hidden sm:table-cell"><p className="text-sm text-slate-400 font-medium">{s.college}</p></td>
                          <td className="px-4 lg:px-6 py-3 hidden md:table-cell"><p className="text-sm text-slate-400 font-medium">{s.course}</p></td>
                          <td className="px-4 lg:px-6 py-3 hidden lg:table-cell"><p className="text-sm text-slate-400 font-medium">{s.deletedBy ?? '—'}</p></td>
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

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setEditStudent(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                { label: 'Full Name',   key: 'name',      type: 'text',  placeholder: 'Student name' },
                { label: 'Student ID',  key: 'studentId', type: 'text',  placeholder: 'e.g. STU001' },
                { label: 'Course',      key: 'course',    type: 'text',  placeholder: 'e.g. B.Tech CSE' },
                { label: 'Year',        key: 'year',      type: 'text',  placeholder: 'e.g. 3' },
                { label: 'Email',       key: 'email',     type: 'email', placeholder: 'student@email.com' },
                { label: 'Phone',       key: 'phone',     type: 'text',  placeholder: '10-digit number' },
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
                  <select value={editForm.college} onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))} className="input-field text-sm appearance-none pr-8">
                    {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FiChevDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </label>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Photo <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span>
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center">
                    {editPhoto ? <img src={editPhoto} alt="Photo" className="w-full h-full object-cover" /> : <FiCamera className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="relative">
                      <input type="file" accept="image/*" onChange={e => handleEditPhotoFile(e.target.files?.[0] ?? null)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                      <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2 rounded hover:bg-slate-100 transition text-sm">
                        <FiUpload className="w-3.5 h-3.5" /> Upload New Photo
                      </button>
                    </div>
                    {editPhoto && (
                      <button type="button" onClick={() => setEditPhoto(null)} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition text-left">Remove photo</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {editMsg && (
              <p className={`text-sm font-bold p-3 rounded ${editMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{editMsg.text}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={handleSaveEdit} disabled={editSaving} className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60">
                <FiSave className="w-3.5 h-3.5" />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditStudent(null)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
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
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'}`}>
          <span className="shrink-0">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="truncate">{message.text}</span>
        </div>
      )}
    </div>
  );
}
