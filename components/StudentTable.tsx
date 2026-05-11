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
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.college.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCollege = !filterCollege || student.college === filterCollege;
      return matchesSearch && matchesCollege;
    });
  }, [students, searchTerm, filterCollege]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const resetFilters = () => {
    setFilterCollege(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterCollege || searchTerm;
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">

      {/* ── Institute filter ── */}
      {showCollegeFilter && (
        <div className="sm:w-44 sm:shrink-0">
          {/* Desktop label */}
          <p className="hidden sm:flex items-center gap-1.5 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-3">
            <FiMapPin className="w-3 h-3" /> Institute
          </p>

          {/* Mobile: horizontal scrollable chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
            {uniqueColleges.map(college => (
              <button
                key={college}
                onClick={() => { setFilterCollege(prev => prev === college ? null : college); setCurrentPage(1); }}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap ${
                  filterCollege === college
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {college}
              </button>
            ))}
          </div>

          {/* Desktop: vertical list */}
          <div className="hidden sm:flex flex-col gap-1">
            {uniqueColleges.map(college => (
              <button
                key={college}
                onClick={() => { setFilterCollege(prev => prev === college ? null : college); setCurrentPage(1); }}
                className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-all leading-snug ${
                  filterCollege === college
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {college}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 sm:mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black text-xs hover:bg-rose-100 transition"
            >
              <FiXCircle className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Search + table + pagination ── */}
      <div className="flex-1 space-y-3 min-w-0">

        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search name, ID or college…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded border border-slate-200 focus:border-slate-400 focus:outline-none transition bg-white shadow-sm font-medium text-sm"
            />
          </div>
          {/* Inline clear on mobile when no college filter sidebar */}
          {hasActiveFilters && !showCollegeFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black text-xs hover:bg-rose-100 transition shrink-0"
            >
              <FiXCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-900">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-[0.12em] text-[0.6rem]">
                <tr>
                  <th className="px-3 sm:px-6 py-3.5">Student</th>
                  <th className="px-3 sm:px-6 py-3.5 hidden md:table-cell">Course</th>
                  <th className="px-3 sm:px-6 py-3.5 hidden lg:table-cell">Contact</th>
                  <th className="px-3 sm:px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="hover:bg-slate-50/60 transition cursor-pointer group"
                  >
                    {/* Student info */}
                    <td className="px-3 sm:px-6 py-3">
                      <div className="flex items-center gap-2.5 sm:gap-4">
                        <div className="h-9 w-9 sm:h-11 sm:w-11 overflow-hidden rounded bg-slate-100 border border-slate-200 shrink-0">
                          {student.photo ? (
                            <img src={student.photo} alt={student.name} className="h-full w-full object-cover group-hover:scale-110 transition duration-300" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[0.45rem] text-slate-400 font-black uppercase">No Img</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm leading-tight truncate max-w-[140px] sm:max-w-none">{student.name}</p>
                          <p className="text-[0.6rem] text-cyan-600 font-black tracking-widest uppercase mt-0.5">{student.studentId}</p>
                          <p className="text-[0.6rem] text-slate-500 font-bold mt-0.5 md:hidden truncate max-w-[140px]">{student.course}</p>
                        </div>
                      </div>
                    </td>

                    {/* Course + college */}
                    <td className="px-3 sm:px-6 py-3 hidden md:table-cell">
                      <p className="font-bold text-slate-700 text-sm">{student.course}</p>
                      <p className="text-[0.6rem] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[160px]">
                        {student.college} · Yr {student.year}
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="px-3 sm:px-6 py-3 hidden lg:table-cell">
                      <p className="text-slate-600 font-bold text-sm truncate max-w-[180px]">{student.email}</p>
                      <p className="text-[0.6rem] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-emerald-500 shrink-0" />
                        {new Date(student.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="px-3 sm:px-6 py-3">
                      <div className="flex justify-end gap-1.5">
                        {onEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(student); }}
                            className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                            title="Edit"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(student.id); }}
                            className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                            title="Delete"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
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
                  {filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                </span>{' '}
                of <span className="text-slate-900 font-black">{filteredStudents.length}</span>
              </p>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
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
                        className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${
                          currentPage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
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
