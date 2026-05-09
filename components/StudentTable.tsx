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

  // Advanced Filter States
  const [filterCollege, setFilterCollege] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract unique colleges and courses for dropdowns
  const uniqueColleges = useMemo(() => ['All', ...Array.from(new Set(students.map(s => s.college)))], [students]);
  const uniqueCourses = useMemo(() => ['All', ...Array.from(new Set(students.map(s => s.course)))], [students]);

  // Comprehensive Multi-Criteria Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 1. Search Term Match
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.college.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. College Match
      const matchesCollege = filterCollege === 'All' || student.college === filterCollege;

      // 3. Course Match
      const matchesCourse = filterCourse === 'All' || student.course === filterCourse;

      // 4. Date Range Match
      const studentDate = new Date(student.createdAt);
      const matchesStartDate = !startDate || studentDate >= new Date(startDate);
      const matchesEndDate = !endDate || studentDate <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesCollege && matchesCourse && matchesStartDate && matchesEndDate;
    });
  }, [students, searchTerm, filterCollege, filterCourse, startDate, endDate]);

  // Pagination
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

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input 
            type="text" 
            placeholder="Search by name, ID or college..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] border border-slate-200 focus:border-cyan-400 focus:outline-none transition bg-white shadow-sm font-medium"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-4 rounded-[1.5rem] font-black text-sm border transition shadow-sm ${
              showFilters || filterCollege !== 'All' || filterCourse !== 'All' || startDate || endDate
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FiFilter /> {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
          {(filterCollege !== 'All' || filterCourse !== 'All' || startDate || endDate || searchTerm) && (
            <button 
              onClick={resetFilters}
              className="flex items-center gap-2 px-6 py-4 rounded-[1.5rem] bg-rose-50 text-rose-600 border border-rose-100 font-black text-sm hover:bg-rose-100 transition shadow-sm"
            >
              <FiXCircle /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200/60 animate-fade-in">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FiMapPin className="w-3 h-3" /> Institution
            </label>
            <select 
              value={filterCollege} 
              onChange={(e) => { setFilterCollege(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-cyan-400 outline-none transition"
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
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-cyan-400 outline-none transition"
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
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-cyan-400 outline-none transition"
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
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-cyan-400 outline-none transition"
            />
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/30">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-900">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-[0.2em] text-[0.65rem]">
              <tr>
                <th className="px-8 py-6 w-24">Actions</th>
                <th className="px-8 py-6">Student Information</th>
                <th className="px-8 py-6">Academic Path</th>
                <th className="px-8 py-6">Registration Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition duration-300 group">
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-all shadow-sm active:scale-95"
                        title="View Details"
                      >
                        <FiEye className="w-5 h-5" />
                      </button>
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(student.id)}
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Delete Record"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="h-16 w-16 overflow-hidden rounded-[1.25rem] bg-slate-100 border border-slate-200 shrink-0 shadow-sm relative group/avatar">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="h-full w-full object-cover group-hover:scale-110 transition duration-500" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[0.55rem] text-slate-400 font-black uppercase">No Image</div>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight leading-tight">{student.name}</p>
                        <p className="text-[0.7rem] text-cyan-600 font-black tracking-widest uppercase mt-1">ID: {student.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-700 text-base">{student.course}</p>
                    <p className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-widest mt-1">{student.college} • Year {student.year}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-slate-600 font-bold flex items-center gap-2">{student.email}</p>
                    <p className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       Joined {new Date(student.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl">🔍</div>
                      <div>
                         <p className="text-xl font-black text-slate-900">No matches found.</p>
                         <p className="text-sm text-slate-500 font-medium mt-1">Try adjusting your filters or search keywords.</p>
                      </div>
                      <button onClick={resetFilters} className="mt-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition shadow-lg">Clear All Filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50/50 px-8 py-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-400">Rows:</span>
              <select 
                value={itemsPerPage} 
                onChange={handleItemsPerPageChange}
                className="bg-white border border-slate-200 rounded-xl text-xs font-black px-3 py-2 outline-none focus:border-cyan-400 transition shadow-sm cursor-pointer"
              >
                {[5, 10, 25, 50].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
            <p className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest">
              Showing <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="text-slate-900 font-black">{filteredStudents.length}</span>
            </p>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[0.65rem] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all shadow-sm"
              >
                Prev
              </button>
              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-[0.65rem] font-black transition-all duration-300 ${
                      currentPage === page 
                        ? 'bg-slate-900 text-white shadow-xl scale-110' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[0.65rem] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all shadow-sm"
              >
                Next
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
