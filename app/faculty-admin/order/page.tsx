'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { saveCollegeAssets, getCollegeAssets } from '@/lib/actions';
import {
  FiUpload, FiX, FiSave, FiImage, FiEdit3, FiCheckCircle, FiUsers, FiAlertTriangle,
} from 'react-icons/fi';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

interface AssetSlot {
  current: string | null;   // saved value from DB
  preview: string | null;   // local preview (new pick, not yet saved)
  changed: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
}

function UploadZone({
  label,
  hint,
  icon: Icon,
  slot,
  accept,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  icon: React.ElementType;
  slot: AssetSlot;
  accept: string;
  onFile: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sizeErr,  setSizeErr]  = useState('');

  const displayed = slot.preview ?? slot.current;

  async function handle(file: File) {
    setSizeErr('');
    if (!file.type.startsWith('image/')) { setSizeErr('Please select an image file.'); return; }
    if (file.size > MAX_BYTES) { setSizeErr('Image must be under 3 MB.'); return; }
    const url = await readFileAsDataUrl(file);
    onFile(url);
  }

  return (
    <div className="bg-white rounded border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">{label}</p>
          <p className="text-[0.65rem] text-slate-400 font-medium">{hint}</p>
        </div>
        {slot.changed && (
          <span className="ml-auto text-[0.6rem] font-black uppercase tracking-widest text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            Unsaved
          </span>
        )}
      </div>

      {displayed ? (
        <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center min-h-[160px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayed}
            alt={label}
            className="max-h-48 max-w-full object-contain p-3"
          />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white border border-slate-200 shadow-sm text-[0.65rem] font-black text-slate-600 hover:bg-slate-50 transition"
            >
              <FiUpload className="w-3 h-3" /> Replace
            </button>
            <button
              type="button"
              onClick={() => { setSizeErr(''); onClear(); }}
              className="p-1.5 rounded bg-white border border-rose-100 shadow-sm text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Remove"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handle(file);
          }}
          className={`flex flex-col items-center justify-center gap-3 min-h-[160px] rounded-lg border-2 border-dashed transition-all cursor-pointer ${
            dragging ? 'border-violet-400 bg-violet-50/60' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <FiUpload className={`w-4 h-4 transition-colors ${dragging ? 'text-violet-500' : 'text-slate-400'}`} />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-600">Click or drag & drop</p>
            <p className="text-[0.65rem] text-slate-400 mt-0.5">PNG, JPG, SVG · Max 3 MB</p>
          </div>
        </button>
      )}

      {sizeErr && (
        <p className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded px-3 py-2">{sizeErr}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handle(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function OrderSetupPage() {
  const { user }      = useAuth();
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const isRequired    = searchParams.get('required') === '1';

  const [logo,         setLogo]         = useState<AssetSlot>({ current: null, preview: null, changed: false });
  const [sig,          setSig]          = useState<AssetSlot>({ current: null, preview: null, changed: false });
  const [studentCount, setStudentCount] = useState<number | ''>('');
  const [countSaved,   setCountSaved]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user?.college) return;
    getCollegeAssets(user.college).then(assets => {
      setLogo({ current: assets.logo,      preview: null, changed: false });
      setSig ({ current: assets.signature, preview: null, changed: false });
      setCountSaved(assets.studentCount);
      setStudentCount(assets.studentCount ?? '');
      setLoading(false);
    });
  }, [user?.college]);

  if (!user) return null;

  function showToast(text: string, type: 'success' | 'error') {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }

  const countChanged = studentCount !== '' && Number(studentCount) !== (countSaved ?? 0)
    || (studentCount === '' && countSaved !== null);

  async function handleSave() {
    if (!logo.changed && !sig.changed && !countChanged) { showToast('No changes to save.', 'error'); return; }
    setSaving(true);

    const result = await saveCollegeAssets({
      college:      user!.college!,
      logo:         logo.changed   ? (logo.preview ?? null) : undefined,
      signature:    sig.changed    ? (sig.preview  ?? null) : undefined,
      studentCount: countChanged   ? (studentCount !== '' ? Number(studentCount) : null) : undefined,
      updatedBy:    user!.name || user!.email,
    });

    setSaving(false);
    if (result.success) {
      setLogo(p => ({ current: p.preview ?? p.current, preview: null, changed: false }));
      setSig (p => ({ current: p.preview ?? p.current, preview: null, changed: false }));
      const saved = studentCount !== '' ? Number(studentCount) : null;
      setCountSaved(saved);
      showToast('Assets saved successfully.', 'success');
      // If this was a required-first visit and setup is now complete, go to dashboard
      if (isRequired) {
        const newLogo  = logo.preview ?? logo.current;
        const newSig   = sig.preview  ?? sig.current;
        const newCount = studentCount !== '' ? Number(studentCount) : null;
        if (newLogo && newSig && newCount) {
          setTimeout(() => router.push('/faculty-admin/dashboard'), 1200);
        }
      }
    } else {
      showToast(result.message, 'error');
    }
  }

  const anyChanged = logo.changed || sig.changed || countChanged;

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Order Setup</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Pre-registration assets for ID card production · {user.college}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !anyChanged}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded font-black text-sm hover:bg-violet-600 transition shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiSave className="w-4 h-4 shrink-0" />
          {saving ? 'Saving…' : 'Save Assets'}
        </button>
      </div>

      {/* Required-first banner */}
      {isRequired && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start gap-3">
          <FiAlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black text-amber-800">Complete Order Setup to continue</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">
              Please upload the school logo, principal signature, and enter the student strength before accessing other sections.
            </p>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-violet-50 border border-violet-100 rounded p-4 flex items-start gap-3">
        <FiCheckCircle className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-violet-700 leading-relaxed">
          Upload your institution's logo and principal signature, and enter the total student strength below. These details are used during ID card production to plan and brand each order.
        </p>
      </div>

      {/* Student strength */}
      <div className="bg-white rounded border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <FiUsers className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800">Total Student Strength</p>
            <p className="text-[0.65rem] text-slate-400 font-medium">Number of students for this order cycle</p>
          </div>
          {countChanged && (
            <span className="text-[0.6rem] font-black uppercase tracking-widest text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full shrink-0">
              Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <FiUsers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            <input
              type="number"
              min="1"
              max="99999"
              value={studentCount}
              onChange={e => setStudentCount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="e.g. 250"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-slate-900 text-sm placeholder-slate-300 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 transition font-black"
            />
          </div>
          {countSaved !== null && !countChanged && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
              Saved: {countSaved.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-white rounded border border-slate-200 shadow-sm p-5 min-h-[280px] animate-pulse">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-2.5 w-40 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-40 bg-slate-50 rounded-lg border border-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <UploadZone
            label="School / College Logo"
            hint="Appears on the front of every ID card"
            icon={FiImage}
            slot={logo}
            accept="image/*"
            onFile={url => setLogo({ current: logo.current, preview: url, changed: true })}
            onClear={() => setLogo({ current: logo.current, preview: null, changed: logo.current !== null })}
          />
          <UploadZone
            label="Principal Signature"
            hint="Printed at the bottom of each ID card"
            icon={FiEdit3}
            slot={sig}
            accept="image/*"
            onFile={url => setSig({ current: sig.current, preview: url, changed: true })}
            onClear={() => setSig({ current: sig.current, preview: null, changed: sig.current !== null })}
          />
        </div>
      )}

      {/* Status summary card */}
      {!loading && (
        <div className="bg-white rounded border border-slate-200 shadow-sm p-4">
          <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-3">Order Summary</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'School Logo',         saved: !!(logo.current), changed: logo.changed,  value: null },
              { label: 'Principal Signature', saved: !!(sig.current),  changed: sig.changed,   value: null },
              { label: 'Student Strength',    saved: countSaved !== null, changed: countChanged, value: countSaved !== null ? countSaved.toLocaleString() : null },
            ].map(({ label, saved, changed, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded bg-slate-50 border border-slate-100">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${changed ? 'bg-amber-400' : saved ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-700 truncate">{label}</p>
                  <p className="text-[0.6rem] font-medium text-slate-400">
                    {changed ? 'Unsaved' : saved ? (value ?? 'Saved') : 'Not set'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
