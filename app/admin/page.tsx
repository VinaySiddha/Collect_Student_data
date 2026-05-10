'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import StudentTable from '@/components/StudentTable';
import { FiUsers, FiDownload, FiPlus, FiTrash2, FiMapPin, FiLogOut, FiLayout, FiUser, FiMail, FiLock, FiBook, FiChevronDown, FiChevronLeft, FiChevronRight, FiSearch, FiMenu, FiX } from 'react-icons/fi';
import { GoSidebarExpand, GoSidebarCollapse } from 'react-icons/go';
import { registerUser, getUsers, deleteUser } from '@/lib/actions';
import { DbUser } from '@/lib/types';

type View = 'dashboard' | 'institutes' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const { user, initialized, logout, students, colleges, addCollege, removeCollege, deleteStudent } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newCollege, setNewCollege] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'faculty' as 'faculty', college: '' });
  const [userMsg, setUserMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegePage, setCollegePage] = useState(1);
  const [collegeRowsPerPage, setCollegeRowsPerPage] = useState(10);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'admin') {
      router.push('/faculty');
    }
  }, [user, initialized, router]);

  useEffect(() => {
    if (activeView === 'users' && user?.role === 'admin') {
      setUsersLoading(true);
      getUsers().then(data => { setDbUsers(data); setUsersLoading(false); });
    }
  }, [activeView, user]);

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      setUserMsg({ text: 'Name, email and password are required.', type: 'error' });
      return;
    }
    const result = await registerUser(userForm.name, userForm.email, userForm.password, userForm.role, userForm.college || undefined);
    setUserMsg({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setUserForm({ name: '', email: '', password: '', role: 'faculty' as 'faculty', college: '' });
      getUsers().then(setDbUsers);
      setTimeout(() => setUserMsg(null), 3000);
    }
  };

  const handleDeleteUser = async (id: number) => {
    const result = await deleteUser(id);
    if (result.success) setDbUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleAddCollege = () => {
    const result = addCollege(newCollege);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setNewCollege('');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemoveCollege = (college: string) => {
    const result = removeCollege(college);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      students.map((item) => ({
        Name: item.name,
        'Student ID': item.studentId,
        College: item.college,
        Course: item.course,
        Year: item.year,
        Email: item.email,
        Phone: item.phone,
        'Added By': item.createdBy || 'Unknown',
        'Created At': new Date(item.createdAt).toLocaleDateString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'College Report');
    XLSX.writeFile(workbook, `Admin_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = async () => {
    const element = document.getElementById('admin-registry-section');
    if (!element) return;
    setMessage({ text: 'Generating PDF…', type: 'success' });
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fcfdfe' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'px', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageProps = pdf.getImageProperties(imgData);
    const ratio = Math.min(pageWidth / imageProps.width, pageHeight / imageProps.height);
    pdf.addImage(imgData, 'PNG', 0, 0, imageProps.width * ratio, imageProps.height * ratio);
    pdf.save(`Admin_Registry_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    setMessage({ text: 'PDF exported successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!initialized || !user || user.role !== 'admin') return null;

  const studentCountByCollege = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.college] = (acc[s.college] || 0) + 1;
    return acc;
  }, {});
  const filteredColleges = colleges.filter(c =>
    c.toLowerCase().includes(collegeSearch.toLowerCase())
  );
  const totalCollegePages = Math.max(1, Math.ceil(filteredColleges.length / collegeRowsPerPage));
  const safeCollegePage = Math.min(collegePage, totalCollegePages);
  const paginatedColleges = filteredColleges.slice(
    (safeCollegePage - 1) * collegeRowsPerPage,
    safeCollegePage * collegeRowsPerPage
  );

  const initials = (user.name?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-screen bg-slate-900 flex flex-col overflow-hidden transition-all duration-300 w-64 lg:sticky lg:top-0 lg:shrink-0 lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand + toggle */}
        <div className="border-b border-white/10 px-3 py-4 flex items-center justify-between gap-2">

          {/* Mobile: always show full brand + close button */}
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:hidden">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">Gographic</p>
              <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white transition lg:hidden shrink-0"
          >
            <FiX className="w-4 h-4" />
          </button>

          {/* Desktop: collapsed/expanded toggle */}
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="hidden lg:flex w-8 h-8 bg-green-500 rounded items-center justify-center mx-auto group transition"
            >
              <span className="text-white text-sm font-black group-hover:hidden">G</span>
              <GoSidebarCollapse className="w-4 h-4 text-white hidden group-hover:block" />
            </button>
          ) : (
            <div className="hidden lg:flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">G</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm leading-none">Gographic</p>
                  <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-widest mt-0.5">Admin Panel</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition shrink-0"
              >
                <GoSidebarExpand className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {[
            { view: 'dashboard' as const, icon: <FiLayout className="w-4 h-4 shrink-0" />, label: 'Dashboard' },
            { view: 'institutes' as const, icon: <FiMapPin className="w-4 h-4 shrink-0" />, label: 'Institutes' },
            { view: 'users' as const, icon: <FiUsers className="w-4 h-4 shrink-0" />, label: 'Users' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); setMobileOpen(false); }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all ${
                collapsed ? 'lg:justify-center lg:px-2' : ''
              } ${
                activeView === view
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {icon}
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer: user + logout */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <div
            className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title={collapsed ? (user.name || 'Admin') : undefined}
          >
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{initials}</span>
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-white text-xs font-black truncate leading-none">{user.name || 'Admin'}</p>
              <p className="text-white/40 text-[0.6rem] truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all ${
              collapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <FiLogOut className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Content wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 lg:hidden bg-slate-900 px-4 py-3 flex items-center gap-3 shadow-lg">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 text-white/70 hover:text-white transition"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">G</span>
            </div>
            <p className="text-white font-black text-sm">Gographic</p>
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-y-auto">

          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <div id="admin-registry-section" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{students.length} students in registry</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={exportExcel} className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition shadow-sm" title="Export Excel">
                    <FiDownload className="w-4 h-4" />
                  </button>
                  <button onClick={exportPDF} className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition shadow-sm" title="Export PDF">
                    <FiUsers className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-white rounded border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6">
                <StudentTable students={students} onDelete={deleteStudent} />
              </div>
            </div>
          )}

          {/* Institutes */}
          {activeView === 'institutes' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Institutes</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Manage authorized colleges and institutions</p>
              </div>

              {/* Add Institution */}
              <div className="bg-white rounded border border-slate-200 p-4 lg:p-6 shadow-sm max-w-lg">
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-green-600 p-2.5 rounded text-white shrink-0">
                    <FiPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Add Institution</h2>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">Expand the institutional network.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCollege}
                    onChange={(e) => setNewCollege(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCollege()}
                    placeholder="Official Institution Name"
                    className="input-field text-sm flex-1"
                  />
                  <button
                    onClick={handleAddCollege}
                    className="bg-slate-900 text-white font-black px-4 py-2.5 rounded hover:bg-green-700 transition shadow-sm active:scale-95 flex items-center gap-2 text-sm shrink-0"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
                {message && (
                  <p className={`mt-3 text-sm font-bold p-3 rounded ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {message.text}
                  </p>
                )}
              </div>

              {/* Registry table */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">

                {/* Table header */}
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
                      onChange={(e) => { setCollegeSearch(e.target.value); setCollegePage(1); }}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400 transition bg-slate-50 font-medium"
                    />
                  </div>
                </div>

                {/* Table */}
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
                          <td className="px-4 lg:px-6 py-4">
                            <span className="text-xs font-black text-slate-400">
                              {(safeCollegePage - 1) * collegeRowsPerPage + idx + 1}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center shrink-0">
                                <FiMapPin className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <p className="font-black text-slate-900 text-sm">{college}</p>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                            <span className="text-sm font-bold text-slate-700">
                              {studentCountByCollege[college] ?? 0}
                              <span className="text-slate-400 font-medium ml-1">student{(studentCountByCollege[college] ?? 0) !== 1 ? 's' : ''}</span>
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                            <span className="inline-flex items-center px-2.5 py-1 rounded text-[0.65rem] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-100">
                              Authorized
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveCollege(college)}
                              className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition ml-auto"
                              title="Remove institute"
                            >
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
                                <p className="text-base font-black text-slate-900">
                                  {collegeSearch ? 'No matches found' : 'No institutes registered yet'}
                                </p>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                  {collegeSearch ? 'Try a different search term.' : 'Add the first institution above.'}
                                </p>
                              </div>
                              {collegeSearch && (
                                <button onClick={() => setCollegeSearch('')} className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-black transition">
                                  Clear Search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="bg-slate-50/50 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                      <select
                        value={collegeRowsPerPage}
                        onChange={(e) => { setCollegeRowsPerPage(Number(e.target.value)); setCollegePage(1); }}
                        className="bg-white border border-slate-200 rounded text-xs font-black px-2 py-1 outline-none focus:border-slate-400 transition cursor-pointer"
                      >
                        {[5, 10, 25].map(val => <option key={val} value={val}>{val}</option>)}
                      </select>
                    </div>
                    <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="text-slate-900 font-black">
                        {filteredColleges.length === 0 ? 0 : (safeCollegePage - 1) * collegeRowsPerPage + 1}–{Math.min(safeCollegePage * collegeRowsPerPage, filteredColleges.length)}
                      </span>
                      {' '}of <span className="text-slate-900 font-black">{filteredColleges.length}</span>
                    </p>
                  </div>
                  {totalCollegePages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCollegePage(p => Math.max(1, p - 1))}
                        disabled={safeCollegePage === 1}
                        className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <FiChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {Array.from({ length: totalCollegePages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCollegePage(page)}
                          className={`w-7 h-7 rounded text-[0.65rem] font-black transition-all ${safeCollegePage === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCollegePage(p => Math.min(totalCollegePages, p + 1))}
                        disabled={safeCollegePage === totalCollegePages}
                        className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeView === 'users' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Users</h1>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Create and manage faculty accounts</p>
              </div>

              {/* Create user form */}
              <div className="bg-white rounded border border-slate-200 shadow-sm p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-slate-900 p-2.5 rounded text-white shrink-0">
                    <FiUser className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Create New User</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Add a faculty account to the system</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiUser className="w-3 h-3" /> Full Name
                    </span>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className="input-field text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiMail className="w-3 h-3" /> Email Address
                    </span>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="user@college.edu"
                      className="input-field text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiLock className="w-3 h-3" /> Password
                    </span>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Set a secure password"
                      className="input-field text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiBook className="w-3 h-3" /> Role
                    </span>
                    <div className="relative">
                      <select
                        value={userForm.role}
                        onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'faculty' }))}
                        className="input-field text-sm appearance-none pr-8"
                      >
                        <option value="faculty">Faculty</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                      <FiMapPin className="w-3 h-3" /> College <span className="text-slate-300 normal-case tracking-normal font-medium">(optional)</span>
                    </span>
                    <div className="relative">
                      <select
                        value={userForm.college}
                        onChange={e => setUserForm(f => ({ ...f, college: e.target.value }))}
                        className="input-field text-sm appearance-none pr-8"
                      >
                        <option value="">— No college assigned —</option>
                        {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>
                  </label>
                </div>

                {userMsg && (
                  <p className={`mt-4 text-sm font-bold p-3 rounded ${userMsg.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {userMsg.text}
                  </p>
                )}

                <button
                  onClick={handleCreateUser}
                  className="mt-5 flex items-center gap-2 bg-slate-900 text-white font-black px-6 py-3 rounded hover:bg-green-700 transition shadow-sm active:scale-95 text-sm"
                >
                  <FiPlus className="w-4 h-4" /> Create User
                </button>
              </div>

              {/* Users table */}
              <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900">Existing Users</h2>
                  <span className="text-xs text-slate-400 font-bold">{dbUsers.length} total</span>
                </div>

                {usersLoading ? (
                  <div className="px-6 py-16 text-center text-sm text-slate-400 font-bold">Loading users…</div>
                ) : dbUsers.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-slate-400 font-bold">No users found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                      <thead className="bg-slate-50 text-slate-400 text-[0.65rem] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-4 lg:px-6 py-3.5 text-left">User</th>
                          <th className="px-4 lg:px-6 py-3.5 text-left hidden sm:table-cell">Email</th>
                          <th className="px-4 lg:px-6 py-3.5 text-left">Role</th>
                          <th className="px-4 lg:px-6 py-3.5 text-left hidden md:table-cell">College</th>
                          <th className="px-4 lg:px-6 py-3.5 text-left hidden lg:table-cell">Created</th>
                          <th className="px-4 lg:px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dbUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 lg:px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-black text-slate-600 uppercase">
                                    {u.name?.[0] ?? u.email[0]}
                                  </span>
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
                            <td className="px-4 lg:px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded text-[0.65rem] font-black uppercase tracking-widest ${
                                u.role === 'admin'
                                  ? 'bg-slate-900 text-white'
                                  : u.role === 'faculty'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-green-50 text-green-700 border border-green-100'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                              <p className="text-slate-500 font-medium text-sm">{u.college ?? '—'}</p>
                            </td>
                            <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                              <p className="text-slate-400 font-medium text-xs">{new Date(u.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-4 lg:px-6 py-4 text-right">
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition ml-auto"
                                  title="Delete user"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Toast */}
      {message && activeView === 'dashboard' && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded shadow-2xl flex items-center gap-3 font-black text-sm border-2 whitespace-nowrap ${
          message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-rose-500/90 text-white border-rose-400/50'
        }`}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span> {message.text}
        </div>
      )}
    </div>
  );
}
