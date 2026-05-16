'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getLogsPageData } from '@/lib/actions';
import { formatISTDate, formatISTDateTime } from '@/lib/formatDate';
import { AuditLog, LoginHistory, StudentAuditRow, UserAuditRow, CollegeAuditRow } from '@/lib/types';
import TableSkeleton from '@/components/TableSkeleton';
import { FiRefreshCw, FiUsers, FiBook, FiMapPin, FiDownload, FiLogIn } from 'react-icons/fi';

type LogTab = 'students' | 'users' | 'colleges' | 'exports' | 'logins';

const PAGE_SIZE = 10;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
      <p className="text-xs text-slate-400 font-bold">{start}–{end} of {total}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-2.5 py-1.5 text-xs font-black rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >←</button>
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
          .reduce<(number | '…')[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-300 font-bold">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`min-w-[28px] px-2 py-1.5 text-xs font-black rounded border transition ${
                  p === page ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >{p}</button>
            )
          )}
        <button
          onClick={() => onChange(page + 1)} disabled={page === pages}
          className="px-2.5 py-1.5 text-xs font-black rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >→</button>
      </div>
    </div>
  );
}

const OP_STYLES: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  UPDATE: 'bg-amber-50 text-amber-700 border border-amber-100',
  DELETE: 'bg-rose-50 text-rose-600 border border-rose-100',
};

const TAB_META: { key: LogTab; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { key: 'students', label: 'Students',  desc: 'All student record changes',  icon: <FiUsers    className="w-4 h-4" />, color: 'text-violet-600 bg-violet-50 border-violet-200'  },
  { key: 'users',    label: 'Users',     desc: 'Account creations & edits',   icon: <FiBook     className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 border-blue-200'        },
  { key: 'colleges', label: 'Colleges',  desc: 'Institute add / remove',      icon: <FiMapPin   className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200'},
  { key: 'exports',  label: 'Exports',   desc: 'ZIP & Excel downloads',       icon: <FiDownload className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50 border-amber-200'     },
  { key: 'logins',   label: 'Logins',    desc: 'Login events & devices',      icon: <FiLogIn    className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50 border-rose-200'        },
];

function Empty({ msg }: { msg: string }) {
  return <p className="px-6 py-20 text-center text-sm text-slate-400 font-bold">{msg}</p>;
}

function pairRows<T extends { auditId: number; snapshot: 'BEFORE' | 'AFTER'; changedAt: string }>(rows: T[]) {
  const map = new Map<number, { before?: T; after?: T }>();
  for (const r of rows) {
    const entry = map.get(r.auditId) ?? {};
    if (r.snapshot === 'BEFORE') entry.before = r; else entry.after = r;
    map.set(r.auditId, entry);
  }
  return [...map.values()].sort((a, b) => {
    const ta = (a.after ?? a.before)!.changedAt;
    const tb = (b.after ?? b.before)!.changedAt;
    return tb.localeCompare(ta);
  });
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const [activeTab,    setActiveTab]    = useState<LogTab>('students');
  const [studentAudit, setStudentAudit] = useState<StudentAuditRow[]>([]);
  const [userAudit,    setUserAudit]    = useState<UserAuditRow[]>([]);
  const [collegeAudit, setCollegeAudit] = useState<CollegeAuditRow[]>([]);
  const [exportLogs,   setExportLogs]   = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [pages, setPages] = useState<Record<LogTab, number>>({
    students: 1, users: 1, colleges: 1, exports: 1, logins: 1,
  });
  const page = pages[activeTab];
  const setPage = (p: number) => setPages(prev => ({ ...prev, [activeTab]: p }));

  const loadLogs = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    const data = await getLogsPageData().catch(() => ({
      studentAudit: [], userAudit: [], collegeAudit: [], exportLogs: [], loginHistory: [],
    }));
    setStudentAudit(data.studentAudit as StudentAuditRow[]);
    setUserAudit(data.userAudit as UserAuditRow[]);
    setCollegeAudit(data.collegeAudit as CollegeAuditRow[]);
    setExportLogs(data.exportLogs as AuditLog[]);
    setLoginHistory(data.loginHistory as LoginHistory[]);
    setLoading(false);
  }, [user?.email]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const studentOps = pairRows(studentAudit);
  const userOps    = pairRows(userAudit);
  const collegeOps = pairRows(collegeAudit);

  const counts: Record<LogTab, number> = {
    students: studentOps.length,
    users:    userOps.length,
    colleges: collegeOps.length,
    exports:  exportLogs.length,
    logins:   loginHistory.length,
  };

  const slice = <T,>(arr: T[], tab: LogTab) => arr.slice((pages[tab] - 1) * PAGE_SIZE, pages[tab] * PAGE_SIZE);
  const pagedStudents = slice(studentOps,  'students');
  const pagedUsers    = slice(userOps,     'users');
  const pagedColleges = slice(collegeOps,  'colleges');
  const pagedExports  = slice(exportLogs,  'exports');
  const pagedLogins   = slice(loginHistory,'logins');

  const activeMeta = TAB_META.find(t => t.key === activeTab)!;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Audit Logs</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Full change history across students, users, colleges, exports and logins</p>
        </div>
        <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded font-black text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm active:scale-95">
          <FiRefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Top tab list + panel */}
      <div className="flex flex-col gap-4">

        {/* Top: horizontal tab list */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-x-auto">
          <div className="flex min-w-max">
            {TAB_META.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 px-5 py-3.5 transition border-r border-slate-100 last:border-0 ${
                    isActive ? 'bg-slate-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`shrink-0 p-1.5 rounded border ${isActive ? 'bg-white/10 text-white border-white/20' : tab.color}`}>
                    {tab.icon}
                  </span>
                  <div className="text-left">
                    <p className={`text-sm font-black leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>{tab.label}</p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[0.6rem] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {counts[tab.key]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content panel */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className={`p-2 rounded border ${activeMeta.color}`}>{activeMeta.icon}</span>
            <div>
              <h2 className="text-sm font-black text-slate-900">{activeMeta.label} Audit</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{activeMeta.desc} · {counts[activeTab]} records</p>
            </div>
          </div>

          {loading ? <TableSkeleton rows={8} cols={5} /> : activeTab === 'students' ? (
            /* ── Students ── */
            studentOps.length === 0 ? <Empty msg="No student changes recorded yet." /> : (<>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left">Operation</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">College</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Course / Class</th>
                      <th className="px-4 py-3 text-left hidden xl:table-cell">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedStudents.map(({ before, after }) => {
                      const row = after ?? before!;
                      const op  = row.operation;
                      const nameChanged = before && after && before.name !== after.name;
                      return (
                        <tr key={row.auditId} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-500">{formatISTDate(row.changedAt)}</p>
                            <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(row.changedAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[0.65rem] font-black uppercase tracking-wide ${OP_STYLES[op] ?? 'bg-slate-100 text-slate-500'}`}>{op}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 text-sm">{row.name ?? '—'}</p>
                            {nameChanged && <p className="text-[0.65rem] text-amber-500 font-bold">was: {before!.name}</p>}
                            <p className="text-[0.65rem] text-slate-400">{row.studentId ?? row.rollno ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-sm text-slate-600 font-medium">{row.college ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-sm text-slate-600">{[row.course, row.studentClass].filter(Boolean).join(' · ') || '—'}</p>
                            {row.year && <p className="text-[0.65rem] text-slate-400">{row.year}</p>}
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <p className="text-xs text-slate-500 font-medium">{row.changedBy ?? (op === 'DELETE' ? row.deletedBy : null) ?? '—'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={studentOps.length} onChange={setPage} />
            </>)
          ) : activeTab === 'users' ? (
            /* ── Users ── */
            userOps.length === 0 ? <Empty msg="No user changes recorded yet." /> : (<>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left">Operation</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Role</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">College</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedUsers.map(({ before, after }) => {
                      const row = after ?? before!;
                      const op  = row.operation;
                      const roleChanged = before && after && before.role !== after.role;
                      return (
                        <tr key={row.auditId} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-500">{formatISTDate(row.changedAt)}</p>
                            <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(row.changedAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[0.65rem] font-black uppercase tracking-wide ${OP_STYLES[op] ?? 'bg-slate-100 text-slate-500'}`}>{op}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 text-sm">{row.name ?? '—'}</p>
                            <p className="text-[0.65rem] text-slate-400">{row.email ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {row.role && (
                              <span className={`inline-flex items-center px-2 py-1 rounded text-[0.65rem] font-black uppercase tracking-wide ${row.role === 'admin' ? 'bg-slate-900 text-white' : row.role === 'faculty_admin' ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                {row.role === 'faculty_admin' ? 'Fac. Admin' : row.role}
                              </span>
                            )}
                            {roleChanged && <p className="text-[0.65rem] text-amber-500 font-bold mt-1">was: {before!.role}</p>}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-sm text-slate-500 font-medium">{row.college ?? '—'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={userOps.length} onChange={setPage} />
            </>)
          ) : activeTab === 'colleges' ? (
            /* ── Colleges ── */
            collegeOps.length === 0 ? <Empty msg="No college changes recorded yet." /> : (<>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left">Operation</th>
                      <th className="px-4 py-3 text-left">College Name</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedColleges.map(({ before, after }) => {
                      const row = after ?? before!;
                      const op  = row.operation;
                      const nameChanged = before && after && before.name !== after.name;
                      return (
                        <tr key={row.auditId} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-500">{formatISTDate(row.changedAt)}</p>
                            <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(row.changedAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[0.65rem] font-black uppercase tracking-wide ${OP_STYLES[op] ?? 'bg-slate-100 text-slate-500'}`}>{op}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 text-sm">{row.name ?? '—'}</p>
                            {nameChanged && <p className="text-[0.65rem] text-amber-500 font-bold">was: {before!.name}</p>}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-slate-500 font-medium">{row.deletedBy ?? '—'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={collegeOps.length} onChange={setPage} />
            </>)
          ) : activeTab === 'exports' ? (
            /* ── Exports ── */
            exportLogs.length === 0 ? <Empty msg="No export activity yet." /> : (<>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left">Exported By</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Details</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedExports.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs font-bold text-slate-500">{formatISTDate(log.createdAt)}</p>
                          <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(log.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800 text-sm truncate max-w-[130px]">{log.userName || log.userEmail}</p>
                          <p className="text-[0.65rem] text-slate-400 truncate max-w-[130px]">{log.userEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          {log.action === 'export_zip' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[0.65rem] font-black bg-violet-50 text-violet-700 border border-violet-100">
                              🗜️ ZIP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[0.65rem] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                              📊 Excel
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell"><p className="text-xs text-slate-500 truncate max-w-[220px]">{log.details ?? '—'}</p></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><p className="text-xs font-mono text-slate-400">{log.ipAddress ?? '—'}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={exportLogs.length} onChange={setPage} />
            </>)
          ) : (
            /* ── Logins ── */
            loginHistory.length === 0 ? <Empty msg="No login history yet." /> : (<>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-400 text-[0.6rem] font-black uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">IP Address</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Device / Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedLogins.map(entry => {
                      const ua       = entry.userAgent ?? '';
                      const isMobile = /mobile|android|iphone|ipad/i.test(ua);
                      const browser  = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : 'Other';
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-500">{formatISTDate(entry.createdAt)}</p>
                            <p className="text-[0.65rem] text-slate-400">{formatISTDateTime(entry.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 text-sm truncate max-w-[140px]">{entry.userName || entry.userEmail}</p>
                            <p className="text-[0.65rem] text-slate-400 truncate max-w-[140px]">{entry.userEmail}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell"><p className="text-xs font-mono text-slate-400">{entry.ipAddress ?? '—'}</p></td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[0.65rem] font-black ${isMobile ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-slate-100 text-slate-500'}`}>
                              {isMobile ? '📱' : '💻'} {browser}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={loginHistory.length} onChange={setPage} />
            </>)
          )}
        </div>
      </div>
    </div>
  );
}
