'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getDeletedStudentsByCollege, restoreStudentInDb, addAuditLog } from '@/lib/actions';
import { StudentRecord } from '@/lib/types';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  FiDownload, FiRefreshCw, FiArchive,
  FiRotateCcw, FiChevronDown,
} from 'react-icons/fi';
import { formatISTDate } from '@/lib/formatDate';
import CropModal from '@/components/CropModal';

export default function FacultyDashboardPage() {
  const { user, students, deleteStudent, updateStudent, colleges, refreshStudents } = useAuth();

  const [refreshing,           setRefreshing]           = useState(false);
  const [deletedStudents,      setDeletedStudents]      = useState<StudentRecord[]>([]);
  const [showDeletedStudents,  setShowDeletedStudents]  = useState(false);
  const [searchQuery,          setSearchQuery]          = useState('');
  const [filterClass,          setFilterClass]          = useState('');
  const [editStudent,          setEditStudent]          = useState<StudentRecord | null>(null);
  const [editForm,             setEditForm]             = useState({ name: '', studentId: '', course: '', year: '', email: '', phone: '', college: '' });
  const [editPhoto,            setEditPhoto]            = useState<string | null>(null);
  const [editMsg,              setEditMsg]              = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editSaving,           setEditSaving]           = useState(false);
  const [cropSource,           setCropSource]           = useState<string | null>(null);
  const [cropTarget,           setCropTarget]           = useState<'edit'>('edit');
  const [notice,               setNotice]               = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const facultyCollege = user?.college ?? '';

  useEffect(() => {
    if (user?.college) {
      getDeletedStudentsByCollege(user.college).then(setDeletedStudents);
    }
  }, [user?.college]);

  if (!user) return null;

  const facultyStudents = user.college
    ? students.filter(s =>
        s.college === user.college &&
        (s.createdBy === user.name || s.createdBy === user.email)
      )
    : students.filter(s => s.createdBy === user.name || s.createdBy === user.email);

  const filteredStudents = [...facultyStudents]
    .filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.rollNo ?? '').toLowerCase().includes(q) || (s.studentId ?? '').toLowerCase().includes(q);
      const matchesClass  = !filterClass || s.studentClass === filterClass;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const allClasses = [...new Set(facultyStudents.map(s => s.studentClass).filter(Boolean))] as string[];

  const dupKey   = (s: StudentRecord) => `${s.name.trim().toLowerCase()}|${s.phone.trim()}`;
  const keyCounts = facultyStudents.reduce<Record<string, number>>((acc, s) => {
    const k = dupKey(s); acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {});
  const duplicates = facultyStudents.filter(s => keyCounts[dupKey(s)] > 1);

  const exportExcel = () => {
    const sorted = [...facultyStudents].sort((a, b) => a.name.localeCompare(b.name));
    const ws = XLSX.utils.json_to_sheet(sorted.map((s, i) => ({
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
    XLSX.writeFile(wb, `student-records-${new Date().toISOString().slice(0, 10)}.xlsx`);
    addAuditLog({
      userEmail: user?.email ?? '', userName: user?.name ?? '',
      action: 'export_excel', entityType: 'students',
      details: `Exported ${facultyStudents.length} records (Excel)`,
    }).catch(() => {});
  };

  const exportZip = async () => {
    const sorted = [...facultyStudents].sort((a, b) => a.name.localeCompare(b.name));
    if (sorted.length === 0) { setNotice({ message: 'No student records to export.', type: 'error' }); return; }
    setNotice({ message: 'Preparing export…', type: 'success' });
    const zip    = new JSZip();
    const photos = zip.folder('photos')!;
    const ws = XLSX.utils.json_to_sheet(sorted.map((s, i) => ({
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
    sorted.forEach((s, i) => {
      if (!s.photo) return;
      photos.file(`${i + 1}.png`, s.photo.replace(/^data:image\/\w+;base64,/, ''), { base64: true });
      photoCount++;
    });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `students-export-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click(); URL.revokeObjectURL(url);
    setNotice({ message: `Exported ${sorted.length} students · ${photoCount} photo${photoCount !== 1 ? 's' : ''}.`, type: 'success' });
    setTimeout(() => setNotice(null), 5000);
    addAuditLog({
      userEmail: user?.email ?? '', userName: user?.name ?? '',
      action: 'export_zip', entityType: 'students',
      details: `Exported ${sorted.length} records, ${photoCount} photos (ZIP)`,
    }).catch(() => {});
  };


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
      setCropTarget('edit');
      setCropSource(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    if (!editForm.name) { setEditMsg({ text: 'Student name is required.', type: 'error' }); return; }
    setEditSaving(true);
    const updated: StudentRecord = { ...editStudent, ...editForm, photo: editPhoto ?? undefined };
    await updateStudent(updated);
    setEditMsg({ text: 'Student updated successfully.', type: 'success' });
    setEditSaving(false);
    setTimeout(() => { setEditStudent(null); setEditMsg(null); }, 1200);
  };

  const processImage = (src: string) => {
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
    img.src = src;
  };

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      await refreshStudents();
    }
  };

  return (
    <div id="faculty-registry-section" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{facultyStudents.length} students in registry</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={async () => { setRefreshing(true); await refreshStudents(); setRefreshing(false); }}
            disabled={refreshing}
            title="Refresh data"
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95 disabled:opacity-60"
          >
            <FiRefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={exportZip} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded font-black text-sm hover:bg-blue-700 transition shadow-sm active:scale-95">
            <FiArchive className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">ZIP</span>
          </button>
          <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95">
            <FiDownload className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Excel</span>
          </button>

        </div>
      </div>

      {/* Stat Cards */}
      {(() => {
        const total        = facultyStudents.length;
        const withPhoto    = facultyStudents.filter(s => s.photo && s.photo.length > 0).length;
        const missingPhoto = total - withPhoto;
        const completed    = facultyStudents.filter(s => s.photo && s.photo.length > 0 && s.parentage && s.phone).length;
        const pending      = total - completed;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'My Students',   value: total,        icon: '👥', color: 'bg-blue-50 border-blue-100',       num: 'text-blue-700',    sub: 'text-blue-400' },
              { label: 'Completed',      value: completed,    icon: '✅', color: 'bg-emerald-50 border-emerald-100', num: 'text-emerald-700', sub: 'text-emerald-400' },
              { label: 'Pending',        value: pending,      icon: '⏳', color: 'bg-amber-50 border-amber-100',     num: 'text-amber-700',   sub: 'text-amber-400' },
              { label: 'Missing Photos', value: missingPhoto, icon: '📷', color: 'bg-rose-50 border-rose-100',       num: 'text-rose-700',    sub: 'text-rose-400' },
            ].map(({ label, value, icon, color, num, sub }) => (
              <div key={label} className={`rounded-lg border p-4 ${color}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-[0.65rem] font-black uppercase tracking-widest ${sub}`}>{label}</p>
                    <p className={`text-3xl font-black mt-1 ${num}`}>{value}</p>
                    {total > 0 && <p className={`text-[0.65rem] font-bold mt-1 ${sub}`}>{Math.round(value / total * 100)}%</p>}
                  </div>
                  <span className="text-xl">{icon}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-black text-amber-700">{duplicates.length / 2 | 0} duplicate entr{duplicates.length / 2 === 1 ? 'y' : 'ies'} detected (same name &amp; phone)</p>
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
            className="flex-1 min-w-[160px] text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium text-slate-700 placeholder:text-slate-300"
          />
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium text-slate-600 bg-white"
          >
            <option value="">All Classes</option>
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(searchQuery || filterClass) && (
            <button onClick={() => { setSearchQuery(''); setFilterClass(''); }} className="text-xs font-black text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded hover:bg-slate-100 transition">Clear</button>
          )}
          <span className="ml-auto text-[0.65rem] font-black text-slate-400">{filteredStudents.length} of {facultyStudents.length}</span>
        </div>
        <div className="p-3 sm:p-4 lg:p-6 overflow-x-auto">
          <StudentTable students={filteredStudents} onDelete={deleteStudent} onEdit={openEditModal} colleges={colleges} hideCollegeFilter />
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
                <span className="text-lg">✕</span>
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
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Photo <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span>
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center">
                    {editPhoto
                      ? <img src={editPhoto} alt="Photo" className="w-full h-full object-cover" />
                      : <span className="text-2xl text-slate-300">📷</span>}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="relative">
                      <input type="file" accept="image/*" onChange={e => handleEditPhotoFile(e.target.files?.[0] ?? null)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                      <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm">
                        Upload New Photo
                      </button>
                    </div>
                    {editPhoto && (
                      <button type="button" onClick={() => setEditPhoto(null)} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition text-left">
                        Remove
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
              <button onClick={handleSaveEdit} disabled={editSaving} className="flex items-center gap-2 bg-blue-600 text-white font-black px-5 py-2.5 rounded hover:bg-blue-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditStudent(null)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropSource && (
        <CropModal
          src={cropSource}
          onConfirm={(cropped: string) => {
            setCropSource(null);
            setEditPhoto(cropped);
          }}
          onCancel={() => {
            processImage(cropSource);
            setCropSource(null);
          }}
        />
      )}

      {/* Toast */}
      {notice && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${notice.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'}`}>
          <span className="truncate">{notice.message}</span>
        </div>
      )}
    </div>
  );
}
