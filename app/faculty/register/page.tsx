'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  saveDraftToDb, getDraftsByUser, deleteDraftFromDb, addAuditLog,
} from '@/lib/actions';
import { StudentRecord, DraftRecord } from '@/lib/types';
import * as XLSX from 'xlsx';
import {
  FiUserPlus, FiUpload, FiDownload, FiX, FiCamera,
  FiSave, FiCrop, FiTrash2, FiInbox, FiChevronDown,
} from 'react-icons/fi';
import CropModal from '@/components/CropModal';
import { MdFlipCameraAndroid } from 'react-icons/md';
import { formatISTDateTime } from '@/lib/formatDate';

const EMPTY_FORM = {
  college: '', name: '', parentage: '', studentId: '', rollNo: '',
  studentClass: '', course: '', year: '', email: '', phone: '',
  busStop: '', bloodGroup: '', dob: '', address: '', percentage: '',
};
type FormType = typeof EMPTY_FORM;

function validateField(field: keyof FormType, value: string, form: FormType, existing: { phone: string; name: string }[]): string {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Student name is required.';
      if (value.trim().length < 2) return 'Name must be at least 2 characters.';
      return '';
    case 'parentage':
      if (!value.trim()) return 'Father / Mother name is required.';
      if (value.trim().length < 2) return 'Must be at least 2 characters.';
      return '';
    case 'phone': {
      if (!value.trim()) return 'Contact number is required.';
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 10) return 'Enter a valid 10-digit phone number.';
      const dup = existing.find(s => s.phone.replace(/\D/g, '') === digits);
      if (dup) return `Already registered for "${dup.name}".`;
      return '';
    }
    case 'email':
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
      return '';
    case 'percentage': {
      if (!value) return '';
      const n = parseFloat(value);
      if (isNaN(n) || n < 0 || n > 100) return 'Percentage must be between 0 and 100.';
      return '';
    }
    case 'dob':
      if (value && new Date(value) > new Date()) return 'Date of birth cannot be in the future.';
      return '';
    default:
      return '';
  }
}

const Label = ({ text, optional }: { text: string; optional?: boolean }) => (
  <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">
    {text}
    {optional && <span className="ml-1 normal-case tracking-normal font-medium text-slate-300">(optional)</span>}
  </span>
);

export default function FacultyRegisterPage() {
  const { user, students, addStudent, importStudents, colleges } = useAuth();

  const [form,             setForm]             = useState(EMPTY_FORM);
  const [photoPreview,     setPhotoPreview]     = useState<string | null>(null);
  const [uploadFile,       setUploadFile]       = useState<File | null>(null);
  const [notice,           setNotice]           = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submissionCount,  setSubmissionCount]  = useState(0);
  const [confirmStudent,   setConfirmStudent]   = useState<StudentRecord | null>(null);
  const [submitting,       setSubmitting]       = useState(false);
  const [draftDeleteId,    setDraftDeleteId]    = useState<string | null>(null);
  const [formErrors,       setFormErrors]       = useState<Partial<Record<keyof FormType, string>>>({});
  const [touched,          setTouched]          = useState<Partial<Record<keyof FormType, boolean>>>({});
  const [photoError,       setPhotoError]       = useState<string | null>(null);
  const [bulkImportOpen,   setBulkImportOpen]   = useState(false);
  const [importLoading,    setImportLoading]    = useState(false);
  const [excelFile,        setExcelFile]        = useState<File | null>(null);
  const [cropSource,       setCropSource]       = useState<string | null>(null);
  const [cropTarget,       setCropTarget]       = useState<'main'>('main');
  const [dbDrafts,         setDbDrafts]         = useState<DraftRecord[]>([]);
  const [activeDraftId,    setActiveDraftId]    = useState<string | null>(null);
  const [showDrafts,       setShowDrafts]       = useState(false);
  const [draftSaving,      setDraftSaving]      = useState(false);
  const [bulkPhotoMap,     setBulkPhotoMap]     = useState<Map<string, string>>(new Map());
  const [cameraOpen,       setCameraOpen]       = useState(false);
  const [facingMode,       setFacingMode]       = useState<'user' | 'environment'>('user');

  const videoRef       = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const facingModeRef  = useRef<'user' | 'environment'>('user');

  useEffect(() => {
    if (!user) return;
    const college = user.college || colleges[0] || '';
    setForm(prev => ({ ...prev, college }));
    const userKey = user.email || user.name || '';
    if (userKey) getDraftsByUser(userKey).then(setDbDrafts);
  }, [user, colleges]);

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

  // Warn on unsaved data when navigating away
  const hasUnsavedData = () =>
    form.name.trim() !== '' || form.phone.trim() !== '' ||
    form.parentage.trim() !== '' || !!photoPreview;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  if (!user) return null;

  const facultyStudents = user.college
    ? students.filter(s =>
        s.college === user.college &&
        (s.createdBy === user.name || s.createdBy === user.email)
      )
    : students.filter(s => s.createdBy === user.name || s.createdBy === user.email);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const clearDraft = (draftId?: string | null) => {
    const id = draftId ?? activeDraftId;
    if (id) {
      deleteDraftFromDb(id).then(() => {
        setDbDrafts(prev => prev.filter(d => d.id !== id));
        setActiveDraftId(null);
      });
    }
  };

  const loadDbDraft = (draft: DraftRecord) => {
    setForm(prev => ({
      college:      prev.college,
      name:         draft.name         ?? '',
      parentage:    draft.parentage    ?? '',
      studentId:    draft.studentId    ?? '',
      rollNo:       draft.rollNo       ?? '',
      studentClass: draft.studentClass ?? '',
      course:       draft.course       ?? '',
      year:         draft.year         ?? '',
      email:        draft.email        ?? '',
      phone:        draft.phone        ?? '',
      busStop:      draft.busStop      ?? '',
      bloodGroup:   draft.bloodGroup   ?? '',
      dob:          draft.dob          ?? '',
      address:      draft.address      ?? '',
      percentage:   draft.percentage   ?? '',
    }));
    setPhotoPreview(draft.photo ?? null);
    setActiveDraftId(draft.id);
    setShowDrafts(false);
    setNotice({ message: 'Draft loaded.', type: 'success' });
    setTimeout(() => setNotice(null), 2500);
  };

  const deleteDbDraft = async (id: string) => {
    await deleteDraftFromDb(id);
    setDbDrafts(prev => prev.filter(d => d.id !== id));
    if (activeDraftId === id) setActiveDraftId(null);
  };

  const saveToDb = async () => {
    const userKey = user?.email || user?.name || '';
    if (!userKey) return;
    setDraftSaving(true);
    const id = activeDraftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draft: DraftRecord = {
      id,
      college:      form.college,
      name:         form.name,
      phone:        form.phone,
      parentage:    form.parentage    || undefined,
      studentId:    form.studentId    || undefined,
      rollNo:       form.rollNo       || undefined,
      studentClass: form.studentClass || undefined,
      course:       form.course       || undefined,
      year:         form.year         || undefined,
      email:        form.email        || undefined,
      busStop:      form.busStop      || undefined,
      bloodGroup:   form.bloodGroup   || undefined,
      photo:        photoPreview      || undefined,
      savedBy:      userKey,
      updatedAt:    new Date().toISOString(),
    };
    const result = await saveDraftToDb(draft);
    if (result.success) {
      setActiveDraftId(id);
      setDbDrafts(prev => {
        const without = prev.filter(d => d.id !== id);
        return [{ ...draft }, ...without];
      });
      setNotice({ message: 'Draft saved.', type: 'success' });
    } else {
      setNotice({ message: 'Failed to save draft.', type: 'error' });
    }
    setTimeout(() => setNotice(null), 2500);
    setDraftSaving(false);
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
      setPhotoPreview(canvas.toDataURL('image/png'));
    };
    img.src = src;
  };

  const handlePhotoFile = (file: File | null) => {
    if (!file) { setPhotoPreview(null); return; }
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      setPhotoError(`Photo must be under ${MAX_MB}MB (selected: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      setUploadFile(null);
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      setCropTarget('main');
      setCropSource(src);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingModeRef.current) => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = s;
      facingModeRef.current = mode;
      setFacingMode(mode);
      setCameraOpen(true);
    } catch {
      setNotice({ message: 'Camera access denied or unavailable.', type: 'error' });
    }
  };

  const flipCamera = async () => {
    const next = facingModeRef.current === 'user' ? 'environment' : 'user';
    await startCamera(next);
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth; const vh = video.videoHeight;
    canvas.width = vw; canvas.height = vh;
    canvas.getContext('2d')?.drawImage(video, 0, 0, vw, vh);
    const src = canvas.toDataURL('image/png');
    stopCamera();
    setCropTarget('main');
    setCropSource(src);
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

  const handleFieldChange = (field: keyof FormType, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      const err = validateField(field, value, next, facultyStudents.map(s => ({ phone: s.phone, name: s.name })));
      setFormErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const handleFieldBlur = (field: keyof FormType) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field], form, facultyStudents.map(s => ({ phone: s.phone, name: s.name })));
    setFormErrors(prev => ({ ...prev, [field]: err }));
  };

  const createStudent = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fields: (keyof FormType)[] = ['name', 'parentage', 'phone', 'email', 'percentage', 'dob'];
    const existing = facultyStudents.map(s => ({ phone: s.phone, name: s.name }));
    const errors: Partial<Record<keyof FormType, string>> = {};
    fields.forEach(f => {
      const err = validateField(f, form[f], form, existing);
      if (err) errors[f] = err;
    });
    setFormErrors(errors);
    setTouched(Object.fromEntries(fields.map(f => [f, true])));
    if (Object.keys(errors).length > 0) return;

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
      dob:          form.dob          || undefined,
      address:      form.address      || undefined,
      percentage:   form.percentage   || undefined,
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
      addAuditLog({
        userEmail: user?.email ?? '',
        userName:  user?.name  ?? '',
        action:    'add_student',
        entityType: 'student',
        entityId:   confirmStudent.id,
        details:    `Registered: ${confirmStudent.name} (${confirmStudent.college})`,
      }).catch(() => {});
      setConfirmStudent(null);
      setForm(prev => ({ ...EMPTY_FORM, college: prev.college }));
      setPhotoPreview(null);
      setUploadFile(null);
      setFormErrors({});
      setTouched({});
      setPhotoError(null);
      clearDraft(activeDraftId);
      setNotice({ message: 'Student registered successfully.', type: 'success' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setConfirmStudent(null);
      setNotice({ message: 'Failed to save student record. Please try again.', type: 'error' });
    }
    setSubmitting(false);
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
      const records = dataRows.map((row, i) => {
        const e = Array.isArray(row)
          ? row.reduce<Record<string, string>>((acc, v, idx) => { acc[norm[idx] ?? ''] = String(v ?? '').trim(); return acc; }, {})
          : {};
        const rollNo = e['roll no.'] || e['roll no'] || e.rollno || undefined;
        const byIndex = bulkPhotoMap.get(String(i + 1));
        const byRoll  = rollNo ? bulkPhotoMap.get(rollNo.toLowerCase().trim()) : undefined;
        const photo   = byIndex ?? byRoll;
        return {
          id:           `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          college:      user?.college || '',
          name:         e.name        || 'Unnamed Student',
          parentage:    e.parentage   || undefined,
          studentId:    e['student id']  || e.studentid   || undefined,
          rollNo,
          studentClass: e.class          || undefined,
          course:       e.course         || undefined,
          year:         e.year           || undefined,
          email:        e.email          || undefined,
          phone:        e.phone          || '',
          busStop:      e['bus stop']    || undefined,
          bloodGroup:   e['blood group'] || undefined,
          photo:        photo            || undefined,
          createdBy:    user?.name || user?.email || 'Imported',
          createdAt:    new Date().toISOString(),
        } as StudentRecord;
      });
      await importStudents(records);
      setExcelFile(null);
      setBulkPhotoMap(new Map());
      setBulkImportOpen(false);
      setNotice({ message: `${records.length} records imported successfully.`, type: 'success' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({ message: 'Failed to parse Excel file. Make sure it is a valid .xlsx file.', type: 'error' });
    }
    setImportLoading(false);
  };

  const hasUnsaved = () =>
    form.name.trim() !== '' || form.phone.trim() !== '' ||
    form.parentage.trim() !== '' || !!photoPreview;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Register Students</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Add new students manually or import via Excel</p>
        </div>
        <button
          onClick={() => setBulkImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-black text-sm rounded hover:bg-blue-700 transition shadow-sm active:scale-95 shrink-0 self-start"
        >
          <FiUpload className="w-4 h-4" /> Bulk Import
        </button>
      </div>

      {/* DB Drafts panel */}
      {dbDrafts.length > 0 && (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDrafts(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
          >
            <span className="flex items-center gap-2 text-sm font-black text-slate-600">
              <FiInbox className="w-4 h-4" />
              Saved Drafts
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-[0.65rem] font-black">{dbDrafts.length}</span>
            </span>
            <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDrafts ? 'rotate-180' : ''}`} />
          </button>
          {showDrafts && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {dbDrafts.map(draft => (
                <div key={draft.id} className="flex items-center gap-3 px-4 py-3">
                  {draft.photo
                    ? <img src={draft.photo} alt="" className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0" />
                    : <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center"><FiCamera className="w-4 h-4 text-slate-300" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{draft.name || <span className="text-slate-400 font-medium italic">Unnamed draft</span>}</p>
                    <p className="text-[0.6rem] text-slate-400 mt-0.5">
                      {draft.course || draft.studentClass || draft.phone || '—'} · {formatISTDateTime(draft.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadDbDraft(draft)}
                      className="px-3 py-1.5 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded border border-blue-100 transition"
                    >
                      Load
                    </button>
                    <button
                      type="button"
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

      {/* Manual form */}
      <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="bg-blue-600 p-2.5 rounded text-white shrink-0">
            <FiUserPlus className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-900">Manual Registration</h2>
              {activeDraftId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  <FiInbox className="w-3 h-3" /> Editing draft
                </span>
              )}
              {!activeDraftId && hasUnsaved() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <FiSave className="w-3 h-3" /> Unsaved data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Fields marked * are required</p>
          </div>
          <div className="shrink-0 text-right bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-[0.55rem] font-black uppercase tracking-widest text-blue-500">Total Students</p>
            <p className="text-xl font-black text-blue-700 leading-none">{submissionCount}</p>
          </div>
        </div>

        <form onSubmit={createStudent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">

            <label className="block sm:col-span-2">
              <Label text="Institution" />
              <input value={form.college} readOnly className="input-field bg-slate-50 text-slate-500 cursor-not-allowed text-sm" />
            </label>

            {/* Student Photograph */}
            <div className="sm:col-span-2">
              <Label text="Student Photograph" optional />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="relative">
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0] ?? null; setUploadFile(f); handlePhotoFile(f); e.target.value = ''; }} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" />
                  <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm">
                    <FiUpload className="w-4 h-4" /> Upload
                  </button>
                </div>
                <button type="button" onClick={() => startCamera('user')} className="hidden sm:flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition text-sm">
                  <FiCamera className="w-4 h-4" /> Camera
                </button>
                <div className="relative sm:hidden col-span-2">
                  <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0] ?? null; setUploadFile(f); handlePhotoFile(f); e.target.value = ''; }} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" />
                  <button type="button" className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 rounded hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition text-sm">
                    <FiCamera className="w-4 h-4" /> Take Photo
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
                    <button type="button" onClick={() => { setCropTarget('main'); setCropSource(photoPreview); }} title="Re-crop" className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
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
              {photoError && <p className="mt-1.5 text-xs font-bold text-rose-500">{photoError}</p>}
            </div>

            <label className="block sm:col-span-2">
              <Label text="Student Name *" />
              <input
                value={form.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                placeholder="Full legal name"
                className={`input-field text-sm ${formErrors.name ? 'border-rose-400 focus:ring-rose-300' : touched.name && !formErrors.name && form.name ? 'border-emerald-400' : ''}`}
              />
              {formErrors.name ? <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.name}</p> : touched.name && form.name && <p className="mt-1 text-xs font-bold text-emerald-500">✓ Looks good</p>}
            </label>

            <label className="block sm:col-span-2">
              <Label text="Father Name / Mother Name *" />
              <input
                value={form.parentage}
                onChange={e => handleFieldChange('parentage', e.target.value)}
                onBlur={() => handleFieldBlur('parentage')}
                placeholder="Enter father's name or mother's name"
                className={`input-field text-sm ${formErrors.parentage ? 'border-rose-400 focus:ring-rose-300' : touched.parentage && !formErrors.parentage && form.parentage ? 'border-emerald-400' : ''}`}
              />
              {formErrors.parentage ? <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.parentage}</p> : touched.parentage && form.parentage && <p className="mt-1 text-xs font-bold text-emerald-500">✓ Looks good</p>}
            </label>

            <label className="block">
              <Label text="Contact Number *" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                placeholder="10-digit number"
                className={`input-field text-sm ${formErrors.phone ? 'border-rose-400 focus:ring-rose-300' : touched.phone && !formErrors.phone && form.phone ? 'border-emerald-400' : ''}`}
              />
              {formErrors.phone ? <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.phone}</p> : touched.phone && form.phone && <p className="mt-1 text-xs font-bold text-emerald-500">✓ Valid number</p>}
            </label>

            <label className="block">
              <Label text="Roll No." optional />
              <input value={form.rollNo} onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} placeholder="e.g. 42" className="input-field text-sm" />
            </label>

            <label className="block">
              <Label text="Admission Number" optional />
              <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="e.g. ADM-2024-001" className="input-field text-sm" />
            </label>

            <label className="block">
              <Label text="Class / Section" optional />
              <input value={form.studentClass} onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))} placeholder="e.g. 10-A / B.Tech 3rd" className="input-field text-sm" />
            </label>

            <label className="block">
              <Label text="Course" optional />
              <input value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. Computer Science" className="input-field text-sm" />
            </label>

            <label className="block">
              <Label text="Academic Year" optional />
              <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="e.g. 2024–25" className="input-field text-sm" />
            </label>

            <label className="block">
              <Label text="Date of Birth" optional />
              <input
                type="date"
                value={form.dob}
                onChange={e => handleFieldChange('dob', e.target.value)}
                onBlur={() => handleFieldBlur('dob')}
                className={`input-field text-sm ${formErrors.dob ? 'border-rose-400 focus:ring-rose-300' : ''}`}
              />
              {formErrors.dob && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.dob}</p>}
            </label>

            <label className="block">
              <Label text="Percentage %" optional />
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.percentage}
                  onChange={e => handleFieldChange('percentage', e.target.value)}
                  onBlur={() => handleFieldBlur('percentage')}
                  placeholder="e.g. 85.5"
                  className={`input-field text-sm pr-8 ${formErrors.percentage ? 'border-rose-400 focus:ring-rose-300' : touched.percentage && !formErrors.percentage && form.percentage ? 'border-emerald-400' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">%</span>
              </div>
              {formErrors.percentage && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.percentage}</p>}
            </label>

            <label className="block">
              <Label text="Blood Group" optional />
              <input value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} placeholder="e.g. O+" className="input-field text-sm" />
            </label>

            <label className="block sm:col-span-2">
              <Label text="Address" optional />
              <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" rows={2} className="input-field text-sm resize-none" />
            </label>

            <label className="block">
              <Label text="Email ID" optional />
              <input
                type="email"
                value={form.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="student@email.com"
                className={`input-field text-sm ${formErrors.email ? 'border-rose-400 focus:ring-rose-300' : touched.email && !formErrors.email && form.email ? 'border-emerald-400' : ''}`}
              />
              {formErrors.email && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.email}</p>}
            </label>

            <label className="block">
              <Label text="Bus Stop" optional />
              <input value={form.busStop} onChange={e => setForm(f => ({ ...f, busStop: e.target.value }))} placeholder="e.g. Main Bus Stand" className="input-field text-sm" />
            </label>

          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-3.5 rounded hover:bg-blue-700 transition shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2">
              <FiUserPlus className="w-4 h-4" /> Review &amp; Register
            </button>
            <button
              type="button"
              onClick={saveToDb}
              disabled={draftSaving}
              className="flex items-center justify-center gap-2 px-5 py-3.5 border border-slate-200 bg-white text-slate-600 font-black text-sm rounded hover:bg-slate-50 transition active:scale-95 disabled:opacity-60"
            >
              {draftSaving
                ? <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                : <FiSave className="w-4 h-4" />}
              Save Draft
            </button>
          </div>
        </form>
      </div>

      {/* Crop Modal */}
      {cropSource && (
        <CropModal
          src={cropSource}
          onConfirm={cropped => {
            setCropSource(null);
            setPhotoPreview(cropped);
          }}
          onCancel={() => {
            if (!photoPreview) {
              setCropSource(null);
            } else {
              processImage(cropSource);
              setCropSource(null);
            }
          }}
        />
      )}

      {/* Bulk Import Modal */}
      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={importLoading ? undefined : () => { setBulkImportOpen(false); setExcelFile(null); setBulkPhotoMap(new Map()); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-black text-slate-900">Bulk Import</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Upload an Excel file to import multiple students at once</p>
              </div>
              <button onClick={() => { setBulkImportOpen(false); setExcelFile(null); setBulkPhotoMap(new Map()); }} disabled={importLoading} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-30 disabled:pointer-events-none">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 1 — Download template</p>
                <p className="text-xs text-slate-500 font-medium">Required columns: <span className="font-black text-slate-700">Name, Parentage, Phone</span>. All others are optional.</p>
                <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-black py-2.5 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition text-sm">
                  <FiDownload className="w-4 h-4" /> Download Excel Template
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 2 — Upload your sheet</p>
                <div className="relative group">
                  <input type="file" accept=".xlsx,.xls" onChange={e => setExcelFile(e.target.files?.[0] ?? null)} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" disabled={importLoading} />
                  <div className={`p-6 rounded-lg border-2 border-dashed transition text-center space-y-2 ${excelFile ? 'border-blue-400 bg-blue-50' : 'border-slate-200 group-hover:border-blue-400 bg-slate-50/50'}`}>
                    <FiUpload className={`w-6 h-6 mx-auto transition ${excelFile ? 'text-blue-500' : 'text-slate-300 group-hover:text-blue-400'}`} />
                    <p className="text-sm font-bold text-slate-600">{excelFile ? excelFile.name : 'Drop Excel file here'}</p>
                    <p className="text-xs text-slate-400">{excelFile ? 'Click to change file' : 'Click to browse — .xlsx or .xls'}</p>
                  </div>
                </div>
                {excelFile && <button onClick={() => setExcelFile(null)} className="text-xs text-rose-500 hover:text-rose-700 font-bold transition">Remove file</button>}
              </div>
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 3 — Student Photos <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></p>
                <p className="text-xs text-slate-500 font-medium">
                  Name each photo by <span className="font-black text-slate-700">row number</span> (1.jpg, 2.jpg…) or by <span className="font-black text-slate-700">Roll No.</span> (42.jpg…).
                </p>
                <div className="relative group">
                  <input type="file" accept="image/*" multiple onChange={e => handleBulkPhotos(e.target.files)} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" disabled={importLoading} />
                  <div className={`p-5 rounded-lg border-2 border-dashed transition text-center space-y-2 ${bulkPhotoMap.size > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 group-hover:border-blue-400 bg-slate-50/50'}`}>
                    <FiCamera className={`w-5 h-5 mx-auto transition ${bulkPhotoMap.size > 0 ? 'text-emerald-500' : 'text-slate-300 group-hover:text-blue-400'}`} />
                    <p className="text-sm font-bold text-slate-600">
                      {bulkPhotoMap.size > 0 ? `${bulkPhotoMap.size} photo${bulkPhotoMap.size !== 1 ? 's' : ''} selected` : 'Select student photos'}
                    </p>
                  </div>
                </div>
                {bulkPhotoMap.size > 0 && <button onClick={() => setBulkPhotoMap(new Map())} className="text-xs text-rose-500 hover:text-rose-700 font-bold transition">Clear photos</button>}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={handleExcelUpload}
                disabled={importLoading || !excelFile}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-3 rounded-lg hover:bg-blue-700 transition shadow-sm text-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importLoading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" /> Importing…</>
                  : <><FiUpload className="w-4 h-4" /> Process All Records</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Registration Modal */}
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
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Phone',       value: confirmStudent.phone },
                  { label: 'Roll No.',    value: confirmStudent.rollNo },
                  { label: 'Student ID', value: confirmStudent.studentId },
                  { label: 'Class',      value: confirmStudent.studentClass },
                  { label: 'Course',     value: confirmStudent.course },
                  { label: 'Year',       value: confirmStudent.year },
                  { label: 'Email',      value: confirmStudent.email },
                  { label: 'Bus Stop',   value: confirmStudent.busStop },
                  { label: 'Blood Group',value: confirmStudent.bloodGroup },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>
              {!confirmStudent.photo && <p className="text-xs text-slate-400 font-medium text-center">No photo attached.</p>}
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
              <button onClick={() => setConfirmStudent(null)} disabled={submitting} className="px-5 py-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-60">
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Capture Photo</h3>
              <div className="flex items-center gap-2">
                <button onClick={flipCamera} title="Flip camera" className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                  <MdFlipCameraAndroid className="w-4 h-4" />
                </button>
                <button onClick={stopCamera} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition">
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover bg-black" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center text-white/60 text-[0.6rem] font-bold">
                {facingMode === 'user' ? 'Front camera' : 'Back camera'}
              </p>
            </div>
            <div className="p-4">
              <button type="button" onClick={captureFromCamera} className="w-full bg-blue-600 text-white font-black py-3 rounded-lg hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2">
                <FiCamera className="w-4 h-4" /> Take Photo
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

      {/* Toast */}
      {notice && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${notice.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'}`}>
          <span className="truncate">{notice.message}</span>
        </div>
      )}
    </div>
  );
}
