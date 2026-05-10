'use client';

import { useState, useMemo } from 'react';
import { StudentRecord } from '@/lib/types';
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye, FiTrash2, FiFilter, FiCalendar, FiBook, FiMapPin, FiXCircle } from 'react-icons/fi';
import StudentDetailsModal from './StudentDetailsModal';

interface StudentTableProps {
  students: StudentRecord[];
  onDelete?: (id: string) => void;
}

export default function StudentTable({ students, onDelete }: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showFilters, setShowFilters] = useState(false);

  const [filterCollege, setFilterCollege] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const uniqueColleges = useMemo(() => ['All', ...Array.from(new Set(students.map(s => s.college)))], [students]);
  const uniqueCourses = useMemo(() => ['All', ...Array.from(new Set(students.map(s => s.course)))], [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.college.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCollege = filterCollege === 'All' || student.college === filterCollege;
      const matchesCourse = filterCourse === 'All' || student.course === filterCourse;
      const studentDate = new Date(student.createdAt);
      const matchesStartDate = !startDate || studentDate >= new Date(startDate);
      const matchesEndDate = !endDate || studentDate <= new Date(endDate + 'T23:59:59');
      return matchesSearch && matchesCollege && matchesCourse && matchesStartDate && matchesEndDate;
    });
  }, [students, searchTerm, filterCollege, filterCourse, startDate, endDate]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const resetFilters = () => {
    setFilterCollege('All');
    setFilterCourse('All');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const hasActiveFilters = filterCollege !== 'All' || filterCourse !== 'All' || startDate || endDate || searchTerm;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 sm:h-5 sm:w-5" />
          <input
            type="text"
            placeholder="Search by name, ID or college..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-9 sm:pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] border border-slate-200 focus:border-green-400 focus:outline-none transition bg-white shadow-sm font-medium text-sm"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm border transition shadow-sm ${
              showFilters || filterCollege !== 'All' || filterCourse !== 'All' || startDate || endDate
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FiFilter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{showFilters ? 'Hide' : 'Filters'}</span>
            <span className="xs:hidden">Filter</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] bg-rose-50 text-rose-600 border border-rose-100 font-black text-xs sm:text-sm hover:bg-rose-100 transition shadow-sm"
            >
              <FiXCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-4 sm:p-8 bg-slate-50 rounded-xl sm:rounded-[2rem] border border-slate-200/60">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FiMapPin className="w-3 h-3" /> Institution
            </label>
            <select
              value={filterCollege}
              onChange={(e) => { setFilterCollege(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-bold text-slate-700 focus:border-green-400 outline-none transition"
            >
              {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FiBook className="w-3 h-3" /> Course / Degree
            </label>
            <select
              value={filterCourse}
              onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-bold text-slate-700 focus:border-green-400 outline-none transition"
            >
              {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FiCalendar className="w-3 h-3" /> Registered From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-bold text-slate-700 focus:border-green-400 outline-none transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FiCalendar className="w-3 h-3" /> Registered Until
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-bold text-slate-700 focus:border-green-400 outline-none transition"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl sm:rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/30">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-900">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-[0.15em] text-[0.6rem] sm:text-[0.65rem]">
              <tr>
                <th className="px-4 sm:px-8 py-4 sm:py-6 w-20 sm:w-24">Actions</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6">Student Info</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 hidden md:table-cell">Academic Path</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 hidden lg:table-cell">Registration Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition duration-300 group">
                  <td className="px-4 sm:px-8 py-3 sm:py-6">
                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-all shadow-sm active:scale-95"
                        title="View Details"
                      >
                        <FiEye className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(student.id)}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Delete Record"
                        >
                          <FiTrash2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-3 sm:py-6">
                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-xl sm:rounded-[1.25rem] bg-slate-100 border border-slate-200 shrink-0 shadow-sm">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="h-full w-full object-cover group-hover:scale-110 transition duration-500" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[0.5rem] text-slate-400 font-black uppercase">No Img</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm sm:text-base lg:text-lg tracking-tight leading-tight truncate">{student.name}</p>
                        <p className="text-[0.65rem] text-cyan-600 font-black tracking-widest uppercase mt-0.5 sm:mt-1">ID: {student.studentId}</p>
                        {/* Show course on mobile since that column is hidden */}
                        <p className="text-[0.65rem] text-slate-500 font-bold mt-0.5 md:hidden truncate">{student.course}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-3 sm:py-6 hidden md:table-cell">
                    <p className="font-bold text-slate-700 text-sm sm:text-base">{student.course}</p>
                    <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[180px]">{student.college} • Yr {student.year}</p>
                  </td>
                  <td className="px-4 sm:px-8 py-3 sm:py-6 hidden lg:table-cell">
                    <p className="text-slate-600 font-bold text-sm truncate max-w-[200px]">{student.email}</p>
                    <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      Joined {new Date(student.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 sm:px-8 py-16 sm:py-32 text-center">
                    <div className="flex flex-col items-center gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center text-2xl sm:text-3xl">🔍</div>
                      <div>
                        <p className="text-lg sm:text-xl font-black text-slate-900">No matches found.</p>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Try adjusting your filters or search keywords.</p>
                      </div>
                      <button onClick={resetFilters} className="mt-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-900 text-white rounded-lg sm:rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition shadow-lg">Clear All Filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50/50 px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="bg-white border border-slate-200 rounded-lg sm:rounded-xl text-xs font-black px-2 sm:px-3 py-1.5 sm:py-2 outline-none focus:border-green-400 transition shadow-sm cursor-pointer"
              >
                {[5, 10, 25, 50].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
            <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
              <span className="text-slate-900 font-black">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)}-{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="text-slate-900 font-black">{filteredStudents.length}</span>
            </p>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all shadow-sm"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 sm:gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                  .map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-[0.65rem] font-black transition-all duration-300 ${
                        currentPage === page
                          ? 'bg-slate-900 text-white shadow-xl scale-110'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all shadow-sm"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <StudentDetailsModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
