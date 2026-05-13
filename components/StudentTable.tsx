'use client';

import { useState, useMemo } from 'react';
import { StudentRecord } from '@/lib/types';
import { FiSearch, FiChevronLeft, FiChevronRight, FiTrash2, FiMapPin, FiXCircle, FiEdit2 } from 'react-icons/fi';
import StudentDetailsModal from './StudentDetailsModal';
import ConfirmDialog from './ConfirmDialog';

interface StudentTableProps {
  students: StudentRecord[];
  onDelete?: (id: string) => void;
  onEdit?: (student: StudentRecord) => void;
  colleges?: string[];
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export default function StudentTable({ students, onDelete, onEdit, colleges: collegesProp }: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [filterCollege, setFilterCollege] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const uniqueColleges = useMemo(() =>
    collegesProp && collegesProp.length > 0
      ? collegesProp
      : Array.from(new Set(students.map(s => s.college))),
    [students, collegesProp]
  );
  const showCollegeFilter = uniqueColleges.length > 1;

  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return students.filter((s) => {
      const matchesSearch = !q || [
        s.name, s.studentId, s.college, s.parentage, s.rollNo,
        s.studentClass, s.course, s.year, s.email, s.phone,
        s.busStop, s.bloodGroup, s.createdBy,
      ].some(v => v?.toLowerCase().includes(q));
      const matchesCollege = !filterCollege || s.college === filterCollege;
      return matchesSearch && matchesCollege;
    });
  }, [students, searchTerm, filterCollege]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, safePage, itemsPerPage]);

  const resetFilters = () => { setFilterCollege(null); setSearchTerm(''); setCurrentPage(1); };
  const hasActiveFilters = filterCollege || searchTerm;
  const pageNumbers = getPageNumbers(safePage, totalPages);

  const Th = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-3 text-left text-[0.6rem] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap bg-slate-50 ${className}`}>
      {children}
    </th>
  );

  const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-3 py-3 align-top ${className}`}>
      {children}
    </td>
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">

      {/* ── Institute filter ── */}
      {showCollegeFilter && (
        <div className="sm:w-44 sm:shrink-0">
          <p className="hidden sm:flex items-center gap-1.5 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-3">
            <FiMapPin className="w-3 h-3" /> Institute
          </p>

          {/* Mobile chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
            {uniqueColleges.map(college => (
              <button
                key={college}
                onClick={() => { setFilterCollege(prev => prev === college ? null : college); setCurrentPage(1); }}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${filterCollege === college ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {college}
              </button>
            ))}
          </div>

          {/* Desktop list */}
          <div className="hidden sm:flex flex-col gap-1">
            {uniqueColleges.map(college => (
              <button
                key={college}
                onClick={() => { setFilterCollege(prev => prev === college ? null : college); setCurrentPage(1); }}
                className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-all leading-snug ${filterCollege === college ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {college}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="mt-2 sm:mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black text-xs hover:bg-rose-100 transition">
              <FiXCircle className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Table area ── */}
      <div className="flex-1 space-y-3 min-w-0">

        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search name, ID, college, phone…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded border border-slate-200 focus:border-slate-400 focus:outline-none transition bg-white shadow-sm font-medium text-sm"
            />
          </div>
          {hasActiveFilters && !showCollegeFilter && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black text-xs hover:bg-rose-100 transition shrink-0">
              <FiXCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0 text-left text-sm text-slate-900" style={{ minWidth: '1400px' }}>
              <thead>
                <tr>
                  <Th className="sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">#</Th>
                  <Th>Photo</Th>
                  <Th>Photo ID</Th>
                  <Th>Name</Th>
                  <Th>Parentage</Th>
                  <Th>Contact</Th>
                  <Th>Roll No.</Th>
                  <Th>Reg. ID</Th>
                  <Th>Class</Th>
                  <Th>Course</Th>
                  <Th>Year</Th>
                  <Th>Blood Group</Th>
                  <Th>Email</Th>
                  <Th>Bus Stop</Th>
                  <Th>College</Th>
                  <Th>Added By</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((s, idx) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="hover:bg-blue-50/40 transition cursor-pointer group"
                  >
                    {/* # */}
                    <Td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      <span className="text-xs font-black text-slate-400">
                        {(safePage - 1) * itemsPerPage + idx + 1}
                      </span>
                    </Td>

                    {/* Photo */}
                    <Td>
                      <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {s.photo ? (
                          <img src={s.photo} alt={s.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[0.45rem] text-slate-400 font-black uppercase">No Img</div>
                        )}
                      </div>
                    </Td>

                    {/* Photo ID */}
                    <Td>
                      {s.photoId
                        ? <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-black border border-blue-100">{s.photoId}.png</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </Td>

                    {/* Name */}
                    <Td>
                      <p className="font-black text-slate-900 whitespace-nowrap">{s.name}</p>
                    </Td>

                    {/* Parentage */}
                    <Td>
                      <p className="text-slate-600 font-medium whitespace-nowrap">{s.parentage || <span className="text-slate-300">—</span>}</p>
                    </Td>

                    {/* Contact */}
                    <Td>
                      <p className="font-bold text-slate-700 whitespace-nowrap">{s.phone}</p>
                    </Td>

                    {/* Roll No. */}
                    <Td>
                      <p className="text-slate-600 font-medium whitespace-nowrap">{s.rollNo || <span className="text-slate-300">—</span>}</p>
                    </Td>

                    {/* Reg. ID */}
                    <Td>
                      <p className="text-cyan-600 font-black text-xs tracking-widest whitespace-nowrap">{s.studentId || <span className="text-slate-300 tracking-normal">—</span>}</p>
                    </Td>

                    {/* Class */}
                    <Td>
                      <p className="text-slate-600 font-medium whitespace-nowrap">{s.studentClass || <span className="text-slate-300">—</span>}</p>
                    </Td>

                    {/* Course */}
                    <Td>
                      <p className="text-slate-700 font-bold whitespace-nowrap">{s.course || <span className="text-slate-300 font-medium">—</span>}</p>
                    </Td>

                    {/* Year */}
                    <Td>
                      <p className="text-slate-600 font-medium whitespace-nowrap">{s.year || <span className="text-slate-300">—</span>}</p>
                    </Td>

                    {/* Blood Group */}
                    <Td>
                      {s.bloodGroup
                        ? <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-xs font-black border border-rose-100">{s.bloodGroup}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </Td>

                    {/* Email */}
                    <Td>
                      <p className="text-slate-600 font-medium whitespace-nowrap">{s.email || <span className="text-slate-300">—</span>}</p>
                    </Td>

                    {/* Bus Stop */}
                    <Td>
                      <p className="text-slate-600 font-medium whitespace-nowrap">{s.busStop || <span className="text-slate-300">—</span>}</p>
                    </Td>

                    {/* College */}
                    <Td>
                      <p className="text-slate-500 font-bold text-xs whitespace-nowrap">{s.college}</p>
                    </Td>

                    {/* Added By */}
                    <Td>
                      <p className="text-slate-500 font-medium text-xs whitespace-nowrap">{s.createdBy || '—'}</p>
                    </Td>

                    {/* Date */}
                    <Td>
                      <p className="text-slate-400 font-medium text-xs whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </Td>

                    {/* Actions */}
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {onEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                            className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                            title="Edit"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(s.id); }}
                            className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                            title="Delete"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={18} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-xl">🔍</div>
                        <div>
                          <p className="text-base font-black text-slate-900">No matches found</p>
                          <p className="text-sm text-slate-500 font-medium mt-0.5">Try adjusting your filters or search.</p>
                        </div>
                        <button onClick={resetFilters} className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-black transition">
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="bg-slate-50/50 px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded text-xs font-black px-2 py-1 outline-none focus:border-slate-400 transition cursor-pointer"
                >
                  {[5, 10, 25, 50].map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                <span className="text-slate-900 font-black">
                  {filteredStudents.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, filteredStudents.length)}
                </span>{' '}
                of <span className="text-slate-900 font-black">{filteredStudents.length}</span>
              </p>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                >
                  <FiChevronLeft className="w-3.5 h-3.5" />
                </button>

                {pageNumbers.map((page, idx) =>
                  page === '...'
                    ? <span key={`dot-${idx}`} className="w-7 h-7 flex items-center justify-center text-slate-400 text-xs select-none">·</span>
                    : <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${safePage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        {page}
                      </button>
                )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                >
                  <FiChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <StudentDetailsModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete Student"
        message="The student record will be soft-deleted. You can restore it later from the Deleted Students section."
        onConfirm={() => { if (pendingDeleteId) onDelete?.(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
