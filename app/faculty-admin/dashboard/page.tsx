'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getStudentsByCollege, deleteStudentFromDb,
  restoreStudentInDb, addAuditLog, getCollegeDashboardData,
} from '@/lib/actions';
import { StudentRecord } from '@/lib/types';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  FiDownload, FiRefreshCw, FiArchive, FiRotateCcw, FiChevronDown,
} from 'react-icons/fi';
import { formatISTDate } from '@/lib/formatDate';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function FacultyAdminDashboardPage() {
  const { user } = useAuth();

  const [students,            setStudents]            = useState<StudentRecord[]>([]);
  const [studentsLoading,     setStudentsLoading]     = useState(true);
  const [refreshing,          setRefreshing]          = useState(false);
  const [deletedStudents,     setDeletedStudents]     = useState<StudentRecord[]>([]);
  const [showDeletedStudents, setShowDeletedStudents] = useState(false);
  const [searchQuery,         setSearchQuery]         = useState('');
  const [filterClass,         setFilterClass]         = useState('');
  const [filterFaculty,       setFilterFaculty]       = useState('');
  const [toast,               setToast]               = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog,       setConfirmDialog]       = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!user?.college) return;
    setStudentsLoading(true);
    getCollegeDashboardData(user.college).then(({ students, deletedStudents }) => {
      setStudents(students);
      setDeletedStudents(deletedStudents);
      setStudentsLoading(false);
    });
  }, [user?.college]);

  if (!user) return null;

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  const filteredStudents = students
    .filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch  = !q || s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.rollNo ?? '').toLowerCase().includes(q) || (s.studentId ?? '').toLowerCase().includes(q);
      const matchesClass   = !filterClass   || s.studentClass === filterClass;
      const matchesFaculty = !filterFaculty || s.createdBy === filterFaculty;
      return matchesSearch && matchesClass && matchesFaculty;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const allClasses  = [...new Set(students.map(s => s.studentClass).filter(Boolean))] as string[];
  const allFaculty  = [...new Set(students.map(s => s.createdBy).filter(Boolean))]    as string[];

  const dupKey    = (s: StudentRecord) => `${s.name.trim().toLowerCase()}|${s.phone.trim()}`;
  const keyCounts = students.reduce<Record<string, number>>((acc, s) => {
    const k = dupKey(s); acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {});
  const duplicates = students.filter(s => keyCounts[dupKey(s)] > 1);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedStudents.map((s, i) => ({
      '#':           i + 1,
      'Photo':       s.photo ? `${i + 1}.png` : '',
      Name:          s.name,
      'Father/Mother Name': s.parentage || '',
      'Student ID':  s.studentId    || '',
      'Roll No.':    s.rollNo       || '',
      Class:         s.studentClass || '',
      College:       s.college,
      Course:        s.course       || '',
      Year:          s.year         || '',
      Email:         s.email        || '',
      Phone:         s.phone,
      'Date of Birth': s.dob        || '',
      Percentage:    s.percentage   || '',
      'Blood Group': s.bloodGroup   || '',
      Address:       s.address      || '',
      'Bus Stop':    s.busStop      || '',
      'Added By':    s.createdBy    || 'Unknown',
      'Created At':  formatISTDate(s.createdAt),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `${user?.college ?? 'College'}_Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addAuditLog({
      userEmail: user?.email ?? '', userName: user?.name ?? '',
      action: 'export_excel', entityType: 'students',
      details: `Exported ${sortedStudents.length} records (Excel) — ${user?.college}`,
    }).catch(() => {});
  };

  const exportZip = async () => {
    if (sortedStudents.length === 0) { showToast('No student records to export.', 'error'); return; }
    showToast('Preparing export…', 'success');
    const zip    = new JSZip();
    const photos = zip.folder('photos')!;
    const ws = XLSX.utils.json_to_sheet(sortedStudents.map((s, i) => ({
      '#':           i + 1,
      'Photo':       s.photo ? `${i + 1}.png` : '',
      Name:          s.name,
      'Father/Mother Name': s.parentage || '',
      'Student ID':  s.studentId    || '',
      'Roll No.':    s.rollNo       || '',
      Class:         s.studentClass || '',
      College:       s.college,
      Course:        s.course       || '',
      Year:          s.year         || '',
      Email:         s.email        || '',
      Phone:         s.phone,
      'Date of Birth': s.dob        || '',
      Percentage:    s.percentage   || '',
      'Blood Group': s.bloodGroup   || '',
      Address:       s.address      || '',
      'Bus Stop':    s.busStop      || '',
      'Added By':    s.createdBy    || 'Unknown',
      'Created At':  formatISTDate(s.createdAt),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    zip.file('students.xlsx', XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
    let photoCount = 0;
    sortedStudents.forEach((s, i) => {
      if (!s.photo) return;
      photos.file(`${i + 1}.png`, s.photo.replace(/^data:image\/\w+;base64,/, ''), { base64: true });
      photoCount++;
    });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    saveAs(blob, `${user?.college ?? 'College'}_export_${new Date().toISOString().slice(0, 10)}.zip`);
    showToast(`Exported ${sortedStudents.length} students · ${photoCount} photo${photoCount !== 1 ? 's' : ''} in photos/ folder.`, 'success');
    addAuditLog({
      userEmail: user?.email ?? '', userName: user?.name ?? '',
      action: 'export_zip', entityType: 'students',
      details: `Exported ${sortedStudents.length} records, ${photoCount} photos (ZIP) — ${user?.college}`,
    }).catch(() => {});
  };

  const handleDeleteStudent = async (id: string) => {
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
  };

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      const restored = deletedStudents.find(s => s.id === id);
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      if (restored) setStudents(prev => [restored, ...prev]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{studentsLoading ? 'Loading…' : `${students.length} students · ${user.college}`}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={async () => {
              if (!user?.college) return;
              setRefreshing(true);
              const data = await getStudentsByCollege(user.college);
              setStudents(data);
              setRefreshing(false);
            }}
            disabled={refreshing}
            title="Refresh data"
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95 disabled:opacity-60"
          >
            <FiRefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={exportZip} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white rounded font-black text-sm hover:bg-violet-600 transition shadow-sm active:scale-95">
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

      {/* Stat Cards + Faculty Productivity */}
      {(() => {
        const total        = students.length;
        const completed    = students.filter(s => s.photo && s.photo.length > 0 && s.parentage && s.phone).length;
        const pending      = total - completed;
        const missingPhoto = students.filter(s => !s.photo || s.photo.length === 0).length;
        const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

        const facultyMap: Record<string, number> = {};
        students.forEach(s => {
          const key = s.createdBy ?? 'Unknown';
          facultyMap[key] = (facultyMap[key] ?? 0) + 1;
        });
        const facultyList = Object.entries(facultyMap).sort((a, b) => b[1] - a[1]);
        const maxCount = facultyList[0]?.[1] ?? 1;

        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Students', value: total,        pct: 100,          color: 'bg-violet-500' },
                { label: 'Completed',      value: completed,    pct: pct(completed),  color: 'bg-emerald-500' },
                { label: 'Pending',        value: pending,      pct: pct(pending),    color: 'bg-amber-500' },
                { label: 'Missing Photos', value: missingPhoto, pct: pct(missingPhoto), color: 'bg-rose-500' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded border border-slate-200 shadow-sm p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-slate-800">{card.value}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${card.color}`} style={{ width: `${card.pct}%` }} />
                  </div>
                  <p className="text-[0.6rem] text-slate-400 font-bold mt-1">{card.pct}% of total</p>
                </div>
              ))}
            </div>

            {facultyList.length > 0 && (
              <div className="bg-white rounded border border-slate-200 shadow-sm p-4">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-3">Faculty Productivity</p>
                <div className="space-y-2">
                  {facultyList.slice(0, 8).map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600 w-32 truncate shrink-0">{name}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-500 w-8 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-black text-amber-700">{Math.floor(duplicates.length / 2)} duplicate entr{Math.floor(duplicates.length / 2) === 1 ? 'y' : 'ies'} detected (same name &amp; phone)</p>
            <p className="text-[0.65rem] text-amber-600 mt-0.5">{[...new Set(duplicates.map(s => s.name))].join(', ')}</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search by name, phone, roll no…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[160px] text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 font-medium text-slate-700 placeholder:text-slate-300"
          />
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 font-medium text-slate-600 bg-white"
          >
            <option value="">All Classes</option>
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterFaculty}
            onChange={e => setFilterFaculty(e.target.value)}
            className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 font-medium text-slate-600 bg-white"
          >
            <option value="">All Faculty</option>
            {allFaculty.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {(searchQuery || filterClass || filterFaculty) && (
            <button onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterFaculty(''); }} className="text-xs font-black text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded hover:bg-slate-100 transition">Clear</button>
          )}
          <span className="ml-auto text-[0.65rem] font-black text-slate-400">{filteredStudents.length} of {students.length}</span>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          <StudentTable students={filteredStudents} loading={studentsLoading} onDelete={handleDeleteStudent} hideCollegeFilter />
        </div>
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
