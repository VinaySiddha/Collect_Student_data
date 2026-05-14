'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import StudentTable from '@/components/StudentTable';
import * as XLSX from 'xlsx';
import {
  registerUser,
  getUsersByCollege,
  getStudentsByCollege,
  addStudentToDb,
  deleteStudentFromDb,
  deleteUser,
  getDeletedStudentsByCollege,
  restoreStudentInDb,
  getDeletedUsersByCollege,
  restoreUserInDb,
  addAuditLog,
  saveDraftToDb,
  getDraftsByUser,
  deleteDraftFromDb,
} from '@/lib/actions';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DbUser, StudentRecord, DraftRecord } from '@/lib/types';
import {
  FiLayout, FiUsers, FiLogOut, FiPlus, FiTrash2, FiUser, FiMail,
  FiLock, FiMenu, FiX, FiDownload, FiChevronDown, FiShield,
  FiUserPlus, FiUpload, FiRotateCcw, FiCamera, FiArchive, FiRefreshCw,
  FiSave, FiCrop, FiInbox,
} from 'react-icons/fi';
import CropModal from '@/components/CropModal';
import { hashPasswordClient } from '@/lib/clientHash';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';
import { MdFlipCameraAndroid } from 'react-icons/md';
import { formatISTDate, formatISTDateTime } from '@/lib/formatDate';
import TableSkeleton from '@/components/TableSkeleton';
import ConfirmDialog from '@/components/ConfirmDialog';

type View = 'dashboard' | 'faculty' | 'register';

export default function FacultyAdminPage() {
  const router = useRouter();
  const { user, initialized, logout, colleges } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>('dashboard');

  // College-scoped students
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmStudent, setConfirmStudent] = useState<StudentRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [navGuard, setNavGuard]       = useState<View | null>(null);
  const [draftDeleteId, setDraftDeleteId] = useState<string | null>(null);

  const hasUnsavedRegister = () =>
    activeView === 'register' && (
      form.name.trim() !== '' || form.phone.trim() !== '' ||
      form.parentage.trim() !== '' || !!photoPreview
    );

  const navigateTo = (view: View) => {
    if (view !== 'register' && hasUnsavedRegister()) {
      setNavGuard(view);
    } else {
      setActiveView(view);
    }
  };
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Faculty management
  const [facultyUsers, setFacultyUsers] = useState<DbUser[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', password: '' });
  const [facultyMsg, setFacultyMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Register view state
  const EMPTY_FORM = { name: '', parentage: '', studentId: '', rollNo: '', studentClass: '', course: '', year: '', email: '', phone: '', busStop: '', bloodGroup: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);

  // Camera
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const facingModeRef = useRef<'user' | 'environment'>('user');

  // Crop
  const [cropSource, setCropSource] = useState<string | null>(null);

  // Draft
  const [dbDrafts, setDbDrafts] = useState<DraftRecord[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  // Bulk import photos
  const [bulkPhotoMap, setBulkPhotoMap] = useState<Map<string, string>>(new Map());

  // Deleted students
  const [deletedStudents, setDeletedStudents] = useState<StudentRecord[]>([]);
  const [showDeletedStudents, setShowDeletedStudents] = useState(false);

  // Deleted faculty
  const [deletedFaculty, setDeletedFaculty] = useState<DbUser[]>([]);
  const [showDeletedFaculty, setShowDeletedFaculty] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'faculty_admin') { router.push('/faculty'); return; }
    // Load DB drafts
    const userKey = user.email || user.name || '';
    if (userKey) getDraftsByUser(userKey).then(setDbDrafts);
  }, [user, initialized, router]);

  // ── Inactivity logout (15 min) ────────────────────────────────────────────────
  const { warningVisible, secondsLeft, stayLoggedIn } = useInactivityLogout(logout);

  // Load college's students — also seed the registration counter from existing count
  useEffect(() => {
    if (!user?.college) return;
    setStudentsLoading(true);
    getStudentsByCollege(user.college).then(data => {
      setStudents(data);
      setSubmissionCount(data.length);
      setStudentsLoading(false);
    });
  }, [user?.college]);

  // Load faculty (active + deleted) when faculty view is active
  useEffect(() => {
    if (activeView === 'faculty' && user?.college) {
      setFacultyLoading(true);
      Promise.all([
        getUsersByCollege(user.college),
        getDeletedUsersByCollege(user.college),
      ]).then(([active, deleted]) => {
        setFacultyUsers(active);
        setDeletedFaculty(deleted);
        setFacultyLoading(false);
      });
    }
  }, [activeView, user?.college]);

  const handleRestoreFaculty = async (id: number) => {
    const result = await restoreUserInDb(id);
    if (result.success) {
      const restored = deletedFaculty.find(u => u.id === id);
      setDeletedFaculty(prev => prev.filter(u => u.id !== id));
      if (restored) setFacultyUsers(prev => [restored, ...prev]);
    }
  };

  // Load deleted students when on dashboard
  useEffect(() => {
    if (activeView === 'dashboard' && user?.college) {
      getDeletedStudentsByCollege(user.college).then(setDeletedStudents);
    }
  }, [activeView, user?.college]);

  const handleRestoreStudent = async (id: string) => {
    const result = await restoreStudentInDb(id);
    if (result.success) {
      const restored = deletedStudents.find(s => s.id === id);
      setDeletedStudents(prev => prev.filter(s => s.id !== id));
      if (restored) setStudents(prev => [restored, ...prev]);
    }
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

  const handleCreateFaculty = async () => {
    if (!facultyForm.name || !facultyForm.email || !facultyForm.password) {
      setFacultyMsg({ text: 'Name, email and password are required.', type: 'error' });
      return;
    }
    if (!user?.college) {
      setFacultyMsg({ text: 'No college associated with your account.', type: 'error' });
      return;
    }
    const passwordHash = await hashPasswordClient(facultyForm.email, facultyForm.password);
    const result = await registerUser(facultyForm.name, facultyForm.email, passwordHash, 'faculty', user.college);
    setFacultyMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setFacultyForm({ name: '', email: '', password: '' });
      getUsersByCollege(user.college).then(setFacultyUsers);
      setTimeout(() => setFacultyMsg(null), 3000);
    }
  };

  const handleDeleteFaculty = (id: number) => {
    setConfirmDialog({
      title: 'Remove Faculty',
      message: 'This faculty member will be soft-deleted and lose access immediately.',
      onConfirm: async () => {
        const deletedBy = user?.name || user?.email;
        const result = await deleteUser(id, deletedBy);
        if (result.success) {
          const removed = facultyUsers.find(u => u.id === id);
          setFacultyUsers(prev => prev.filter(u => u.id !== id));
          if (removed) setDeletedFaculty(prev => [{ ...removed, deletedBy: deletedBy || null }, ...prev]);
        }
        setConfirmDialog(null);
      },
    });
  };

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedStudents.map((s, i) => ({
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
    if (sortedStudents.length === 0) {
      showToast('No student records to export.', 'error'); return;
    }
    showToast('Preparing export…', 'success');

    const zip    = new JSZip();
    const photos = zip.folder('photos')!;

    const ws = XLSX.utils.json_to_sheet(sortedStudents.map((s, i) => ({
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

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Camera sync
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

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
    reader.onload = e => setCropSource(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingModeRef.current) => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 640 } } });
      streamRef.current = s;
      facingModeRef.current = mode;
      setFacingMode(mode);
      setCameraOpen(true);
    } catch {
      setNotice({ message: 'Camera access denied or unavailable.', type: 'error' });
    }
  };

  const flipCamera = () => startCamera(facingModeRef.current === 'user' ? 'environment' : 'user');

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    stopCamera();
    setCropSource(canvas.toDataURL('image/png'));
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const handleBulkPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) { setBulkPhotoMap(new Map()); return; }
    const map = new Map<string, string>();
    let pending = files.length;
    Array.from(files).forEach(file => {
      const stem = file.name.replace(/\.[^.]+$/, '').toLowerCase().trim();
      const reader = new FileReader();
      reader.onload = e => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 400;
          let { width, height } = img;
          if (width > height) { if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; } }
          else                { if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          map.set(stem, canvas.toDataURL('image/png'));
          pending--;
          if (pending === 0) setBulkPhotoMap(new Map(map));
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  const saveToDb = async () => {
    const userKey = user?.email || user?.name || '';
    if (!userKey) return;
    setDraftSaving(true);
    const id = activeDraftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draft: DraftRecord = {
      id, college: user?.college ?? '',
      name: form.name, phone: form.phone,
      parentage: form.parentage || undefined,
      studentId: form.studentId || undefined,
      rollNo: form.rollNo || undefined,
      studentClass: form.studentClass || undefined,
      course: form.course || undefined,
      year: form.year || undefined,
      email: form.email || undefined,
      busStop: form.busStop || undefined,
      bloodGroup: form.bloodGroup || undefined,
      photo: photoPreview || undefined,
      savedBy: userKey,
      updatedAt: new Date().toISOString(),
    };
    const result = await saveDraftToDb(draft);
    if (result.success) {
      setActiveDraftId(id);
      setDbDrafts(prev => [{ ...draft }, ...prev.filter(d => d.id !== id)]);
      showToast('Draft saved.', 'success');
    } else {
      showToast('Failed to save draft.', 'error');
    }
    setDraftSaving(false);
  };

  const loadDbDraft = (draft: DraftRecord) => {
    setForm({
      name: draft.name ?? '', parentage: draft.parentage ?? '',
      studentId: draft.studentId ?? '', rollNo: draft.rollNo ?? '',
      studentClass: draft.studentClass ?? '', course: draft.course ?? '',
      year: draft.year ?? '', email: draft.email ?? '',
      phone: draft.phone ?? '', busStop: draft.busStop ?? '',
      bloodGroup: draft.bloodGroup ?? '',
    });
    setPhotoPreview(draft.photo ?? null);
    setActiveDraftId(draft.id);
    setShowDrafts(false);
    showToast('Draft loaded.', 'success');
  };

  const deleteDbDraft = async (id: string) => {
    await deleteDraftFromDb(id);
    setDbDrafts(prev => prev.filter(d => d.id !== id));
    if (activeDraftId === id) setActiveDraftId(null);
  };

  const clearDraft = (draftId?: string | null) => {
    const id = draftId ?? activeDraftId;
    if (id) deleteDraftFromDb(id).then(() => {
      setDbDrafts(prev => prev.filter(d => d.id !== id));
      setActiveDraftId(null);
    });
  };

  const createStudent = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.college) { setNotice({ message: 'No college associated with your account.', type: 'error' }); return; }
    if (!form.name.trim())      { setNotice({ message: 'Student Name is required.', type: 'error' }); return; }
    if (!form.parentage.trim()) { setNotice({ message: 'Parentage is required.', type: 'error' }); return; }
    if (!form.phone.trim())     { setNotice({ message: 'Contact Number is required.', type: 'error' }); return; }

    setConfirmStudent({
      id:           `${Date.now()}`,
      college:      user.college,
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
      const result = await addStudentToDb(confirmStudent);
      if (result.success) {
        setStudents(prev => {
          const updated = [confirmStudent, ...prev];
          setSubmissionCount(updated.length);
          return updated;
        });
        setConfirmStudent(null);
        setForm(EMPTY_FORM);
        setPhotoPreview(null);
        setUploadFile(null);
        clearDraft(activeDraftId);
        showToast('Student registered successfully.', 'success');
        addAuditLog({
          userEmail: user?.email ?? '', userName: user?.name ?? '',
          action: 'add_student', entityType: 'student', entityId: confirmStudent.id,
          details: `Registered: ${confirmStudent.name} (${confirmStudent.college})`,
        }).catch(() => {});
      } else {
        setConfirmStudent(null);
        showToast('Failed to save student record.', 'error');
      }
    } catch {
      setConfirmStudent(null);
      showToast('Failed to save student record. Please try again.', 'error');
    }
    setSubmitting(false);
  };

  const handleExcelUpload = async () => {
    if (!excelFile) { showToast('Select an Excel file first.', 'error'); return; }
    setImportLoading(true);
    try {
      const data = await excelFile.arrayBuffer();
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      const [headers, ...values] = rows;
      if (!headers || !Array.isArray(headers)) {
        showToast('Excel file appears empty or invalid.', 'error');
        setImportLoading(false); return;
      }
      // Normalise header names — handles both template format and exported format
      const norm = headers.map(h => String(h ?? '').trim().toLowerCase());
      // Skip rows that are completely empty
      const dataRows = values.filter(r => Array.isArray(r) && r.some(v => String(v ?? '').trim()));
      if (dataRows.length === 0) {
        showToast('No data rows found in the file.', 'error');
        setImportLoading(false); return;
      }
      const records: StudentRecord[] = dataRows.map(row => {
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
          studentClass: e.class          || e['class']     || undefined,
          course:       e.course         || undefined,
          year:         e.year           || undefined,
          email:        e.email          || undefined,
          phone:        e.phone          || '',
          busStop:      e['bus stop']    || undefined,
          bloodGroup:   e['blood group'] || undefined,
          createdBy:    user?.name || user?.email || 'Imported',
          createdAt:    new Date().toISOString(),
        };
      });
      // Attach matched photos by row index (1.jpg…) or roll number
      const recordsWithPhotos = records.map((record, i) => {
        const byIndex = bulkPhotoMap.get(String(i + 1));
        const byRoll  = record.rollNo ? bulkPhotoMap.get(record.rollNo.toLowerCase().trim()) : undefined;
        const photo   = byIndex ?? byRoll;
        return photo ? { ...record, photo } : record;
      });

      let saved = 0;
      for (const record of recordsWithPhotos) {
        const result = await addStudentToDb(record);
        if (result.success) saved++;
      }
      setStudents(prev => [...recordsWithPhotos.slice(0, saved), ...prev]);
      setSubmissionCount(c => c + saved);
      setExcelFile(null);
      setBulkPhotoMap(new Map());
      setBulkImportOpen(false);
      showToast(`${saved} of ${records.length} records imported successfully.`, 'success');
    } catch {
      showToast('Failed to parse Excel file. Make sure it is a valid .xlsx file.', 'error');
    }
    setImportLoading(false);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Name: 'Raju Kumar',   Parentage: 'S/O Ram Kumar',    'Student ID': 'STU-001',
        'Roll No.': '01',     Class: 'B.Tech 1st Year',       Course: 'Computer Science',
        Year: '2024-25',      Email: 'raju@example.com',       Phone: '9876543210',
        'Bus Stop': 'Main Bus Stand',  'Blood Group': 'O+',
      },
      {
        Name: 'Priya Sharma', Parentage: 'D/O Mohan Sharma', 'Student ID': 'STU-002',
        'Roll No.': '02',     Class: 'B.Tech 1st Year',       Course: 'Electronics',
        Year: '2024-25',      Email: 'priya@example.com',      Phone: '9876543211',
        'Bus Stop': 'City Center',     'Blood Group': 'A+',
      },
    ]);
    // Auto-fit column widths
    ws['!cols'] = [20,22,14,10,18,20,10,26,14,18,12].map(w => ({ wch: w }));
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, 'Students');
    XLSX.writeFile(wbOut, 'student-import-template.xlsx');
  };


  if (!initialized || !user || user.role !== 'faculty_admin') return null;

  const initials = (user.name?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-slate-900 flex flex-col overflow-hidden transition-all duration-300 w-64 lg:sticky lg:top-0 lg:shrink-0 lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand + toggle */}
        <div className="border-b border-white/10 px-3 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:hidden">
            <div className="w-8 h-8 bg-violet-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Admin</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white transition lg:hidden shrink-0">
            <FiX className="w-4 h-4" />
          </button>

          {collapsed ? (
            <button onClick={() => setCollapsed(false)} title="Expand sidebar" className="hidden lg:flex w-8 h-8 bg-violet-500 rounded items-center justify-center mx-auto group transition">
              <span className="text-white text-sm font-black group-hover:hidden">G</span>
              <GoSidebarCollapse className="w-4 h-4 text-white hidden group-hover:block" />
            </button>
          ) : (
            <div className="hidden lg:flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-violet-500 rounded flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">G</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm leading-none">Gographic</p>
                  <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Faculty Admin</p>
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} title="Collapse sidebar" className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition shrink-0">
                <GoSidebarExpand className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* College badge */}
        {!collapsed && user.college && (
          <div className="mx-3 mt-3 px-3 py-2 bg-violet-500/20 rounded border border-violet-500/30">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-violet-300/70">College</p>
            <p className="text-white/80 text-xs font-bold mt-0.5 truncate">{user.college}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {[
            { view: 'dashboard' as const, icon: <FiLayout className="w-4 h-4 shrink-0" />, label: 'Dashboard' },
            { view: 'register' as const, icon: <FiUserPlus className="w-4 h-4 shrink-0" />, label: 'Register' },
            { view: 'faculty' as const, icon: <FiUsers className="w-4 h-4 shrink-0" />, label: 'Faculty' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => { navigateTo(view); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${
                activeView === view ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {icon}
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`} title={collapsed ? (user.name || 'Faculty Admin') : undefined}>
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{initials}</span>
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-black truncate leading-none">{user.name || 'Faculty Admin'}</p>
              <p className="text-white/40 text-[0.6rem] truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <FiLogOut className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 lg:hidden bg-slate-900 px-4 py-3 flex items-center gap-3 shadow-lg">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-white/70 hover:text-white transition">
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-violet-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              {user.college && (
                <p className="text-white/40 text-[0.55rem] font-bold truncate mt-0.5">{user.college}</p>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-500/20 border border-violet-500/30 text-[0.55rem] font-black uppercase tracking-widest text-violet-300 shrink-0">
            <FiShield className="w-2.5 h-2.5" /> Fac. Admin
          </span>
        </div>


        <main className="flex-1 min-w-0 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">

          {/* ── Dashboard ── */}
          {activeView === 'dashboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                    {studentsLoading ? 'Loading…' : `${students.length} students · ${user.college}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => { if (!user?.college) return; setRefreshing(true); const data = await getStudentsByCollege(user.college); setStudents(data); setRefreshing(false); }}
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

              <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
                <StudentTable students={students} loading={studentsLoading} onDelete={handleDeleteStudent} />
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
            </div>
          )}

          {/* ── Register ── */}
          {activeView === 'register' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">Register Students</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Add students manually or bulk-import via Excel</p>
                </div>
                <button
                  onClick={() => { setExcelFile(null); setBulkImportOpen(true); }}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600 transition shadow-sm active:scale-95 shrink-0"
                >
                  <FiUpload className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Bulk Import</span>
                  <span className="sm:hidden">Import</span>
                </button>
              </div>

              {/* ── Saved Drafts panel ── */}
              {dbDrafts.length > 0 && (
                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowDrafts(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-black text-slate-600">
                      <FiInbox className="w-4 h-4 text-violet-500" />
                      Saved Drafts
                      <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 text-[0.65rem] font-black">{dbDrafts.length}</span>
                    </span>
                    <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDrafts ? 'rotate-180' : ''}`} />
                  </button>
                  {showDrafts && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {dbDrafts.map(draft => (
                        <div key={draft.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {draft.photo
                              ? <img src={draft.photo} alt="" className="w-full h-full object-cover" />
                              : <FiCamera className="w-4 h-4 text-slate-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{draft.name || 'Unnamed'}</p>
                            <p className="text-[0.65rem] text-slate-400 font-medium">
                              {formatISTDateTime(draft.updatedAt)}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => loadDbDraft(draft)}
                              className="px-2.5 py-1.5 rounded text-xs font-black text-violet-600 bg-violet-50 hover:bg-violet-500 hover:text-white border border-violet-100 transition"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => setDraftDeleteId(draft.id)}
                              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Manual form ── */}
              <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">

                  <div className="flex items-start gap-3 mb-6">
                    <div className="bg-violet-500 p-2.5 rounded text-white shrink-0">
                      <FiUserPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-slate-900">Manual Registration</h2>
                        {activeDraftId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                            <FiInbox className="w-3 h-3" /> Editing draft
                          </span>
                        )}
                        {!activeDraftId && hasUnsavedRegister() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <FiSave className="w-3 h-3" /> Unsaved data
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Fields marked * are required</p>
                    </div>
                    {!studentsLoading && (
                      <div className="shrink-0 text-right bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                        <p className="text-[0.55rem] font-black uppercase tracking-widest text-violet-500">Total Students</p>
                        <p className="text-xl font-black text-violet-700 leading-none">{submissionCount}</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={createStudent} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">

                      <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Institution</span>
                        <input value={user.college ?? ''} readOnly className="input-field bg-slate-50 text-slate-500 cursor-not-allowed text-sm" />
                      </label>

                      {/* Student Photograph — top of form */}
                      <div className="sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">
                          Student Photograph <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="relative">
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0] ?? null; setUploadFile(f); handlePhotoFile(f); e.target.value = ''; }} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" />
                            <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600 transition text-sm">
                              <FiUpload className="w-4 h-4" /> Upload
                            </button>
                          </div>
                          <button type="button" onClick={() => startCamera('user')} className="flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition text-sm">
                            <FiCamera className="w-4 h-4" /> Camera
                          </button>
                          <div className="relative sm:hidden col-span-2">
                            <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0] ?? null; setUploadFile(f); handlePhotoFile(f); e.target.value = ''; }} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" />
                            <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition text-sm">
                              <FiCamera className="w-4 h-4" /> Take Photo (Phone Camera)
                            </button>
                          </div>
                        </div>
                        {photoPreview ? (
                          <div className="flex items-center gap-3 p-3 rounded border border-slate-200 bg-slate-50">
                            <img src={photoPreview} alt="Preview" className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700">Photo ready</p>
                              <p className="text-xs text-slate-400">Saved as 400×400 PNG</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button type="button" onClick={() => setCropSource(photoPreview)} title="Re-crop" className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition">
                                <FiCrop className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => { setPhotoPreview(null); setUploadFile(null); }} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                                <FiX className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-3 rounded border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                            <FiCamera className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-medium">No photo selected</p>
                          </div>
                        )}
                      </div>

                      <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Student Name *</span>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full legal name" className="input-field text-sm" />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Parentage *</span>
                        <input value={form.parentage} onChange={e => setForm(f => ({ ...f, parentage: e.target.value }))} placeholder="e.g. S/O Ramesh Kumar" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Contact Number *</span>
                        <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 00000 00000" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Roll No. <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.rollNo} onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} placeholder="e.g. 42" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Registration ID <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="e.g. STU-001" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Class <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.studentClass} onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))} placeholder="e.g. 10th / B.Tech 3rd" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Course <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. Computer Science" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Academic Year <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="e.g. 2024–25" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Blood Group <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} placeholder="e.g. O+" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Email ID <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@email.com" className="input-field text-sm" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Bus Stop <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
                        <input value={form.busStop} onChange={e => setForm(f => ({ ...f, busStop: e.target.value }))} placeholder="e.g. Main Bus Stand" className="input-field text-sm" />
                      </label>

                    </div>

                    {notice && (
                      <p className={`text-sm font-bold p-3 rounded ${notice.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {notice.message}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button type="submit" className="flex-1 bg-violet-500 text-white font-black py-3.5 rounded hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2">
                        <FiUserPlus className="w-4 h-4" /> Review &amp; Register
                      </button>
                      <button type="button" onClick={saveToDb} disabled={draftSaving} className="flex items-center justify-center gap-2 px-5 py-3.5 border border-slate-200 bg-white text-slate-600 font-black text-sm rounded hover:bg-slate-50 transition active:scale-95 disabled:opacity-60">
                        {draftSaving ? <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> : <FiSave className="w-4 h-4" />}
                        Save Draft
                      </button>
                    </div>
                  </form>
                </div>

            </div>
          )}

          {/* ── Faculty ── */}
          {activeView === 'faculty' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Faculty</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Manage faculty members for {user.college}
                </p>
              </div>

              {/* Add faculty form */}
              <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-violet-500 p-2.5 rounded text-white shrink-0">
                    <FiUser className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Add Faculty Member</h2>
                    <p className="text-xs text-slate-500 mt-0.5">New faculty will be assigned to {user.college}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiUser className="w-3 h-3" /> Full Name
                    </span>
                    <input
                      type="text"
                      value={facultyForm.name}
                      onChange={e => setFacultyForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className="input-field text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiMail className="w-3 h-3" /> Email
                    </span>
                    <input
                      type="email"
                      value={facultyForm.email}
                      onChange={e => setFacultyForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="faculty@college.edu"
                      className="input-field text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiLock className="w-3 h-3" /> Password
                    </span>
                    <input
                      type="password"
                      value={facultyForm.password}
                      onChange={e => setFacultyForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Set a secure password"
                      className="input-field text-sm"
                    />
                  </label>
                </div>

                {facultyMsg && (
                  <p className={`mt-4 text-sm font-bold p-3 rounded ${facultyMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {facultyMsg.text}
                  </p>
                )}

                <button
                  onClick={handleCreateFaculty}
                  className="mt-5 flex items-center gap-2 bg-slate-900 text-white font-black px-6 py-3 rounded hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm"
                >
                  <FiPlus className="w-4 h-4" /> Add Faculty
                </button>
              </div>

              {/* Faculty list */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900">Faculty Members</h2>
                  <span className="text-xs text-slate-400 font-bold">{facultyUsers.length} total</span>
                </div>

                {facultyLoading ? <TableSkeleton rows={4} cols={4} /> : facultyUsers.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-xl">👩‍🏫</div>
                      <div>
                        <p className="text-base font-black text-slate-900">No faculty members yet</p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Add the first faculty member above.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                      <thead className="bg-slate-50 text-slate-400 text-[0.65rem] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-4 lg:px-6 py-3.5 text-left">Name</th>
                          <th className="px-4 lg:px-6 py-3.5 text-left hidden sm:table-cell">Email</th>
                          <th className="px-4 lg:px-6 py-3.5 text-left hidden lg:table-cell">Added</th>
                          <th className="px-4 lg:px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {facultyUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 lg:px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-black text-violet-600 uppercase">{u.name?.[0] ?? u.email[0]}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-900 text-sm truncate">{u.name}</p>
                                  <p className="text-[0.65rem] text-slate-400 font-bold sm:hidden truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                              <p className="text-slate-600 font-medium text-sm truncate max-w-[200px]">{u.email}</p>
                            </td>
                            <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                              <p className="text-slate-400 font-medium text-xs">{formatISTDate(u.created_at)}</p>
                            </td>
                            <td className="px-4 lg:px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteFaculty(u.id)}
                                className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition ml-auto"
                                title="Remove faculty"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Deleted Faculty */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowDeletedFaculty(v => !v)}
                  className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-black text-slate-500">
                    <FiRotateCcw className="w-4 h-4" />
                    Deleted Faculty
                    {deletedFaculty.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedFaculty.length}</span>
                    )}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedFaculty ? 'rotate-180' : ''}`} />
                </button>
                {showDeletedFaculty && (
                  <div className="border-t border-slate-100">
                    {deletedFaculty.length === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted faculty members.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-separate border-spacing-0">
                          <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left">Name</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden sm:table-cell">Email</th>
                              <th className="px-4 lg:px-6 py-3 text-left hidden md:table-cell">Deleted By</th>
                              <th className="px-4 lg:px-6 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deletedFaculty.map(u => (
                              <tr key={u.id} className="bg-rose-50/20">
                                <td className="px-4 lg:px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded bg-rose-50 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-black text-rose-300 uppercase">{u.name?.[0] ?? u.email[0]}</span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-400 text-sm truncate">{u.name}</p>
                                      <p className="text-[0.65rem] text-slate-300 sm:hidden truncate">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden sm:table-cell">
                                  <p className="text-sm text-slate-400 font-medium truncate max-w-[200px]">{u.email}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 hidden md:table-cell">
                                  <p className="text-sm text-slate-400 font-medium">{u.deletedBy ?? '—'}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-3 text-right">
                                  <button
                                    onClick={() => handleRestoreFaculty(u.id)}
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

        </main>
      </div>

      {/* ── Bulk Import Modal ── */}
      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-black text-slate-900">Bulk Import</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Import multiple students from an Excel sheet</p>
              </div>
              <button onClick={() => { setBulkImportOpen(false); setExcelFile(null); setBulkPhotoMap(new Map()); }} disabled={importLoading} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-30 disabled:pointer-events-none">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Step 1 — template */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 1 — Download template</p>
                <p className="text-xs text-slate-500 font-medium">Fill in the template with student data. Required columns: <span className="font-black text-slate-700">Name, Parentage, Phone</span>. All others are optional.</p>
                <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-black py-2.5 rounded-lg hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600 transition text-sm">
                  <FiDownload className="w-4 h-4" /> Download Excel Template
                </button>
              </div>

              {/* Step 2 — upload */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 2 — Upload your sheet</p>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={e => setExcelFile(e.target.files?.[0] ?? null)}
                    className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                    disabled={importLoading}
                  />
                  <div className={`p-6 rounded-lg border-2 border-dashed transition text-center space-y-2 ${excelFile ? 'border-violet-400 bg-violet-50' : 'border-slate-200 group-hover:border-violet-400 bg-slate-50/50'}`}>
                    <FiUpload className={`w-6 h-6 mx-auto transition ${excelFile ? 'text-violet-500' : 'text-slate-300 group-hover:text-violet-400'}`} />
                    <p className="text-sm font-bold text-slate-600">{excelFile ? excelFile.name : 'Drop Excel file here'}</p>
                    <p className="text-xs text-slate-400">{excelFile ? 'Click to change file' : 'Click to browse — .xlsx or .xls'}</p>
                  </div>
                </div>
                {excelFile && (
                  <button onClick={() => setExcelFile(null)} className="text-xs text-rose-500 hover:text-rose-700 font-bold transition">
                    Remove file
                  </button>
                )}
              </div>

              {/* Step 3 — photos */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 3 — Student Photos <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></p>
                <p className="text-xs text-slate-500 font-medium">
                  Name each photo by <span className="font-black text-slate-700">row number</span> (1.jpg, 2.jpg…) or by <span className="font-black text-slate-700">Roll No.</span> (42.jpg…). Supported: JPG, PNG, WEBP.
                </p>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => handleBulkPhotos(e.target.files)}
                    className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer"
                    disabled={importLoading}
                  />
                  <div className={`p-5 rounded-lg border-2 border-dashed transition text-center space-y-2 ${bulkPhotoMap.size > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 group-hover:border-violet-400 bg-slate-50/50'}`}>
                    <FiCamera className={`w-5 h-5 mx-auto transition ${bulkPhotoMap.size > 0 ? 'text-emerald-500' : 'text-slate-300 group-hover:text-violet-400'}`} />
                    <p className="text-sm font-bold text-slate-600">
                      {bulkPhotoMap.size > 0 ? `${bulkPhotoMap.size} photo${bulkPhotoMap.size !== 1 ? 's' : ''} selected` : 'Select student photos'}
                    </p>
                    <p className="text-xs text-slate-400">Click to browse — select multiple images</p>
                  </div>
                </div>
                {bulkPhotoMap.size > 0 && (
                  <button onClick={() => setBulkPhotoMap(new Map())} className="text-xs text-rose-500 hover:text-rose-700 font-bold transition">
                    Clear photos
                  </button>
                )}
              </div>

              {/* Info note */}
              <p className="text-xs text-slate-400 font-medium px-1">
                The college will be set automatically to <span className="font-black text-slate-600">{user.college}</span>.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={handleExcelUpload}
                disabled={!excelFile || importLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-500 text-white font-black py-3 rounded-lg hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing…</>
                  : <><FiUpload className="w-4 h-4" /> Process All Records</>}
              </button>
              <button
                onClick={() => { setBulkImportOpen(false); setExcelFile(null); setBulkPhotoMap(new Map()); }}
                disabled={importLoading}
                className="px-5 py-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
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
              <div className="flex items-center gap-4 p-4 bg-violet-50 rounded-lg border border-violet-100">
                <div className="w-16 h-16 rounded-lg border-2 border-violet-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {confirmStudent.photo
                    ? <img src={confirmStudent.photo} alt="Photo" className="w-full h-full object-cover" />
                    : <FiCamera className="w-6 h-6 text-slate-300" />}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-base leading-tight truncate">{confirmStudent.name}</p>
                  {confirmStudent.parentage && <p className="text-xs text-slate-500 font-medium mt-0.5">{confirmStudent.parentage}</p>}
                  <p className="text-xs text-violet-600 font-bold mt-1">{confirmStudent.college}</p>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Phone',       value: confirmStudent.phone },
                  { label: 'Roll No.',    value: confirmStudent.rollNo },
                  { label: 'Student ID',  value: confirmStudent.studentId },
                  { label: 'Class',       value: confirmStudent.studentClass },
                  { label: 'Course',      value: confirmStudent.course },
                  { label: 'Year',        value: confirmStudent.year },
                  { label: 'Email',       value: confirmStudent.email },
                  { label: 'Bus Stop',    value: confirmStudent.busStop },
                  { label: 'Blood Group', value: confirmStudent.bloodGroup },
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
                className="flex-1 flex items-center justify-center gap-2 bg-violet-500 text-white font-black py-3 rounded-lg hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm disabled:opacity-60"
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

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Capture Photo</h3>
              <div className="flex items-center gap-1">
                <button onClick={flipCamera} title="Flip camera" className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition">
                  <MdFlipCameraAndroid className="w-4 h-4" />
                </button>
                <button onClick={stopCamera} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover bg-black" />
            <div className="p-4">
              <button type="button" onClick={captureFromCamera} className="w-full bg-violet-600 text-white font-black py-3 rounded-lg hover:bg-violet-700 transition active:scale-95 flex items-center justify-center gap-2">
                <FiCamera className="w-4 h-4" /> Take Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unsaved data nav guard ── */}
      {navGuard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Unsaved Data</h3>
              <p className="text-xs text-slate-500 mt-1">You have unsaved information in the registration form. What would you like to do?</p>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <button
                onClick={async () => { await saveToDb(); setForm(EMPTY_FORM); setPhotoPreview(null); setActiveDraftId(null); setActiveView(navGuard); setNavGuard(null); }}
                className="w-full flex items-center justify-center gap-2 bg-violet-500 text-white font-black py-3 rounded-lg hover:bg-violet-600 transition text-sm active:scale-95"
              >
                <FiSave className="w-4 h-4" /> Save as Draft &amp; Leave
              </button>
              <button
                onClick={() => setNavGuard(null)}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-black py-3 rounded-lg hover:bg-slate-200 transition text-sm active:scale-95"
              >
                <FiUserPlus className="w-4 h-4" /> Stay &amp; Complete
              </button>
              <button
                onClick={() => { setForm(EMPTY_FORM); setPhotoPreview(null); clearDraft(); setActiveView(navGuard); setNavGuard(null); }}
                className="w-full text-rose-500 font-bold py-2 text-sm hover:text-rose-700 transition"
              >
                Discard &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft delete confirmation */}
      {draftDeleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Delete Draft?</h3>
              <p className="text-xs text-slate-500 mt-1">This draft will be permanently deleted and cannot be recovered.</p>
            </div>
            <div className="p-4 flex gap-2">
              <button
                onClick={async () => { await deleteDbDraft(draftDeleteId); setDraftDeleteId(null); }}
                className="flex-1 bg-rose-500 text-white font-black py-2.5 rounded-lg hover:bg-rose-600 transition text-sm active:scale-95"
              >
                Delete
              </button>
              <button
                onClick={() => setDraftDeleteId(null)}
                className="flex-1 border border-slate-200 text-slate-600 font-black py-2.5 rounded-lg hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop modal */}
      {cropSource && (
        <CropModal
          src={cropSource}
          onConfirm={cropped => { setPhotoPreview(cropped); setCropSource(null); }}
          onCancel={() => setCropSource(null)}
        />
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900 border-t border-white/10 flex">
        {([
          { view: 'dashboard' as const, icon: <FiLayout className="w-5 h-5" />, label: 'Dashboard' },
          { view: 'register' as const, icon: <FiUserPlus className="w-5 h-5" />, label: 'Register' },
          { view: 'faculty' as const, icon: <FiUsers className="w-5 h-5" />, label: 'Faculty' },
        ] as const).map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => navigateTo(view)}
            className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-4 text-[0.55rem] font-black uppercase tracking-widest transition-colors ${
              activeView === view ? 'text-white' : 'text-white/35 hover:text-white/70'
            }`}
          >
            <span className={`transition-transform ${activeView === view ? 'scale-110' : ''}`}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

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

      {/* Inactivity warning */}
      {warningVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-2xl">⏱️</div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Session Expiring</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                You will be logged out due to inactivity in{' '}
                <span className="font-black text-amber-600">{secondsLeft}s</span>.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={stayLoggedIn}
                className="flex-1 bg-violet-600 text-white font-black py-2.5 rounded-lg hover:bg-violet-700 transition text-sm"
              >
                Stay Logged In
              </button>
              <button
                onClick={logout}
                className="flex-1 border border-slate-200 text-slate-600 font-black py-2.5 rounded-lg hover:bg-slate-50 transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
