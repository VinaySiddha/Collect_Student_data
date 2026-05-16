'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FiMapPin, FiPlus, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight,
  FiRotateCcw, FiChevronDown, FiX,
} from 'react-icons/fi';
import { getDeletedColleges, restoreCollegeFromDb } from '@/lib/actions';
import TableSkeleton from '@/components/TableSkeleton';
import { useEffect } from 'react';

export default function AdminInstitutesPage() {
  const { user, dataLoaded, colleges, students, addCollege, removeCollege, refreshColleges } = useAuth();

  const [newCollege,          setNewCollege]          = useState('');
  const [message,             setMessage]             = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [instituteFormOpen,   setInstituteFormOpen]   = useState(false);
  const [collegeSearch,       setCollegeSearch]       = useState('');
  const [collegePage,         setCollegePage]         = useState(1);
  const [collegeRowsPerPage,  setCollegeRowsPerPage]  = useState(10);
  const [deletedColleges,     setDeletedColleges]     = useState<{ name: string; deletedBy: string | null }[]>([]);
  const [showDeletedColleges, setShowDeletedColleges] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    getDeletedColleges().then(setDeletedColleges).catch(() => {});
  }, [user?.email]);

  const studentCountByCollege = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.college] = (acc[s.college] || 0) + 1;
    return acc;
  }, {});

  const filteredColleges  = colleges.filter(c => c.toLowerCase().includes(collegeSearch.toLowerCase()));
  const totalCollegePages = Math.max(1, Math.ceil(filteredColleges.length / collegeRowsPerPage));
  const safeCollegePage   = Math.min(collegePage, totalCollegePages);
  const paginatedColleges = filteredColleges.slice((safeCollegePage - 1) * collegeRowsPerPage, safeCollegePage * collegeRowsPerPage);

  const handleAddCollege = async () => {
    const result = await addCollege(newCollege);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) { setNewCollege(''); setTimeout(() => setMessage(null), 3000); }
  };

  const handleRemoveCollege = (college: string) => {
    setConfirmDialog({
      title: 'Remove Institute',
      message: `"${college}" will be soft-deleted. It can be restored later and its name can be reused.`,
      onConfirm: async () => {
        const result = await removeCollege(college);
        setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
        if (result.success) {
          const deletedBy = user?.name || user?.email || null;
          setDeletedColleges(prev => [...prev, { name: college, deletedBy }].sort((a, b) => a.name.localeCompare(b.name)));
          setTimeout(() => setMessage(null), 3000);
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleRestoreCollege = async (name: string) => {
    const result = await restoreCollegeFromDb(name);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setDeletedColleges(prev => prev.filter(c => c.name !== name));
      await refreshColleges();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Institutes</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Manage authorized colleges and institutions</p>
        </div>
        <button
          onClick={() => { setInstituteFormOpen(o => !o); setNewCollege(''); setMessage(null); }}
          className={`flex items-center gap-2 font-black px-4 py-2.5 rounded transition shadow-sm active:scale-95 text-sm shrink-0 ${instituteFormOpen ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-green-700'}`}
        >
          {instituteFormOpen ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
          <span className="hidden sm:inline">{instituteFormOpen ? 'Close' : 'Add Institute'}</span>
          <span className="sm:hidden">{instituteFormOpen ? 'Close' : 'New'}</span>
        </button>
      </div>

      {/* Add form */}
      {instituteFormOpen && (
        <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-slate-900 p-2.5 rounded text-white shrink-0"><FiMapPin className="w-4 h-4" /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">Add New Institute</h2>
              <p className="text-slate-500 font-medium text-xs mt-0.5">Expand the institutional network</p>
            </div>
          </div>
          <div className="flex gap-2 max-w-lg">
            <input
              type="text"
              value={newCollege}
              onChange={e => setNewCollege(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCollege()}
              placeholder="Official Institution Name"
              className="input-field text-sm flex-1"
              autoFocus
            />
            <button onClick={handleAddCollege} className="bg-slate-900 text-white font-black px-5 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 flex items-center gap-2 text-sm shrink-0">
              <FiPlus className="w-4 h-4" /> Add
            </button>
          </div>
          {message && (
            <p className={`mt-3 text-sm font-bold p-3 rounded max-w-lg ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{message.text}</p>
          )}
        </div>
      )}

      {/* Registry table */}
      {!dataLoaded ? (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="space-y-1.5"><div className="h-3 bg-slate-200 rounded w-32" /><div className="h-2.5 bg-slate-100 rounded w-20" /></div>
            <div className="h-8 bg-slate-100 rounded w-48" />
          </div>
          <TableSkeleton rows={6} cols={4} />
        </div>
      ) : (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Institute Registry</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{colleges.length} total · {filteredColleges.length} shown</p>
            </div>
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search institutes…"
                value={collegeSearch}
                onChange={e => { setCollegeSearch(e.target.value); setCollegePage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400 transition bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-4 lg:px-6 py-3.5 text-left w-12">#</th>
                  <th className="px-4 lg:px-6 py-3.5 text-left">Institute Name</th>
                  <th className="px-4 lg:px-6 py-3.5 text-left hidden sm:table-cell">Students</th>
                  <th className="px-4 lg:px-6 py-3.5 text-left hidden md:table-cell">Status</th>
                  <th className="px-4 lg:px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedColleges.map((college, idx) => (
                  <tr key={college} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 lg:px-6 py-4"><span className="text-xs font-black text-slate-400">{(safeCollegePage - 1) * collegeRowsPerPage + idx + 1}</span></td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center shrink-0"><FiMapPin className="w-3.5 h-3.5 text-green-600" /></div>
                        <p className="font-black text-slate-900 text-sm">{college}</p>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm font-bold text-slate-700">{studentCountByCollege[college] ?? 0}<span className="text-slate-400 font-medium ml-1">student{(studentCountByCollege[college] ?? 0) !== 1 ? 's' : ''}</span></span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-[0.65rem] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-100">Authorized</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <button onClick={() => handleRemoveCollege(college)} className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition ml-auto" title="Remove institute">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredColleges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-xl">🏫</div>
                        <div>
                          <p className="text-base font-black text-slate-900">{collegeSearch ? 'No matches found' : 'No institutes registered yet'}</p>
                          <p className="text-sm text-slate-500 font-medium mt-0.5">{collegeSearch ? 'Try a different search term.' : 'Add the first institution above.'}</p>
                        </div>
                        {collegeSearch && <button onClick={() => setCollegeSearch('')} className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-black transition">Clear Search</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-50/50 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                <select value={collegeRowsPerPage} onChange={e => { setCollegeRowsPerPage(Number(e.target.value)); setCollegePage(1); }} className="bg-white border border-slate-200 rounded text-xs font-black px-2 py-1 outline-none focus:border-slate-400 transition cursor-pointer">
                  {[5, 10, 25].map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                <span className="text-slate-900 font-black">{filteredColleges.length === 0 ? 0 : (safeCollegePage - 1) * collegeRowsPerPage + 1}–{Math.min(safeCollegePage * collegeRowsPerPage, filteredColleges.length)}</span>
                {' '}of <span className="text-slate-900 font-black">{filteredColleges.length}</span>
              </p>
            </div>
            {totalCollegePages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCollegePage(p => Math.max(1, p - 1))} disabled={safeCollegePage === 1} className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all">
                  <FiChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalCollegePages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCollegePage(page)} className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${safeCollegePage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{page}</button>
                ))}
                <button onClick={() => setCollegePage(p => Math.min(totalCollegePages, p + 1))} disabled={safeCollegePage === totalCollegePages} className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all">
                  <FiChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Institutes */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <button onClick={() => setShowDeletedColleges(v => !v)} className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition text-left">
          <span className="flex items-center gap-2 text-sm font-black text-slate-500">
            <FiRotateCcw className="w-4 h-4" />
            Deleted Institutes
            {deletedColleges.length > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[0.65rem] font-black">{deletedColleges.length}</span>}
          </span>
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDeletedColleges ? 'rotate-180' : ''}`} />
        </button>
        {showDeletedColleges && (
          <div className="border-t border-slate-100">
            {deletedColleges.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400 font-bold">No deleted institutes.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {deletedColleges.map(({ name, deletedBy: who }) => (
                  <div key={name} className="flex items-center justify-between px-4 lg:px-6 py-3 bg-rose-50/20">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-rose-50 flex items-center justify-center shrink-0"><FiMapPin className="w-3.5 h-3.5 text-rose-400" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-400">{name}</p>
                        {who && <p className="text-[0.6rem] text-slate-300 font-medium mt-0.5">by {who}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleRestoreCollege(name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition">
                      <FiRotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                ))}
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

      {message && !instituteFormOpen && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 font-black text-sm border-2 max-w-[calc(100vw-2rem)] ${message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'}`}>
          <span className="shrink-0">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="truncate">{message.text}</span>
        </div>
      )}
    </div>
  );
}
