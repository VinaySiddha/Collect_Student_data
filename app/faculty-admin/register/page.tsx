'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  addStudentToDb, getStudentsByCollege,
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
  name: '', parentage: '', studentId: '', rollNo: '', studentClass: '',
  course: '', year: '', email: '', phone: '', busStop: '', bloodGroup: '',
  dob: '', address: '', percentage: '',
};
type FormType = typeof EMPTY_FORM;

export default function FacultyAdminRegisterPage() {
  const { user } = useAuth();

  const [students,        setStudents]        = useState<StudentRecord[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [photoPreview,    setPhotoPreview]    = useState<string | null>(null);
  const [uploadFile,      setUploadFile]      = useState<File | null>(null);
  const [notice,          setNotice]          = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmStudent,  setConfirmStudent]  = useState<StudentRecord | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [draftDeleteId,   setDraftDeleteId]   = useState<string | null>(null);
  const [formErrors,      setFormErrors]      = useState<Partial<Record<string, string>>>({});
  const [touched,         setTouched]         = useState<Partial<Record<string, boolean>>>({});
  const [photoError,      setPhotoError]      = useState<string | null>(null);
  const [bulkImportOpen,  setBulkImportOpen]  = useState(false);
  const [importLoading,   setImportLoading]   = useState(false);
  const [excelFile,       setExcelFile]       = useState<File | null>(null);
  const [cropSource,      setCropSource]      = useState<string | null>(null);
  const [dbDrafts,        setDbDrafts]        = useState<DraftRecord[]>([]);
  const [activeDraftId,   setActiveDraftId]   = useState<string | null>(null);
  const [showDrafts,      setShowDrafts]      = useState(false);
  const [draftSaving,     setDraftSaving]     = useState(false);
  const [bulkPhotoMap,    setBulkPhotoMap]    = useState<Map<string, string>>(new Map());
  const [cameraOpen,      setCameraOpen]      = useState(false);
  const [facingMode,      setFacingMode]      = useState<'user' | 'environment'>('user');

  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');

  useEffect(() => {
    if (!user?.college) return;
    getStudentsByCollege(user.college).then(data => {
      setStudents(data);
      setSubmissionCount(data.length);
    });
    const userKey = user.email || user.name || '';
    if (userKey) getDraftsByUser(userKey).then(setDbDrafts);
  }, [user?.college]);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  // Warn on unsaved data
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (form.name.trim() || form.phone.trim() || form.parentage.trim() || photoPreview) {
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  if (!user) return null;

  const validateField = (field: keyof FormType, value: string): string => {
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
        const dup = students.find(s => s.phone.replace(/\D/g, '') === digits);
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
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setNotice({ message: msg, type });
    setTimeout(() => setNotice(null), 3000);
  };

  const clearDraft = (draftId?: string | null) => {
    const id = draftId ?? activeDraftId;
    if (id) deleteDraftFromDb(id).then(() => {
      setDbDrafts(prev => prev.filter(d => d.id !== id));
      setActiveDraftId(null);
    });
  };

  const loadDbDraft = (draft: DraftRecord) => {
    setForm({
      name: draft.name ?? '', parentage: draft.parentage ?? '',
      studentId: draft.studentId ?? '', rollNo: draft.rollNo ?? '',
      studentClass: draft.studentClass ?? '', course: draft.course ?? '',
      year: draft.year ?? '', email: draft.email ?? '',
      phone: draft.phone ?? '', busStop: draft.busStop ?? '',
      bloodGroup: draft.bloodGroup ?? '', dob: draft.dob ?? '',
      address: draft.address ?? '', percentage: draft.percentage ?? '',
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
      setUploadFile(null); return;
    }
    setPhotoError(null);
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
      showToast('Camera access denied or unavailable.', 'error');
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

  const handleFieldChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (touched[field]) {
      setFormErrors(prev => ({ ...prev, [field]: validateField(field as keyof FormType, value) }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setFormErrors(prev => ({ ...prev, [field]: validateField(field as keyof FormType, form[field as keyof FormType]) }));
  };

  const createStudent = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.college) { showToast('No college associated with your account.', 'error'); return; }
    const fields = ['name', 'parentage', 'phone', 'email', 'percentage', 'dob'];
    const errors: Record<string, string> = {};
    fields.forEach(f => {
      const err = validateField(f as keyof FormType, form[f as keyof FormType]);
      if (err) errors[f] = err;
    });
    setFormErrors(errors);
    setTouched(Object.fromEntries(fields.map(f => [f, true])));
    if (Object.keys(errors).length > 0) return;

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
        setFormErrors({});
        setTouched({});
        setPhotoError(null);
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

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Name: 'Raju Kumar',   Parentage: 'S/O Ram Kumar',    'Student ID': 'STU-001', 'Roll No.': '01', Class: 'B.Tech 1st Year', Course: 'Computer Science', Year: '2024-25', Email: 'raju@example.com',  Phone: '9876543210', 'Bus Stop': 'Main Bus Stand', 'Blood Group': 'O+' },
      { Name: 'Priya Sharma', Parentage: 'D/O Mohan Sharma', 'Student ID': 'STU-002', 'Roll No.': '02', Class: 'B.Tech 1st Year', Course: 'Electronics',       Year: '2024-25', Email: 'priya@example.com', Phone: '9876543211', 'Bus Stop': 'City Center',    'Blood Group': 'A+' },
    ]);
    ws['!cols'] = [20,22,14,10,18,20,10,26,14,18,12].map(w => ({ wch: w }));
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, 'Students');
    XLSX.writeFile(wbOut, 'student-import-template.xlsx');
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
      if (!headers || !Array.isArray(headers)) { showToast('Excel file appears empty or invalid.', 'error'); setImportLoading(false); return; }
      const norm = headers.map(h => String(h ?? '').trim().toLowerCase());
      const dataRows = values.filter(r => Array.isArray(r) && r.some(v => String(v ?? '').trim()));
      if (dataRows.length === 0) { showToast('No data rows found in the file.', 'error'); setImportLoading(false); return; }
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
      setExcelFile(null); setBulkPhotoMap(new Map()); setBulkImportOpen(false);
      showToast(`${saved} of ${records.length} records imported successfully.`, 'success');
    } catch {
      showToast('Failed to parse Excel file. Make sure it is a valid .xlsx file.', 'error');
    }
    setImportLoading(false);
  };

  const hasUnsaved = () => form.name.trim() || form.phone.trim() || form.parentage.trim() || !!photoPreview;

  return (
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

      {/* Saved Drafts */}
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
                    {draft.photo ? <img src={draft.photo} alt="" className="w-full h-full object-cover" /> : <FiCamera className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{draft.name || 'Unnamed'}</p>
                    <p className="text-[0.65rem] text-slate-400 font-medium">{formatISTDateTime(draft.updatedAt)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => loadDbDraft(draft)} className="px-2.5 py-1.5 rounded text-xs font-black text-violet-600 bg-violet-50 hover:bg-violet-500 hover:text-white border border-violet-100 transition">Load</button>
                    <button onClick={() => setDraftDeleteId(draft.id)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
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
              {!activeDraftId && hasUnsaved() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <FiSave className="w-3 h-3" /> Unsaved data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Fields marked * are required</p>
          </div>
          <div className="shrink-0 text-right bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
            <p className="text-[0.55rem] font-black uppercase tracking-widest text-violet-500">Total Students</p>
            <p className="text-xl font-black text-violet-700 leading-none">{submissionCount}</p>
          </div>
        </div>

        <form onSubmit={createStudent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Institution</span>
              <input value={user.college ?? ''} readOnly className="input-field bg-slate-50 text-slate-500 cursor-not-allowed text-sm" />
            </label>

            {/* Student Photograph */}
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
              {photoError && <p className="mt-1.5 text-xs font-bold text-rose-500">{photoError}</p>}
            </div>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Student Name *</span>
              <input value={form.name} onChange={e => handleFieldChange('name', e.target.value)} onBlur={() => handleFieldBlur('name')} placeholder="Full legal name" className={`input-field text-sm ${formErrors.name ? 'border-rose-400 focus:ring-rose-300' : touched.name && !formErrors.name && form.name ? 'border-emerald-400' : ''}`} />
              {formErrors.name ? <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.name}</p> : touched.name && form.name && <p className="mt-1 text-xs font-bold text-emerald-500">✓ Looks good</p>}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Father Name / Mother Name *</span>
              <input value={form.parentage} onChange={e => handleFieldChange('parentage', e.target.value)} onBlur={() => handleFieldBlur('parentage')} placeholder="Enter father's name or mother's name" className={`input-field text-sm ${formErrors.parentage ? 'border-rose-400 focus:ring-rose-300' : touched.parentage && !formErrors.parentage && form.parentage ? 'border-emerald-400' : ''}`} />
              {formErrors.parentage ? <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.parentage}</p> : touched.parentage && form.parentage && <p className="mt-1 text-xs font-bold text-emerald-500">✓ Looks good</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Contact Number *</span>
              <input type="tel" value={form.phone} onChange={e => handleFieldChange('phone', e.target.value)} onBlur={() => handleFieldBlur('phone')} placeholder="10-digit number" className={`input-field text-sm ${formErrors.phone ? 'border-rose-400 focus:ring-rose-300' : touched.phone && !formErrors.phone && form.phone ? 'border-emerald-400' : ''}`} />
              {formErrors.phone ? <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.phone}</p> : touched.phone && form.phone && <p className="mt-1 text-xs font-bold text-emerald-500">✓ Valid number</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Roll No. <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <input value={form.rollNo} onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} placeholder="e.g. 42" className="input-field text-sm" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Admission Number <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <input value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="e.g. ADM-2024-001" className="input-field text-sm" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Class / Section <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <input value={form.studentClass} onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))} placeholder="e.g. 10-A / B.Tech 3rd" className="input-field text-sm" />
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
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Date of Birth <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <input type="date" value={form.dob} onChange={e => handleFieldChange('dob', e.target.value)} onBlur={() => handleFieldBlur('dob')} className={`input-field text-sm ${formErrors.dob ? 'border-rose-400 focus:ring-rose-300' : ''}`} />
              {formErrors.dob && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.dob}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Percentage % <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <div className="relative">
                <input type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={e => handleFieldChange('percentage', e.target.value)} onBlur={() => handleFieldBlur('percentage')} placeholder="e.g. 85.5" className={`input-field text-sm pr-8 ${formErrors.percentage ? 'border-rose-400 focus:ring-rose-300' : touched.percentage && !formErrors.percentage && form.percentage ? 'border-emerald-400' : ''}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">%</span>
              </div>
              {formErrors.percentage && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.percentage}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Blood Group <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <input value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} placeholder="e.g. O+" className="input-field text-sm" />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Address <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" rows={2} className="input-field text-sm resize-none" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Email ID <span className="normal-case tracking-normal font-medium text-slate-300">(optional)</span></span>
              <input type="email" value={form.email} onChange={e => handleFieldChange('email', e.target.value)} onBlur={() => handleFieldBlur('email')} placeholder="student@email.com" className={`input-field text-sm ${formErrors.email ? 'border-rose-400 focus:ring-rose-300' : touched.email && !formErrors.email && form.email ? 'border-emerald-400' : ''}`} />
              {formErrors.email && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.email}</p>}
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

      {/* Crop Modal */}
      {cropSource && (
        <CropModal
          src={cropSource}
          onConfirm={cropped => { setPhotoPreview(cropped); setCropSource(null); }}
          onCancel={() => setCropSource(null)}
        />
      )}

      {/* Bulk Import Modal */}
      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-black text-slate-900">Bulk Import</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Import multiple students from an Excel sheet</p>
              </div>
              <button onClick={() => { setBulkImportOpen(false); setExcelFile(null); setBulkPhotoMap(new Map()); }} disabled={importLoading} className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-30 disabled:pointer-events-none">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 1 — Download template</p>
                <p className="text-xs text-slate-500 font-medium">Required columns: <span className="font-black text-slate-700">Name, Parentage, Phone</span>. All others are optional.</p>
                <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-600 font-black py-2.5 rounded-lg hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600 transition text-sm">
                  <FiDownload className="w-4 h-4" /> Download Excel Template
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Step 2 — Upload your sheet</p>
                <div className="relative group">
                  <input type="file" accept=".xlsx,.xls" onChange={e => setExcelFile(e.target.files?.[0] ?? null)} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" disabled={importLoading} />
                  <div className={`p-6 rounded-lg border-2 border-dashed transition text-center space-y-2 ${excelFile ? 'border-violet-400 bg-violet-50' : 'border-slate-200 group-hover:border-violet-400 bg-slate-50/50'}`}>
                    <FiUpload className={`w-6 h-6 mx-auto transition ${excelFile ? 'text-violet-500' : 'text-slate-300 group-hover:text-violet-400'}`} />
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
                  <div className={`p-5 rounded-lg border-2 border-dashed transition text-center space-y-2 ${bulkPhotoMap.size > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 group-hover:border-violet-400 bg-slate-50/50'}`}>
                    <FiCamera className={`w-5 h-5 mx-auto transition ${bulkPhotoMap.size > 0 ? 'text-emerald-500' : 'text-slate-300 group-hover:text-violet-400'}`} />
                    <p className="text-sm font-bold text-slate-600">{bulkPhotoMap.size > 0 ? `${bulkPhotoMap.size} photo${bulkPhotoMap.size !== 1 ? 's' : ''} selected` : 'Select student photos'}</p>
                  </div>
                </div>
                {bulkPhotoMap.size > 0 && <button onClick={() => setBulkPhotoMap(new Map())} className="text-xs text-rose-500 hover:text-rose-700 font-bold transition">Clear photos</button>}
              </div>
              <p className="text-xs text-slate-400 font-medium px-1">
                The college will be set automatically to <span className="font-black text-slate-600">{user.college}</span>.
              </p>
            </div>
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
              <button onClick={() => { setBulkImportOpen(false); setExcelFile(null); setBulkPhotoMap(new Map()); }} disabled={importLoading} className="px-5 py-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:pointer-events-none">
                Cancel
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
              <div className="flex items-center gap-4 p-4 bg-violet-50 rounded-lg border border-violet-100">
                <div className="w-16 h-16 rounded-lg border-2 border-violet-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {confirmStudent.photo ? <img src={confirmStudent.photo} alt="Photo" className="w-full h-full object-cover" /> : <FiCamera className="w-6 h-6 text-slate-300" />}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-base leading-tight truncate">{confirmStudent.name}</p>
                  {confirmStudent.parentage && <p className="text-xs text-slate-500 font-medium mt-0.5">{confirmStudent.parentage}</p>}
                  <p className="text-xs text-violet-600 font-bold mt-1">{confirmStudent.college}</p>
                </div>
              </div>
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
              {!confirmStudent.photo && <p className="text-xs text-slate-400 font-medium text-center">No photo attached — student will be registered without a photo.</p>}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
              <button onClick={confirmAndSubmit} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-violet-500 text-white font-black py-3 rounded-lg hover:bg-violet-600 transition shadow-sm active:scale-95 text-sm disabled:opacity-60">
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

      {/* Draft delete confirmation */}
      {draftDeleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Delete Draft?</h3>
              <p className="text-xs text-slate-500 mt-1">This draft will be permanently deleted and cannot be recovered.</p>
            </div>
            <div className="p-4 flex gap-2">
              <button onClick={async () => { await deleteDbDraft(draftDeleteId); setDraftDeleteId(null); }} className="flex-1 bg-rose-500 text-white font-black py-2.5 rounded-lg hover:bg-rose-600 transition text-sm active:scale-95">Delete</button>
              <button onClick={() => setDraftDeleteId(null)} className="flex-1 border border-slate-200 text-slate-600 font-black py-2.5 rounded-lg hover:bg-slate-50 transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
