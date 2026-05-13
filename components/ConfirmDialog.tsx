'use client';

import { FiAlertTriangle } from 'react-icons/fi';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full max-w-sm p-5 sm:p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded bg-rose-50 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1 leading-snug">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white font-black py-2.5 rounded hover:bg-rose-600 transition active:scale-95 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />}
            {loading ? 'Deleting…' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-slate-200 text-slate-700 font-black py-2.5 rounded hover:bg-slate-50 transition text-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
