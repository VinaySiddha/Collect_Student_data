'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDeletedStudentsByCollege, restoreStudentInDb } from '@/lib/actions';
import { StudentRecord } from '@/lib/types';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import {
  FiUserPlus, FiUpload, FiDownload, FiUsers, FiLogOut,
  FiLayout, FiMenu, FiX, FiRotateCcw, FiChevronDown,
  FiCamera, FiArchive, FiSave, FiRefreshCw,
} from 'react-icons/fi';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';

type View = 'dashboard' | 'register';

const EMPTY_FORM = {
  college: '', name: '', parentage: '', studentId: '', rollNo: '',
  studentClass: '', course: '', year: '', email: '', phone: '',
  busStop: '', bloodGroup: '',
};

export default function FacultyPage() {
  const router = useRouter();
  const { user, initialized, logout, students, addStudent, importStudents, deleteStudent, updateStudent, colleges, refreshStudents } = useAuth();

  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [activeView, setActiveView]     = useState<View>('dashboard');
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [notice, setNotice]             = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [deletedStudents, setDeletedStudents] = useState<StudentRecord[]>([]);
  const [showDeletedStudents, setShowDeletedStudents] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [confirmStudent, setConfirmStudent] = useState<StudentRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', studentId: '', course: '', year: '', email: '', phone: '', college: '' });
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Camera
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.push('/login'); return; }
    const college = user.college || colleges[0] || '';
    setForm(prev => ({ ...prev, college }));
  }, [user, initialized, router, colleges]);

  // Seed registration counter from current student count
  const facultyCollege = user?.college ?? '';
  useEffect(() => {
    const count = students.filter(s => s.college === facultyCollege).length;
    setSubmissionCount(count);
  }, [students, facultyCollege]);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  useEffect(() => {
    if (activeView === 'dashboard' && user?.college) {
      getDeletedStudentsByCollege(user.college).then(setDeletedStudents);
    }
  }, [activeView, user?.college]);

  // ── Photo helpers ─────────────────────────────────────────────────────────────
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
      setPhotoPreview(canvas.toDataURL('image/png'));
    };
    img.src = src;
  };

  const handlePhotoFile = (file: File | null) => {
    if (!file) { setPhotoPreview(null); return; }
    const reader = new FileReader();
    reader.onload = e => processImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Camera ────────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = s;
      setCameraOpen(true);
    } catch {
      setNotice({ message: 'Camera access denied or unavailable.', type: 'error' });
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const vw = video.videoWidth; const vh = video.videoHeight;
    const size = Math.min(vw, vh);
    ctx.drawImage(video, (vw - size) / 2, (vh - size) / 2, size, size, 0, 0, 400, 400);
    setPhotoPreview(canvas.toDataURL('image/png'));
    stopCamera();
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  // ── Form submit ───────────────────────────────────────────────────────────────
  const createStudent = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim())      { setNotice({ message: 'Student Name is required.', type: 'error' }); return; }
    if (!form.parentage.trim()) { setNotice({ message: 'Parentage is required.', type: 'error' }); return; }
    if (!form.phone.trim())     { setNotice({ message: 'Contact Number is required.', type: 'error' }); return; }

    setConfirmStudent({
      id:           `${Date.now()}`,
      college:      form.college,
      name:         form.name,
      parentage:    form.parentage    || undefined,
      studentId:    form.studentId    || undefined,
      rollNo:       form.rollNo       || undefined,
      studentClass: form.studentClass || undefined,
      course:       form.course       || undefined,
      year:         form.year         || undefined,
      email:        form.email        || undefined,
      phone:        form.phone,
      busStop:      form.busStop      || undefined,
      bloodGroup:   form.bloodGroup   || undefined,
      photo:        photoPreview      || undefined,
      createdBy:    user?.name || user?.email || 'Unknown',
      createdAt:    new Date().toISOString(),
    });
  };

  const confirmAndSubmit = async () => {
    if (!confirmStudent) return;
    setSubmitting(true);
    try {
      await addStudent(confirmStudent);
      // submissionCount is kept in sync via the useEffect above — no manual increment needed
      setConfirmStudent(null);
      setForm(prev => ({ ...EMPTY_FORM, college: prev.college }));
      setPhotoPreview(null);
      setUploadFile(null);
      setNotice({ message: 'Student registered successfully.', type: 'success' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setConfirmStudent(null);
      setNotice({ message: 'Failed to save student record. Please try again.', type: 'error' });
    }
    setSubmitting(false);
  };

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      await refreshStudents();
    }
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
    if (!editForm.name) {
      setEditMsg({ text: 'Student name is required.', type: 'error' });
      return;
    }
    setEditSaving(true);
    const updated: StudentRecord = { ...editStudent, ...editForm, photo: editPhoto ?? undefined };
    await updateStudent(updated);
    setEditMsg({ text: 'Student updated successfully.', type: 'success' });
    setEditSaving(false);
    setTimeout(() => { setEditStudent(null); setEditMsg(null); }, 1200);
  };

  // ── Excel import ──────────────────────────────────────────────────────────────
  const handleExcelUpload = async () => {
    if (!excelFile) { setNotice({ message: 'Select an Excel file first.', type: 'error' }); return; }
    setImportLoading(true);
    try {
      const data = await excelFile.arrayBuffer();
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      const [headers, ...values] = rows;
      if (!headers || !Array.isArray(headers)) {
        setNotice({ message: 'Excel file appears empty or invalid.', type: 'error' });
        setImportLoading(false); return;
      }
      const norm = headers.map(h => String(h ?? '').trim().toLowerCase());
      const dataRows = values.filter(r => Array.isArray(r) && r.some(v => String(v ?? '').trim()));
      if (dataRows.length === 0) {
        setNotice({ message: 'No data rows found in the file.', type: 'error' });
        setImportLoading(false); return;
      }
      const records = dataRows.map(row => {
        const e = Array.isArray(row)
          ? row.reduce<Record<string, string>>((acc, v, i) => { acc[norm[i] ?? ''] = String(v ?? '').trim(); return acc; }, {})
          : {};
        return {
          id:           `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          college:      user?.college || '',
          name:         e.name        || 'Unnamed Student',
          parentage:    e.parentage   || undefined,
          studentId:    e['student id']  || e.studentid   || undefined,
          rollNo:       e['roll no.']    || e['roll no']   || e.rollno   || undefined,
          studentClass: e.class          || undefined,
          course:       e.course         || undefined,
          year:         e.year           || undefined,
          email:        e.email          || undefined,
          phone:        e.phone          || '',
          busStop:      e['bus stop']    || undefined,
          bloodGroup:   e['blood group'] || undefined,
          createdBy:    user?.name || user?.email || 'Imported',
          createdAt:    new Date().toISOString(),
        } as StudentRecord;
      });
      await importStudents(records);
      setExcelFile(null);
      setBulkImportOpen(false);
      setNotice({ message: `${records.length} records imported successfully.`, type: 'success' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({ message: 'Failed to parse Excel file. Make sure it is a valid .xlsx file.', type: 'error' });
    }
    setImportLoading(false);
  };

  // ── Exports ───────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(facultyStudents.map((s, i) => ({
      '#':           i + 1,
      'Photo':       s.photo ? `${i + 1}.png` : '',
      Name:          s.name,
      Parentage:     s.parentage    || '',
      'Student ID':  s.studentId    || '',
      'Roll No.':    s.rollNo       || '',
      Class:         s.studentClass || '',
      College:       s.college,
      Course:        s.course       || '',
      Year:          s.year         || '',
      Email:         s.email        || '',
      Phone:         s.phone,
      'Bus Stop':    s.busStop      || '',
      'Blood Group': s.bloodGroup   || '',
      'Added By':    s.createdBy    || 'Unknown',
      'Created At':  new Date(s.createdAt).toLocaleDateString(),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `student-records-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const rows = [
      { Name: 'Rahul Sharma', Parentage: 'S/O Ramesh Sharma', 'Student ID': 'STU-001', 'Roll No.': '101', Class: 'B.Tech 2nd Year', Course: 'Computer Science', Year: '2024–25', Email: 'rahul@college.edu', Phone: '+91 98765 43210', 'Bus Stop': 'Main Bus Stand', 'Blood Group': 'O+' },
      { Name: 'Priya Verma',  Parentage: 'D/O Suresh Verma',  'Student ID': 'STU-002', 'Roll No.': '102', Class: 'B.Tech 2nd Year', Course: 'Electronics',       Year: '2024–25', Email: 'priya@college.edu', Phone: '+91 91234 56789', 'Bus Stop': 'City Square',    'Blood Group': 'A+' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const cols = Object.keys(rows[0]);
    ws['!cols'] = cols.map(k => ({ wch: Math.max(k.length, ...rows.map(r => String(r[k as keyof typeof r] ?? '').length)) + 2 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student-import-template.xlsx');
  };

  const exportZip = async () => {
    const sorted = [...facultyStudents].sort((a, b) => a.name.localeCompare(b.name));

    if (sorted.length === 0) {
      setNotice({ message: 'No student records to export.', type: 'error' }); return;
    }
    setNotice({ message: 'Preparing export…', type: 'success' });

    const zip    = new JSZip();
    const photos = zip.folder('photos')!;

    const ws = XLSX.utils.json_to_sheet(sorted.map((s, i) => ({
      '#':           i + 1,
      'Photo':       s.photo ? `${i + 1}.png` : '',
      Name:          s.name,
      Parentage:     s.parentage    || '',
      'Student ID':  s.studentId    || '',
      'Roll No.':    s.rollNo       || '',
      Class:         s.studentClass || '',
      College:       s.college,
      Course:        s.course       || '',
      Year:          s.year         || '',
      Email:         s.email        || '',
      Phone:         s.phone,
      'Bus Stop':    s.busStop      || '',
      'Blood Group': s.bloodGroup   || '',
      'Added By':    s.createdBy    || 'Unknown',
      'Created At':  new Date(s.createdAt).toLocaleDateString(),
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
    a.href = url;
    a.download = `students-export-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ message: `Exported ${sorted.length} students · ${photoCount} photo${photoCount !== 1 ? 's' : ''} in photos/ folder.`, type: 'success' });
    setTimeout(() => setNotice(null), 5000);
  };

  const exportPDF = async () => {
    const el = document.getElementById('faculty-registry-section');
    if (!el) return;
    setNotice({ message: 'Generating PDF…', type: 'success' });
    const canvas  = await html2canvas(el, { scale: 2, backgroundColor: '#fcfdfe' });
    const imgData = canvas.toDataURL('image/png');
    const pdf     = new jsPDF('portrait', 'px', 'a4');
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
    ? students.filter(s => s.college === user.college)
    : students;

  if (!initialized || !user) return null;

  const initials = (user.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();

  const Label = ({ text, optional }: { text: string; optional?: boolean }) => (
    <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">
      {text}
      {optional && <span className="ml-1 normal-case tracking-normal font-medium text-slate-300">(optional)</span>}
    </span>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-blue-950 flex flex-col overflow-hidden transition-all duration-300 w-64 lg:sticky lg:top-0 lg:shrink-0 lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        <div className="border-b border-white/10 px-3 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Portal</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white transition lg:hidden shrink-0">
            <FiX className="w-4 h-4" />
          </button>

          {collapsed ? (
            <button onClick={() => setCollapsed(false)} title="Expand sidebar" className="hidden lg:flex w-8 h-8 bg-blue-500 rounded items-center justify-center mx-auto group transition">
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
              <button onClick={() => setCollapsed(true)} title="Collapse sidebar" className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition shrink-0">
                <GoSidebarExpand className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {[
            { view: 'dashboard' as const, icon: <FiLayout className="w-4 h-4 shrink-0" />,  label: 'Dashboard' },
            { view: 'register'  as const, icon: <FiUserPlus className="w-4 h-4 shrink-0" />, label: 'Register' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${activeView === view ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              {icon}
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2 space-y-1">
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`} title={collapsed ? (user?.name || 'User') : undefined}>
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{initials}</span>
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-black truncate leading-none">{user?.name || 'User'}</p>
              <p className="text-white/40 text-[0.6rem] truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} title={collapsed ? 'Logout' : undefined} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            <FiLogOut className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 lg:hidden bg-blue-950 px-4 py-3 flex items-center gap-3 shadow-lg">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-white/70 hover:text-white transition">
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">G</span>
            </div>
            <p className="text-white font-black text-sm truncate">Gographic</p>
          </div>
          <span className="text-white/40 text-[0.6rem] font-black uppercase tracking-widest shrink-0 capitalize">
            {activeView}
          </span>
        </div>

        <main className="flex-1 min-w-0 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">

          {/* ── Dashboard ── */}
          {activeView === 'dashboard' && (
            <div id="faculty-registry-section" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{facultyStudents.length} students in registry</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => { setRefreshing(true); await refreshStudents(); setRefreshing(false); }}
                    disabled={refreshing}
                    title="Refresh data"
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95 disabled:opacity-60"
                  >
                    <FiRefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button onClick={exportZip} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white rounded font-black text-sm hover:bg-blue-700 transition shadow-sm active:scale-95">
                    <FiArchive className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Export ZIP</span>
                    <span className="sm:hidden">ZIP</span>
                  </button>
                  <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95">
                    <FiDownload className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                  <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95">
                    <FiUsers className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
                <StudentTable students={[...facultyStudents].sort((a, b) => a.name.localeCompare(b.name))} onDelete={deleteStudent} onEdit={openEditModal} colleges={colleges} />
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
            </div>
          )}

          {/* ── Register ── */}
          {activeView === 'register' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">Register Students</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Add new students manually or import via Excel</p>
                </div>
                <button
                  onClick={() => setBulkImportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-black text-sm rounded hover:bg-blue-700 transition shadow-sm active:scale-95 shrink-0"
                >
                  <FiUpload className="w-4 h-4" /> Bulk Import
                </button>
              </div>

                {/* ── Manual form ── */}
                <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">

                  <div className="flex items-start gap-3 mb-6">
                    <div className="bg-blue-600 p-2.5 rounded text-white shrink-0">
                      <FiUserPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-black text-slate-900">Manual Registration</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Fields marked * are required</p>
                    </div>
                    <div className="shrink-0 text-right bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-[0.55rem] font-black uppercase tracking-widest text-blue-500">Total Students</p>
                      <p className="text-xl font-black text-blue-700 leading-none">{submissionCount}</p>
                    </div>
                  </div>

                  <form onSubmit={createStudent} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">

                      {/* Institution — read-only */}
                      <label className="block sm:col-span-2">
                        <Label text="Institution" />
                        <input value={form.college} readOnly className="input-field bg-slate-50 text-slate-500 cursor-not-allowed text-sm" />
                      </label>

                      {/* Student Name — mandatory */}
                      <label className="block sm:col-span-2">
                        <Label text="Student Name *" />
                        <input
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Full legal name"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Parentage — mandatory */}
                      <label className="block sm:col-span-2">
                        <Label text="Parentage *" />
                        <input
                          value={form.parentage}
                          onChange={e => setForm(f => ({ ...f, parentage: e.target.value }))}
                          placeholder="e.g. S/O Ramesh Kumar"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Contact — mandatory */}
                      <label className="block">
                        <Label text="Contact Number *" />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="+91 00000 00000"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Roll No — optional */}
                      <label className="block">
                        <Label text="Roll No." optional />
                        <input
                          value={form.rollNo}
                          onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))}
                          placeholder="e.g. 42"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Registration ID — optional */}
                      <label className="block">
                        <Label text="Registration ID" optional />
                        <input
                          value={form.studentId}
                          onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                          placeholder="e.g. STU-001"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Class — optional */}
                      <label className="block">
                        <Label text="Class" optional />
                        <input
                          value={form.studentClass}
                          onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))}
                          placeholder="e.g. 10th / B.Tech 3rd"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Course — optional */}
                      <label className="block">
                        <Label text="Course" optional />
                        <input
                          value={form.course}
                          onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                          placeholder="e.g. Computer Science"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Academic Year — optional */}
                      <label className="block">
                        <Label text="Academic Year" optional />
                        <input
                          value={form.year}
                          onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                          placeholder="e.g. 2024–25"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Blood Group — optional */}
                      <label className="block">
                        <Label text="Blood Group" optional />
                        <input
                          value={form.bloodGroup}
                          onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}
                          placeholder="e.g. O+"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Email — optional */}
                      <label className="block">
                        <Label text="Email ID" optional />
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="student@email.com"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* Bus Stop — optional */}
                      <label className="block">
                        <Label text="Bus Stop" optional />
                        <input
                          value={form.busStop}
                          onChange={e => setForm(f => ({ ...f, busStop: e.target.value }))}
                          placeholder="e.g. Main Bus Stand"
                          className="input-field text-sm"
                        />
                      </label>

                      {/* ── Student Photograph ── */}
                      <div className="sm:col-span-2">
                        <Label text="Student Photograph" optional />

                        <div className="flex gap-2 mb-3">
                          <div className="relative flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => { const f = e.target.files?.[0] ?? null; setUploadFile(f); handlePhotoFile(f); }}
                              className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                            />
                            <button
                              type="button"
                              className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm"
                            >
                              <FiUpload className="w-4 h-4" /> Upload
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex-1 flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition text-sm"
                          >
                            <FiCamera className="w-4 h-4" /> Capture
                          </button>
                        </div>

                        {photoPreview ? (
                          <div className="flex items-center gap-3 p-3 rounded border border-slate-200 bg-slate-50">
                            <img src={photoPreview} alt="Preview" className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700">Photo ready</p>
                              <p className="text-xs text-slate-400">Will be saved as PNG</p>
                            </div>
                            <button type="button" onClick={() => { setPhotoPreview(null); setUploadFile(null); }} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-3 rounded border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                            <FiCamera className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-medium">No photo selected — Upload a file or use Capture</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white font-black py-3.5 rounded hover:bg-blue-700 transition shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                      <FiUserPlus className="w-4 h-4" /> Review &amp; Register
                    </button>
                  </form>
                </div>

            </div>
          )}
        </main>
      </div>

      {/* ── Bulk Import Modal ── */}
      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={importLoading ? undefined : () => { setBulkImportOpen(false); setExcelFile(null); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">Bulk Import</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Upload an Excel file to import multiple students at once</p>
              </div>
              <button onClick={() => { setBulkImportOpen(false); setExcelFile(null); }} disabled={importLoading} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-30 disabled:pointer-events-none">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-black py-2.5 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm">
                <FiDownload className="w-4 h-4" /> Download Excel Template
              </button>
              <div className="relative group">
                <input type="file" accept=".xlsx,.xls" onChange={e => setExcelFile(e.target.files?.[0] ?? null)} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" />
                <div className="p-8 rounded border-2 border-dashed border-slate-200 group-hover:border-blue-500 transition bg-slate-50/50 text-center space-y-2">
                  <FiUpload className="w-6 h-6 mx-auto text-slate-300 group-hover:text-blue-500 transition" />
                  <p className="text-sm font-bold text-slate-500">{excelFile ? excelFile.name : 'Drop Excel File Here'}</p>
                  <p className="text-xs text-slate-400">Click to browse · .xlsx or .xls</p>
                </div>
              </div>
              <button
                onClick={handleExcelUpload}
                disabled={importLoading || !excelFile}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-3 rounded hover:bg-blue-700 transition shadow-sm text-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importLoading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" /> Importing…</>
                  : <><FiUpload className="w-4 h-4" /> Process All Records</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Registration Modal ── */}
      {confirmStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl">
              <div>
                <h2 className="text-base font-black text-slate-900">Confirm Registration</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Review details before saving</p>
              </div>
              <button onClick={() => setConfirmStudent(null)} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-30 disabled:pointer-events-none">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Photo + name hero */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-16 h-16 rounded-lg border-2 border-blue-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {confirmStudent.photo
                    ? <img src={confirmStudent.photo} alt="Photo" className="w-full h-full object-cover" />
                    : <FiCamera className="w-6 h-6 text-slate-300" />}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-base leading-tight truncate">{confirmStudent.name}</p>
                  {confirmStudent.parentage && <p className="text-xs text-slate-500 font-medium mt-0.5">{confirmStudent.parentage}</p>}
                  <p className="text-xs text-blue-600 font-bold mt-1">{confirmStudent.college}</p>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Phone',        value: confirmStudent.phone },
                  { label: 'Roll No.',     value: confirmStudent.rollNo },
                  { label: 'Student ID',   value: confirmStudent.studentId },
                  { label: 'Class',        value: confirmStudent.studentClass },
                  { label: 'Course',       value: confirmStudent.course },
                  { label: 'Year',         value: confirmStudent.year },
                  { label: 'Email',        value: confirmStudent.email },
                  { label: 'Bus Stop',     value: confirmStudent.busStop },
                  { label: 'Blood Group',  value: confirmStudent.bloodGroup },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {!confirmStudent.photo && (
                <p className="text-xs text-slate-400 font-medium text-center">No photo attached — student will be registered without a photo.</p>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
              <button
                onClick={confirmAndSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-3 rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60"
              >
                {submitting
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Registering…</>
                  : <><FiUserPlus className="w-4 h-4" /> Confirm Registration</>}
              </button>
              <button
                onClick={() => setConfirmStudent(null)}
                disabled={submitting}
                className="px-5 py-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Student Modal ── */}
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
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Student name' },
                { label: 'Student ID', key: 'studentId', type: 'text', placeholder: 'e.g. STU001' },
                { label: 'Course', key: 'course', type: 'text', placeholder: 'e.g. B.Tech CSE' },
                { label: 'Year', key: 'year', type: 'text', placeholder: 'e.g. 3' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'student@email.com' },
                { label: 'Phone', key: 'phone', type: 'text', placeholder: '10-digit number' },
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
                      : <FiCamera className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleEditPhotoFile(e.target.files?.[0] ?? null)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm">
                        <FiUpload className="w-3.5 h-3.5" /> Upload New Photo
                      </button>
                    </div>
                    {editPhoto && (
                      <button type="button" onClick={() => setEditPhoto(null)} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition text-left">
                        Remove photo
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
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 bg-blue-600 text-white font-black px-5 py-2.5 rounded hover:bg-blue-700 transition shadow-sm active:scale-95 text-sm disabled:opacity-60"
              >
                <FiSave className="w-3.5 h-3.5" />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditStudent(null)} className="px-5 py-2.5 rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Camera modal ── */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Capture Photo</h3>
              <button onClick={stopCamera} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover bg-black" />
            <div className="p-4">
              <button
                type="button"
                onClick={captureFromCamera}
                className="w-full bg-blue-600 text-white font-black py-3 rounded-lg hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <FiCamera className="w-4 h-4" /> Take Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-blue-950 border-t border-white/10 flex">
        {([
          { view: 'dashboard' as const, icon: <FiLayout className="w-5 h-5" />,  label: 'Dashboard' },
          { view: 'register'  as const, icon: <FiUserPlus className="w-5 h-5" />, label: 'Register' },
        ] as const).map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-4 text-[0.55rem] font-black uppercase tracking-widest transition-colors ${activeView === view ? 'text-white' : 'text-white/35 hover:text-white/70'}`}
          >
            <span className={`transition-transform ${activeView === view ? 'scale-110' : ''}`}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Toast */}
      {notice && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${notice.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'}`}>
          <span className="shrink-0">{notice.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="truncate">{notice.message}</span>
        </div>
      )}
    </div>
  );
}
