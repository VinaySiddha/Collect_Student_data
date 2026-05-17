'use server';

import { dbExecute, connExecute, withTransaction, DbConnection } from './db';
import { User, StudentRecord, UserRole, DbUser, DraftRecord, AuditLog, LoginHistory } from './types';
import { RowDataPacket } from 'mysql2';
import { headers } from 'next/headers';
import { setSessionCookie, clearSessionCookie, getSessionUser } from './session';
import { requireAuth, requireAdmin, requireAnyFaculty } from './auth';

function nowIST(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
}

async function getRequestMeta() {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
    const ua = h.get('user-agent') ?? 'unknown';
    return { ip, ua };
  } catch {
    return { ip: 'unknown', ua: 'unknown' };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Trim a string; return null if empty/missing */
function t(v: string | undefined | null): string | null {
  if (v == null) return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

/**
 * Map a raw DB row to StudentRecord.
 * DB uses lowercase column names (studentid, createdby) — we alias them here.
 * BLOB photo is converted to a base64 data URL; empty Buffer → undefined.
 */
function rowToStudent(row: RowDataPacket): StudentRecord {
  const r = row as Record<string, unknown>;

  let photo: string | undefined;
  const p = r.photo;
  if (p instanceof Buffer || p instanceof Uint8Array) {
    const b64 = Buffer.from(p).toString('base64');
    if (b64) photo = `data:image/png;base64,${b64}`;
  } else if (typeof p === 'string' && p.length > 0) {
    photo = p;
  }

  return {
    id:           String(r.id ?? ''),
    college:      String(r.college ?? ''),
    name:         String(r.name ?? ''),
    phone:        String(r.phone ?? ''),
    createdAt:    r.createdAt ? String(r.createdAt) : new Date().toISOString(),
    // DB stores as lowercase — handle both for safety
    studentId:    r.studentid    ? String(r.studentid)    : (r.studentId    ? String(r.studentId)    : undefined),
    createdBy:    r.createdby    ? String(r.createdby)    : (r.createdBy    ? String(r.createdBy)    : undefined),
    course:       r.course       ? String(r.course)       : undefined,
    year:         r.year         ? String(r.year)         : undefined,
    email:        r.email        ? String(r.email)        : undefined,
    parentage:    r.parentage    ? String(r.parentage)    : undefined,
    rollNo:       r.rollNo       ? String(r.rollNo)       : undefined,
    studentClass: r.studentClass ? String(r.studentClass) : undefined,
    busStop:      r.busStop      ? String(r.busStop)      : undefined,
    bloodGroup:   r.bloodGroup   ? String(r.bloodGroup)   : undefined,
    dob:          r.dob          ? String(r.dob)          : undefined,
    address:      r.address      ? String(r.address)      : undefined,
    percentage:   r.percentage   ? String(r.percentage)   : undefined,
    deletedBy:    r.deleted_by   ? String(r.deleted_by)   : null,
    photo,
  };
}

async function getCollegeId(name: string | null | undefined): Promise<number | null> {
  if (!name) return null;
  const [rows] = await dbExecute<RowDataPacket[]>(
    'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NULL',
    [name.trim()]
  );
  return rows.length > 0 ? (rows[0] as RowDataPacket).id as number : null;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, passwordHash: string) {
  const emailClean = t(email);
  if (!emailClean) return { success: false, message: 'Email is required.' };
  if (!passwordHash) return { success: false, message: 'Password is required.' };
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.*, c.name AS college
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.email = ? AND u.password = ? AND u.deleted_at IS NULL`,
      [emailClean.toLowerCase(), passwordHash]
    );
    if (rows.length === 0) return { success: false, message: 'Invalid email or password.' };
    const u = rows[0] as RowDataPacket;
    const { ip, ua } = await getRequestMeta();
    dbExecute(
      'INSERT INTO login_history (user_email, user_name, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?)',
      [emailClean.toLowerCase(), u.name ?? email, ip, ua, nowIST()]
    ).catch(() => {});
    // Set httpOnly session cookie
    await setSessionCookie({
      id:      u.id as number,
      email:   (u.email as string).toLowerCase(),
      name:    u.name as string,
      role:    u.role as import('./types').UserRole,
      college: (u.college as string | null) ?? null,
    });
    return { success: true, message: 'Login successful.', user: rows[0] as User };
  } catch {
    return { success: false, message: 'Database connection failed.' };
  }
}

/** Returns the currently logged-in user from the session cookie, or null. */
export async function getMe() {
  return getSessionUser();
}

/** Clears the session cookie — call this on logout. */
export async function logoutAction() {
  await clearSessionCookie();
}

export async function registerUser(name: string, email: string, passwordHash: string, role: UserRole, college?: string) {
  await requireAdmin();
  const nameClean  = t(name);
  const emailClean = t(email);
  if (!nameClean)  return { success: false, message: 'Name is required.' };
  if (!emailClean) return { success: false, message: 'Email is required.' };
  if (!passwordHash) return { success: false, message: 'Password is required.' };

  try {
    const [existing] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [emailClean.toLowerCase()]
    );
    if (existing.length > 0) return { success: false, message: 'An account with this email already exists.' };

    const collegeId = await getCollegeId(college);
    await withTransaction(async (conn) => {
      await connExecute(conn,
        'INSERT INTO users (name, email, password, role, college_id) VALUES (?, ?, ?, ?, ?)',
        [nameClean, emailClean!.toLowerCase(), passwordHash, role, collegeId]
      );
      const [newRow] = await connExecute<RowDataPacket[]>(conn, 'SELECT id FROM users WHERE email = ?', [emailClean!.toLowerCase()]);
      if (newRow[0]) await logUserAudit('INSERT', null, { id: newRow[0].id, name: nameClean!, email: emailClean!.toLowerCase(), role, college_id: collegeId }, conn);
    });
    return { success: true, message: 'Registration complete. Welcome!', user: { name: nameClean, email: emailClean, password: passwordHash, role, college } as User };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Failed to create account.' };
  }
}

// ── Audit helpers ──────────────────────────────────────────────────────────────

type Snapshot = 'BEFORE' | 'AFTER';

type UserAuditRow = { id: number; name: string; email: string; role: string; college_id?: number | null; deleted_at?: string | null; deleted_by?: string | null };
type CollegeAuditRow = { id: number; name: string; deleted_at?: string | null; deleted_by?: string | null; created_at?: string | null };

function insertStudentAuditRow(op: 'INSERT' | 'UPDATE' | 'DELETE', snapshot: Snapshot, s: StudentRecord, conn: DbConnection) {
  return connExecute(
    conn,
    `INSERT INTO student_audit
       (operation, snapshot, changed_at, changed_by, student_id, college, name, parentage,
        studentid, rollno, studentclass, course, year, email, phone, busstop,
        bloodgroup, dob, address, percentage, has_photo, createdby, createdat,
        deleted_by, deleted_at)
     VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      op, snapshot,
      s.createdBy ?? null,
      s.id, s.college, s.name,
      s.parentage ?? null, s.studentId ?? null, s.rollNo ?? null,
      s.studentClass ?? null, s.course ?? null, s.year ?? null,
      s.email ?? null, s.phone, s.busStop ?? null, s.bloodGroup ?? null,
      s.dob ?? null, s.address ?? null, s.percentage ?? null,
      s.photo && s.photo.length > 0 ? 1 : 0,
      s.createdBy ?? null, s.createdAt ?? null,
      s.deletedBy ?? null, null,
    ]
  );
}

async function logStudentAudit(op: 'INSERT' | 'UPDATE' | 'DELETE', before: StudentRecord | null, after: StudentRecord | null, conn: DbConnection) {
  if (before) await insertStudentAuditRow(op, 'BEFORE', before, conn);
  if (after)  await insertStudentAuditRow(op, 'AFTER',  after,  conn);
}

function insertUserAuditRow(op: 'INSERT' | 'UPDATE' | 'DELETE', snapshot: Snapshot, u: UserAuditRow, conn: DbConnection) {
  return connExecute(
    conn,
    `INSERT INTO user_audit
       (operation, snapshot, changed_at, user_id, name, email, role, college_id, deleted_at, deleted_by)
     VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
    [op, snapshot, u.id, u.name, u.email, u.role, u.college_id ?? null, u.deleted_at ?? null, u.deleted_by ?? null]
  );
}

async function logUserAudit(op: 'INSERT' | 'UPDATE' | 'DELETE', before: UserAuditRow | null, after: UserAuditRow | null, conn: DbConnection) {
  if (before) await insertUserAuditRow(op, 'BEFORE', before, conn);
  if (after)  await insertUserAuditRow(op, 'AFTER',  after,  conn);
}

function insertCollegeAuditRow(op: 'INSERT' | 'UPDATE' | 'DELETE', snapshot: Snapshot, c: CollegeAuditRow, conn: DbConnection) {
  return connExecute(
    conn,
    `INSERT INTO college_audit
       (operation, snapshot, changed_at, college_id, name, deleted_at, deleted_by, created_at)
     VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
    [op, snapshot, c.id, c.name, c.deleted_at ?? null, c.deleted_by ?? null, c.created_at ?? null]
  );
}

async function logCollegeAudit(op: 'INSERT' | 'UPDATE' | 'DELETE', before: CollegeAuditRow | null, after: CollegeAuditRow | null, conn: DbConnection) {
  if (before) await insertCollegeAuditRow(op, 'BEFORE', before, conn);
  if (after)  await insertCollegeAuditRow(op, 'AFTER',  after,  conn);
}

// ── Students ───────────────────────────────────────────────────────────────────

export async function addStudentToDb(student: StudentRecord) {
  await requireAnyFaculty();
  // Server-side validation
  const name    = t(student.name);
  const college = t(student.college);
  const phone   = t(student.phone);
  if (!name)    return { success: false, message: 'Student name is required.' };
  if (!college) return { success: false, message: 'College is required.' };
  if (!phone)   return { success: false, message: 'Phone number is required.' };

  // photo column is NOT NULL in DB — use empty Buffer when no photo is provided
  const photoBlob = student.photo
    ? Buffer.from(student.photo.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    : Buffer.alloc(0);

  try {
    await withTransaction(async (conn) => {
      await connExecute(conn,
        `INSERT INTO students
           (id, college, name, parentage, studentid, rollNo, studentClass,
            course, year, email, phone, busStop, bloodGroup, dob, address, percentage, photo, createdby)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id, college, name,
          t(student.parentage), t(student.studentId), t(student.rollNo),
          t(student.studentClass), t(student.course), t(student.year),
          t(student.email), phone, t(student.busStop), t(student.bloodGroup),
          t(student.dob), t(student.address), t(student.percentage),
          photoBlob, t(student.createdBy) ?? 'Unknown',
        ]
      );
      await logStudentAudit('INSERT', null, { ...student, name: name!, college: college!, phone: phone! }, conn);
    });
    return { success: true, message: 'Student registered successfully.' };
  } catch (error: unknown) {
    console.error('Add student error:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Duplicate entry')) return { success: false, message: 'A student with this ID already exists.' };
    return { success: false, message: 'Failed to save student record.' };
  }
}

export async function updateStudentInDb(student: StudentRecord) {
  await requireAnyFaculty();
  const name  = t(student.name);
  const phone = t(student.phone);
  if (!name)  return { success: false, message: 'Student name is required.' };
  if (!phone) return { success: false, message: 'Phone number is required.' };

  // For updates: NULL photo means "keep existing" — but since photo is NOT NULL in DB
  // we preserve the old value by not updating it when null.
  try {
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT * FROM students WHERE id = ? AND deleted_at IS NULL', [student.id]);
    const beforeRecord = beforeRows[0] ? rowToStudent(beforeRows[0]) : null;
    await withTransaction(async (conn) => {
      if (student.photo) {
        const photoBlob = Buffer.from(student.photo.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        await connExecute(conn,
          `UPDATE students SET
             college=?, name=?, parentage=?, studentid=?, rollNo=?, studentClass=?,
             course=?, year=?, email=?, phone=?, busStop=?, bloodGroup=?, dob=?, address=?, percentage=?, photo=?
           WHERE id=? AND deleted_at IS NULL`,
          [
            t(student.college) ?? student.college, name,
            t(student.parentage), t(student.studentId), t(student.rollNo),
            t(student.studentClass), t(student.course), t(student.year),
            t(student.email), phone, t(student.busStop), t(student.bloodGroup),
            t(student.dob), t(student.address), t(student.percentage),
            photoBlob, student.id,
          ]
        );
      } else {
        await connExecute(conn,
          `UPDATE students SET
             college=?, name=?, parentage=?, studentid=?, rollNo=?, studentClass=?,
             course=?, year=?, email=?, phone=?, busStop=?, bloodGroup=?, dob=?, address=?, percentage=?
           WHERE id=? AND deleted_at IS NULL`,
          [
            t(student.college) ?? student.college, name,
            t(student.parentage), t(student.studentId), t(student.rollNo),
            t(student.studentClass), t(student.course), t(student.year),
            t(student.email), phone, t(student.busStop), t(student.bloodGroup),
            t(student.dob), t(student.address), t(student.percentage),
            student.id,
          ]
        );
      }
      await logStudentAudit('UPDATE', beforeRecord, student, conn);
    });
    return { success: true, message: 'Student updated successfully.' };
  } catch (error) {
    console.error('Update student error:', error);
    return { success: false, message: 'Failed to update student record.' };
  }
}

export async function deleteStudentFromDb(id: string, deletedBy?: string) {
  await requireAnyFaculty();
  if (!id) return { success: false, message: 'Student ID is required.' };
  try {
    const by = t(deletedBy) ?? 'Unknown';
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT * FROM students WHERE id = ? AND deleted_at IS NULL', [id]);
    const beforeRecord = beforeRows[0] ? rowToStudent(beforeRows[0]) : null;
    await withTransaction(async (conn) => {
      await connExecute(conn,
        'UPDATE students SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
        [by, id]
      );
      await logStudentAudit('DELETE', beforeRecord, null, conn);
    });
    return { success: true };
  } catch (error) {
    console.error('Delete student error:', error);
    return { success: false };
  }
}

export async function restoreStudentInDb(id: string): Promise<{ success: boolean }> {
  await requireAuth(['admin', 'faculty_admin', 'faculty']);
  if (!id) return { success: false };
  try {
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT * FROM students WHERE id = ?', [id]);
    const beforeRecord = beforeRows[0] ? rowToStudent(beforeRows[0]) : null;
    await withTransaction(async (conn) => {
      await connExecute(conn, 'UPDATE students SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
      const [afterRows] = await connExecute<RowDataPacket[]>(conn, 'SELECT * FROM students WHERE id = ?', [id]);
      const afterRecord = afterRows[0] ? rowToStudent(afterRows[0]) : null;
      await logStudentAudit('UPDATE', beforeRecord, afterRecord, conn);
    });
    return { success: true };
  } catch (error) {
    console.error('Restore student error:', error);
    return { success: false };
  }
}

export async function getStudents() {
  await requireAnyFaculty();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM students WHERE deleted_at IS NULL ORDER BY createdAt DESC'
    );
    return rows.map(rowToStudent);
  } catch (error) {
    console.error('Fetch students error:', error);
    return [];
  }
}

export async function getStudentsByCollege(college: string): Promise<StudentRecord[]> {
  await requireAnyFaculty();
  if (!college) return [];
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM students WHERE college = ? AND deleted_at IS NULL ORDER BY createdAt DESC',
      [college.trim()]
    );
    return rows.map(rowToStudent);
  } catch (error) {
    console.error('Fetch students by college error:', error);
    return [];
  }
}

export async function getDeletedStudents(): Promise<StudentRecord[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM students WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    return rows.map(rowToStudent);
  } catch (error) {
    console.error('Fetch deleted students error:', error);
    return [];
  }
}

export async function getDeletedStudentsByCollege(college: string): Promise<StudentRecord[]> {
  await requireAuth(['admin', 'faculty_admin', 'faculty']);
  if (!college) return [];
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM students WHERE college = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      [college.trim()]
    );
    return rows.map(rowToStudent);
  } catch (error) {
    console.error('Fetch deleted students by college error:', error);
    return [];
  }
}

// ── Users ──────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<DbUser[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, c.name AS college, u.created_at
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    return rows as DbUser[];
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
}

export async function getUsersByCollege(college: string): Promise<DbUser[]> {
  await requireAuth(['admin', 'faculty_admin']);
  if (!college) return [];
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, c.name AS college, u.created_at
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE c.name = ? AND u.role = 'faculty' AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
      [college.trim()]
    );
    return rows as DbUser[];
  } catch (error) {
    console.error('Get users by college error:', error);
    return [];
  }
}

export async function getDeletedUsers(): Promise<DbUser[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, c.name AS college, u.created_at, u.deleted_by AS deletedBy
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.deleted_at IS NOT NULL
       ORDER BY u.deleted_at DESC`
    );
    return rows as DbUser[];
  } catch (error) {
    console.error('Get deleted users error:', error);
    return [];
  }
}

export async function getDeletedUsersByCollege(college: string): Promise<DbUser[]> {
  await requireAuth(['admin', 'faculty_admin']);
  if (!college) return [];
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, c.name AS college, u.created_at, u.deleted_by AS deletedBy
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE c.name = ? AND u.role = 'faculty' AND u.deleted_at IS NOT NULL
       ORDER BY u.deleted_at DESC`,
      [college.trim()]
    );
    return rows as DbUser[];
  } catch (error) {
    console.error('Get deleted users by college error:', error);
    return [];
  }
}

export async function deleteUser(id: number, deletedBy?: string) {
  await requireAuth(['admin', 'faculty_admin']);
  if (!id) return { success: false };
  try {
    const by = t(deletedBy) ?? 'Unknown';
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT id, name, email, role, college_id FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    const beforeUser = (beforeRows[0] ?? null) as UserAuditRow | null;
    await withTransaction(async (conn) => {
      await connExecute(conn,
        'UPDATE users SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
        [by, id]
      );
      await logUserAudit('DELETE', beforeUser, null, conn);
    });
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false };
  }
}

export async function restoreUserInDb(id: number): Promise<{ success: boolean }> {
  await requireAuth(['admin', 'faculty_admin']);
  if (!id) return { success: false };
  try {
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT id, name, email, role, college_id, deleted_at, deleted_by FROM users WHERE id = ?', [id]);
    const beforeUser = (beforeRows[0] ?? null) as UserAuditRow | null;
    await withTransaction(async (conn) => {
      await connExecute(conn, 'UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
      const [afterRows] = await connExecute<RowDataPacket[]>(conn, 'SELECT id, name, email, role, college_id FROM users WHERE id = ?', [id]);
      const afterUser = (afterRows[0] ?? null) as UserAuditRow | null;
      await logUserAudit('UPDATE', beforeUser, afterUser, conn);
    });
    return { success: true };
  } catch (error) {
    console.error('Restore user error:', error);
    return { success: false };
  }
}

export async function updateUser(id: number, data: { name: string; email: string; role: string; college?: string | null; passwordHash?: string }) {
  await requireAdmin();
  const name  = t(data.name);
  const email = t(data.email);
  if (!name)  return { success: false, message: 'Name is required.' };
  if (!email) return { success: false, message: 'Email is required.' };

  try {
    const collegeId = await getCollegeId(data.college);
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT id, name, email, role, college_id FROM users WHERE id = ?', [id]);
    const beforeUser = (beforeRows[0] ?? null) as UserAuditRow | null;
    await withTransaction(async (conn) => {
      if (data.passwordHash) {
        await connExecute(conn,
          'UPDATE users SET name=?, email=?, role=?, college_id=?, password=? WHERE id=? AND deleted_at IS NULL',
          [name, email!.toLowerCase(), data.role, collegeId, data.passwordHash, id]
        );
      } else {
        await connExecute(conn,
          'UPDATE users SET name=?, email=?, role=?, college_id=? WHERE id=? AND deleted_at IS NULL',
          [name, email!.toLowerCase(), data.role, collegeId, id]
        );
      }
      await logUserAudit('UPDATE', beforeUser, { id, name: name!, email: email!.toLowerCase(), role: data.role, college_id: collegeId }, conn);
    });
    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false };
  }
}

export async function changeMyPassword(email: string, currentPasswordHash: string, newPasswordHash: string) {
  await requireAnyFaculty();
  const emailClean = t(email);
  if (!emailClean) return { success: false, message: 'Email is required.' };
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? AND password = ? AND deleted_at IS NULL',
      [emailClean.toLowerCase(), currentPasswordHash]
    );
    if (rows.length === 0) return { success: false, message: 'Current password is incorrect.' };
    await dbExecute(
      'UPDATE users SET password = ? WHERE email = ? AND deleted_at IS NULL',
      [newPasswordHash, emailClean.toLowerCase()]
    );
    return { success: true, message: 'Password updated successfully.' };
  } catch {
    return { success: false, message: 'Failed to update password.' };
  }
}

// ── Colleges ───────────────────────────────────────────────────────────────────

export async function getCollegesFromDb() {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT name FROM colleges WHERE deleted_at IS NULL ORDER BY name'
    );
    return rows.map(r => r.name as string);
  } catch {
    return [];
  }
}

export async function addCollegeToDb(name: string) {
  await requireAdmin();
  const trimmed = t(name);
  if (!trimmed) return { success: false, message: 'College name is required.' };
  try {
    const [deleted] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NOT NULL',
      [trimmed]
    );
    if (deleted.length > 0) {
      const beforeCollege = { id: deleted[0].id, name: trimmed, deleted_at: deleted[0].deleted_at ?? null, deleted_by: deleted[0].deleted_by ?? null };
      await withTransaction(async (conn) => {
        await connExecute(conn, 'UPDATE colleges SET deleted_at = NULL WHERE name = ?', [trimmed]);
        await logCollegeAudit('UPDATE', beforeCollege, { id: deleted[0].id, name: trimmed }, conn);
      });
      return { success: true, message: 'College restored successfully.' };
    }
    const [active] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NULL',
      [trimmed]
    );
    if (active.length > 0) return { success: false, message: 'This college already exists.' };

    await withTransaction(async (conn) => {
      await connExecute(conn, 'INSERT INTO colleges (name) VALUES (?)', [trimmed]);
      const [inserted] = await connExecute<RowDataPacket[]>(conn, 'SELECT id, created_at FROM colleges WHERE name = ?', [trimmed]);
      if (inserted[0]) await logCollegeAudit('INSERT', null, { id: inserted[0].id, name: trimmed, created_at: inserted[0].created_at }, conn);
    });
    return { success: true, message: 'College added successfully.' };
  } catch {
    return { success: false, message: 'Failed to add college.' };
  }
}

export async function deleteCollegeFromDb(name: string, deletedBy?: string) {
  await requireAdmin();
  const trimmed = t(name);
  if (!trimmed) return { success: false, message: 'College name is required.' };
  try {
    const by = t(deletedBy) ?? 'Unknown';
    const [rows] = await dbExecute<RowDataPacket[]>('SELECT id, created_at FROM colleges WHERE name = ? AND deleted_at IS NULL', [trimmed]);
    const beforeCollege = rows[0] ? { id: rows[0].id, name: trimmed, created_at: rows[0].created_at ?? null } : null;
    await withTransaction(async (conn) => {
      await connExecute(conn,
        'UPDATE colleges SET deleted_at = NOW(), deleted_by = ? WHERE name = ? AND deleted_at IS NULL',
        [by, trimmed]
      );
      await logCollegeAudit('DELETE', beforeCollege, null, conn);
    });
    return { success: true, message: 'College removed successfully.' };
  } catch {
    return { success: false, message: 'Failed to remove college.' };
  }
}

export async function getDeletedColleges(): Promise<{ name: string; deletedBy: string | null }[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT name, deleted_by AS deletedBy FROM colleges WHERE deleted_at IS NOT NULL ORDER BY name'
    );
    return rows as { name: string; deletedBy: string | null }[];
  } catch {
    return [];
  }
}

export async function restoreCollegeFromDb(name: string): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const trimmed = t(name);
  if (!trimmed) return { success: false, message: 'College name is required.' };
  try {
    const [beforeRows] = await dbExecute<RowDataPacket[]>('SELECT id, created_at, deleted_at FROM colleges WHERE name = ?', [trimmed]);
    await withTransaction(async (conn) => {
      await connExecute(conn, 'UPDATE colleges SET deleted_at = NULL, deleted_by = NULL WHERE name = ?', [trimmed]);
      const [rows] = await connExecute<RowDataPacket[]>(conn, 'SELECT id, created_at FROM colleges WHERE name = ?', [trimmed]);
      if (rows[0]) await logCollegeAudit('UPDATE', { id: rows[0].id, name: trimmed, deleted_at: beforeRows[0]?.deleted_at ?? null }, { id: rows[0].id, name: trimmed, created_at: rows[0].created_at }, conn);
    });
    return { success: true, message: 'College restored successfully.' };
  } catch {
    return { success: false, message: 'Failed to restore college.' };
  }
}

// ── Drafts ─────────────────────────────────────────────────────────────────────

async function ensureDraftsTable() {
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS student_drafts (
      id           VARCHAR(64)  NOT NULL PRIMARY KEY,
      college      VARCHAR(255) NULL,
      name         VARCHAR(255) NULL,
      parentage    VARCHAR(255) NULL,
      studentid    VARCHAR(255) NULL,
      rollNo       VARCHAR(255) NULL,
      studentClass VARCHAR(255) NULL,
      course       VARCHAR(255) NULL,
      year         VARCHAR(100) NULL,
      email        VARCHAR(255) NULL,
      phone        VARCHAR(50)  NULL,
      busStop      VARCHAR(255) NULL,
      bloodGroup   VARCHAR(20)  NULL,
      photo        MEDIUMBLOB,
      saved_by     VARCHAR(255) NOT NULL,
      updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function saveDraftToDb(draft: DraftRecord): Promise<{ success: boolean; message?: string }> {
  await requireAnyFaculty();
  try {
    await ensureDraftsTable();
    const photoBlob = draft.photo
      ? Buffer.from(draft.photo.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : null;
    await dbExecute(
      `INSERT INTO student_drafts
         (id, college, name, parentage, studentid, rollNo, studentClass,
          course, year, email, phone, busStop, bloodGroup, photo, saved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         college=VALUES(college), name=VALUES(name), parentage=VALUES(parentage),
         studentid=VALUES(studentid), rollNo=VALUES(rollNo), studentClass=VALUES(studentClass),
         course=VALUES(course), year=VALUES(year), email=VALUES(email),
         phone=VALUES(phone), busStop=VALUES(busStop), bloodGroup=VALUES(bloodGroup),
         photo=VALUES(photo), saved_by=VALUES(saved_by)`,
      [
        draft.id,
        t(draft.college),
        t(draft.name),
        t(draft.parentage),
        t(draft.studentId),
        t(draft.rollNo),
        t(draft.studentClass),
        t(draft.course),
        t(draft.year),
        t(draft.email),
        t(draft.phone),
        t(draft.busStop),
        t(draft.bloodGroup),
        photoBlob,
        draft.savedBy,
      ]
    );
    return { success: true };
  } catch (error) {
    console.error('Save draft error:', error);
    return { success: false, message: 'Failed to save draft.' };
  }
}

export async function getDraftsByUser(savedBy: string): Promise<DraftRecord[]> {
  await requireAnyFaculty();
  try {
    await ensureDraftsTable();
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM student_drafts WHERE saved_by = ? ORDER BY updated_at DESC',
      [savedBy]
    );
    return (rows as RowDataPacket[]).map(r => {
      let photo: string | undefined;
      const p = r.photo;
      if (p instanceof Buffer && p.length > 0) {
        photo = `data:image/png;base64,${p.toString('base64')}`;
      } else if (typeof p === 'string' && p.length > 0) {
        photo = p;
      }
      return {
        id:           String(r.id),
        college:      String(r.college ?? ''),
        name:         String(r.name ?? ''),
        phone:        String(r.phone ?? ''),
        parentage:    r.parentage    ? String(r.parentage)    : undefined,
        studentId:    r.studentid    ? String(r.studentid)    : undefined,
        rollNo:       r.rollNo       ? String(r.rollNo)       : undefined,
        studentClass: r.studentClass ? String(r.studentClass) : undefined,
        course:       r.course       ? String(r.course)       : undefined,
        year:         r.year         ? String(r.year)         : undefined,
        email:        r.email        ? String(r.email)        : undefined,
        busStop:      r.busStop      ? String(r.busStop)      : undefined,
        bloodGroup:   r.bloodGroup   ? String(r.bloodGroup)   : undefined,
        photo,
        savedBy:    String(r.saved_by),
        updatedAt:  String(r.updated_at),
      } as DraftRecord;
    });
  } catch (error) {
    console.error('Get drafts error:', error);
    return [];
  }
}

export async function deleteDraftFromDb(id: string): Promise<{ success: boolean }> {
  await requireAnyFaculty();
  try {
    await dbExecute('DELETE FROM student_drafts WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Delete draft error:', error);
    return { success: false };
  }
}

// ── Schema helpers ─────────────────────────────────────────────────────────────

export async function ensureCollegesTable() {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS colleges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        deleted_by VARCHAR(255) NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const [count] = await dbExecute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM colleges WHERE deleted_at IS NULL'
    );
    if ((count[0] as RowDataPacket).cnt === 0) {
      for (const name of ['Engineering College', 'Arts & Science College', 'Business School', 'Design Institute']) {
        await dbExecute('INSERT IGNORE INTO colleges (name) VALUES (?)', [name]);
      }
    }
  } catch {
    // Table may already exist
  }
}

export async function migrateRoleEnum() {
  try {
    await dbExecute(
      "ALTER TABLE users MODIFY COLUMN role ENUM('faculty', 'admin', 'faculty_admin') NOT NULL DEFAULT 'faculty'"
    );
  } catch {
    // Already up to date
  }
}

export async function migrateStudentColumns() {
  const cols = [
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS dob VARCHAR(20) DEFAULT NULL",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS percentage VARCHAR(10) DEFAULT NULL",
  ];
  for (const sql of cols) {
    try { await dbExecute(sql); } catch { /* column already exists */ }
  }
}

// ── Audit logs ─────────────────────────────────────────────────────────────────

export async function ensureAuditLogsTable() {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        user_name  VARCHAR(255) NOT NULL DEFAULT '',
        action     VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id  VARCHAR(255),
        details    TEXT,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch { /* already exists */ }
}

export async function addAuditLog(data: {
  userEmail: string;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
}): Promise<void> {
  await requireAnyFaculty();
  const { ip, ua } = await getRequestMeta();
  try {
    await dbExecute(
      `INSERT INTO audit_logs (user_email, user_name, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.userEmail, data.userName, data.action,
       data.entityType ?? null, data.entityId ?? null, data.details ?? null, ip, ua, nowIST()]
    );
  } catch { /* non-critical */ }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT id, user_email AS userEmail, user_name AS userName, action,
              entity_type AS entityType, entity_id AS entityId, details,
              ip_address AS ipAddress, user_agent AS userAgent,
              created_at AS createdAt
       FROM audit_logs ORDER BY created_at DESC LIMIT 500`
    );
    return (rows as RowDataPacket[]).map(r => ({
      ...r,
      createdAt: String(r.createdAt),
    })) as AuditLog[];
  } catch { return []; }
}

export async function getAuditLogsByCollege(college: string): Promise<AuditLog[]> {
  await requireAuth(['admin', 'faculty_admin']);
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT al.id, al.user_email AS userEmail, al.user_name AS userName, al.action,
              al.entity_type AS entityType, al.entity_id AS entityId, al.details,
              al.ip_address AS ipAddress, al.user_agent AS userAgent,
              al.created_at AS createdAt
       FROM audit_logs al
       WHERE al.user_email IN (
         SELECT u.email FROM users u
         LEFT JOIN colleges c ON c.id = u.college_id
         WHERE c.name = ?
       )
       ORDER BY al.created_at DESC LIMIT 300`,
      [college]
    );
    return (rows as RowDataPacket[]).map(r => ({
      ...r,
      createdAt: String(r.createdAt),
    })) as AuditLog[];
  } catch { return []; }
}

// ── Login history ──────────────────────────────────────────────────────────────

export async function ensureLoginHistoryTable() {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS login_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        user_name  VARCHAR(255) NOT NULL DEFAULT '',
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch { /* already exists */ }
}

export async function getLoginHistory(): Promise<LoginHistory[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT id, user_email AS userEmail, user_name AS userName,
              ip_address AS ipAddress, user_agent AS userAgent,
              created_at AS createdAt
       FROM login_history ORDER BY created_at DESC LIMIT 500`
    );
    return (rows as RowDataPacket[]).map(r => ({
      ...r,
      createdAt: String(r.createdAt),
    })) as LoginHistory[];
  } catch { return []; }
}

export async function getLoginHistoryByCollege(college: string): Promise<LoginHistory[]> {
  await requireAuth(['admin', 'faculty_admin']);
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT lh.id, lh.user_email AS userEmail, lh.user_name AS userName,
              lh.ip_address AS ipAddress, lh.user_agent AS userAgent,
              lh.created_at AS createdAt
       FROM login_history lh
       WHERE lh.user_email IN (
         SELECT u.email FROM users u
         LEFT JOIN colleges c ON c.id = u.college_id
         WHERE c.name = ?
       )
       ORDER BY lh.created_at DESC LIMIT 300`,
      [college]
    );
    return (rows as RowDataPacket[]).map(r => ({
      ...r,
      createdAt: String(r.createdAt),
    })) as LoginHistory[];
  } catch { return []; }
}

// ── Combined page-data actions ─────────────────────────────────────────────────

/**
 * Single init call: restores session, runs all schema migrations, and loads
 * the global student + college lists — all in one server round-trip.
 * Replaces getMe() + 6 separate migration calls + getStudents/getCollegesFromDb.
 */
export async function initApp(): Promise<{
  user: User | null;
  students: StudentRecord[];
  colleges: string[];
}> {
  const { ensureAuditTables } = await import('./audit-schema');

  // Restore session first — needed to decide whether to load data
  const sessionUser = await getSessionUser();
  const user = sessionUser ? (sessionUser as unknown as User) : null;

  if (!user) {
    // Run migrations even for guests so tables exist before first login
    Promise.all([
      migrateRoleEnum(),
      migrateStudentColumns(),
      ensureCollegesTable(),
      ensureAuditLogsTable(),
      ensureLoginHistoryTable(),
      ensureAuditTables(),
    ]).catch(() => {});
    return { user: null, students: [], colleges: [] };
  }

  // Run migrations + load data in parallel
  const [, , dbStudents, dbColleges] = await Promise.all([
    Promise.all([
      migrateRoleEnum(),
      migrateStudentColumns(),
      ensureCollegesTable(),
      ensureAuditLogsTable(),
      ensureLoginHistoryTable(),
      ensureAuditTables(),
    ]).catch(() => {}),
    Promise.resolve(), // placeholder for symmetry
    getStudents().catch(() => [] as StudentRecord[]),
    getCollegesFromDb().catch(() => [] as string[]),
  ]);

  return { user, students: dbStudents as StudentRecord[], colleges: dbColleges as string[] };
}

export async function getUsersPageData(): Promise<{ users: DbUser[]; deletedUsers: DbUser[] }> {
  await requireAdmin();
  const [users, deletedUsers] = await Promise.all([getUsers(), getDeletedUsers()]);
  return { users, deletedUsers };
}

export async function getStudentAuditLogs() {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT audit_id AS auditId, operation, snapshot, changed_at AS changedAt,
              changed_by AS changedBy, student_id AS studentId, college, name,
              course, year, studentclass AS studentClass, rollno, phone,
              has_photo AS hasPhoto, deleted_by AS deletedBy
       FROM student_audit
       ORDER BY changed_at DESC LIMIT 500`
    );
    return (rows as RowDataPacket[]).map(r => ({ ...r, changedAt: String(r.changedAt) }));
  } catch { return []; }
}

export async function getUserAuditLogs() {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT ua.audit_id AS auditId, ua.operation, ua.snapshot,
              ua.changed_at AS changedAt, ua.user_id AS userId,
              ua.name, ua.email, ua.role,
              c.name AS college, ua.deleted_by AS deletedBy
       FROM user_audit ua
       LEFT JOIN colleges c ON c.id = ua.college_id
       ORDER BY ua.changed_at DESC LIMIT 500`
    );
    return (rows as RowDataPacket[]).map(r => ({ ...r, changedAt: String(r.changedAt) }));
  } catch { return []; }
}

export async function getCollegeAuditLogs() {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT audit_id AS auditId, operation, snapshot,
              changed_at AS changedAt, college_id AS collegeId,
              name, deleted_by AS deletedBy
       FROM college_audit
       ORDER BY changed_at DESC LIMIT 500`
    );
    return (rows as RowDataPacket[]).map(r => ({ ...r, changedAt: String(r.changedAt) }));
  } catch { return []; }
}

export async function getExportLogs(): Promise<AuditLog[]> {
  await requireAdmin();
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT id, user_email AS userEmail, user_name AS userName, action,
              entity_type AS entityType, entity_id AS entityId, details,
              ip_address AS ipAddress, user_agent AS userAgent,
              created_at AS createdAt
       FROM audit_logs
       WHERE action IN ('export_zip', 'export_excel')
       ORDER BY created_at DESC LIMIT 500`
    );
    return (rows as RowDataPacket[]).map(r => ({ ...r, createdAt: String(r.createdAt) })) as AuditLog[];
  } catch { return []; }
}

export async function getLogsPageData() {
  await requireAdmin();
  const [exportLogs, loginHistory, studentAudit, userAudit, collegeAudit] = await Promise.all([
    getExportLogs(),
    getLoginHistory(),
    getStudentAuditLogs(),
    getUserAuditLogs(),
    getCollegeAuditLogs(),
  ]);
  return { exportLogs, loginHistory, studentAudit, userAudit, collegeAudit };
}

export async function getCollegeDashboardData(college: string): Promise<{ students: StudentRecord[]; deletedStudents: StudentRecord[] }> {
  await requireAnyFaculty();
  if (!college) return { students: [], deletedStudents: [] };
  const [students, deletedStudents] = await Promise.all([
    getStudentsByCollege(college),
    getDeletedStudentsByCollege(college),
  ]);
  return { students, deletedStudents };
}

export async function getAppInitData(): Promise<{ students: StudentRecord[]; colleges: string[] }> {
  await requireAnyFaculty();
  const [students, colleges] = await Promise.all([getStudents(), getCollegesFromDb()]);
  return { students, colleges };
}

export async function migrateBase64PhotosToBlob(): Promise<{ success: boolean; migrated: number; message: string }> {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      "SELECT id, photo FROM students WHERE photo IS NOT NULL AND photo != ''"
    );
    const base64Rows = (rows as RowDataPacket[]).filter(r => typeof r.photo === 'string' && r.photo.length > 0);
    let migrated = 0;
    for (const row of base64Rows) {
      const raw  = (row.photo as string).replace(/^data:image\/\w+;base64,/, '');
      const blob = Buffer.from(raw, 'base64');
      await dbExecute('UPDATE students SET photo = ? WHERE id = ?', [blob, row.id]);
      migrated++;
    }
    return { success: true, migrated, message: `Migrated ${migrated} photo(s) from base64 to BLOB.` };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, migrated: 0, message: 'Migration failed.' };
  }
}

// ── Public inquiry form ────────────────────────────────────────────────────────

export interface InquiryData {
  institutionName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
}

export async function submitInquiry(
  data: InquiryData
): Promise<{ success: boolean; message: string }> {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS contact_inquiries (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        institution_name VARCHAR(255) NOT NULL,
        contact_name    VARCHAR(255) NOT NULL,
        email           VARCHAR(255) NOT NULL,
        phone           VARCHAR(50),
        message         TEXT,
        status          ENUM('new','read','replied') NOT NULL DEFAULT 'new',
        created_at      DATETIME NOT NULL
      )
    `);

    const name   = t(data.institutionName);
    const person = t(data.contactName);
    const email  = t(data.email);

    if (!name || !person || !email) {
      return { success: false, message: 'Institution name, your name, and email are required.' };
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    await dbExecute(
      `INSERT INTO contact_inquiries
         (institution_name, contact_name, email, phone, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        person,
        email,
        t(data.phone) ?? null,
        t(data.message) ?? null,
        nowIST(),
      ]
    );

    return { success: true, message: "Thank you! We'll be in touch within 24 hours." };
  } catch (err) {
    console.error('submitInquiry error:', err);
    return { success: false, message: 'Something went wrong. Please try again or contact us directly.' };
  }
}

// ── College assets (logo + signature) ─────────────────────────────────────────

async function ensureCollegeAssetsTable() {
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS college_assets (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      college        VARCHAR(255) NOT NULL UNIQUE,
      logo           MEDIUMBLOB,
      logo_mime      VARCHAR(50),
      signature      MEDIUMBLOB,
      sig_mime       VARCHAR(50),
      student_count  INT UNSIGNED,
      updated_at     DATETIME NOT NULL,
      updated_by     VARCHAR(255)
    )
  `);
  // Add column if table already existed without it
  await dbExecute(`
    ALTER TABLE college_assets
    ADD COLUMN IF NOT EXISTS student_count INT UNSIGNED
  `).catch(() => {});
}

function dataUrlToBlob(dataUrl: string | null | undefined): { buf: Buffer | null; mime: string | null } {
  if (!dataUrl) return { buf: null, mime: null };
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { buf: null, mime: null };
  return { buf: Buffer.from(m[2], 'base64'), mime: m[1] };
}

function blobToDataUrl(blob: unknown, mime: unknown): string | null {
  if (!blob || !mime) return null;
  const buf = blob instanceof Buffer ? blob : Buffer.from(blob as Uint8Array);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function saveCollegeAssets(data: {
  college: string;
  logo?: string | null;
  signature?: string | null;
  studentCount?: number | null;
  updatedBy: string;
}): Promise<{ success: boolean; message: string }> {
  await requireAnyFaculty();
  try {
    await ensureCollegeAssetsTable();

    const logo   = dataUrlToBlob(data.logo);
    const sig    = dataUrlToBlob(data.signature);
    const count  = data.studentCount != null && data.studentCount > 0 ? data.studentCount : null;

    const [existing] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM college_assets WHERE college = ?', [data.college]
    );

    if (existing.length > 0) {
      await dbExecute(
        `UPDATE college_assets
           SET logo = ?, logo_mime = ?, signature = ?, sig_mime = ?,
               student_count = ?, updated_at = ?, updated_by = ?
         WHERE college = ?`,
        [logo.buf, logo.mime, sig.buf, sig.mime, count, nowIST(), data.updatedBy, data.college]
      );
    } else {
      await dbExecute(
        `INSERT INTO college_assets
           (college, logo, logo_mime, signature, sig_mime, student_count, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.college, logo.buf, logo.mime, sig.buf, sig.mime, count, nowIST(), data.updatedBy]
      );
    }

    return { success: true, message: 'Assets saved successfully.' };
  } catch (err) {
    console.error('saveCollegeAssets error:', err);
    return { success: false, message: 'Failed to save assets. Please try again.' };
  }
}

// ── Callback requests ──────────────────────────────────────────────────────────

export type CallbackReason = 'product_details' | 'onboarding' | 'support';

export async function submitCallbackRequest(data: {
  phone: string;
  reason: CallbackReason;
}): Promise<{ success: boolean; message: string }> {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS callback_requests (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        phone      VARCHAR(50)  NOT NULL,
        reason     ENUM('product_details','onboarding','support') NOT NULL,
        status     ENUM('pending','called','resolved') NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL
      )
    `);

    const phone = t(data.phone);
    if (!phone) return { success: false, message: 'Please enter your phone number.' };

    const phoneRe = /^[+\d\s\-()]{6,20}$/;
    if (!phoneRe.test(phone)) return { success: false, message: 'Please enter a valid phone number.' };

    await dbExecute(
      `INSERT INTO callback_requests (phone, reason, created_at) VALUES (?, ?, ?)`,
      [phone, data.reason, nowIST()]
    );

    return { success: true, message: "We've received your request. Expect a call within a few hours." };
  } catch (err) {
    console.error('submitCallbackRequest error:', err);
    return { success: false, message: 'Something went wrong. Please call us directly at +91 95410 2246.' };
  }
}

export async function getCollegeAssets(
  college: string
): Promise<{ logo: string | null; signature: string | null; studentCount: number | null }> {
  await requireAnyFaculty();
  try {
    await ensureCollegeAssetsTable();
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT logo, logo_mime, signature, sig_mime, student_count FROM college_assets WHERE college = ?',
      [college]
    );
    if (rows.length === 0) return { logo: null, signature: null, studentCount: null };
    const r = rows[0] as Record<string, unknown>;
    return {
      logo:         blobToDataUrl(r.logo,      r.logo_mime),
      signature:    blobToDataUrl(r.signature, r.sig_mime),
      studentCount: r.student_count != null ? Number(r.student_count) : null,
    };
  } catch {
    return { logo: null, signature: null, studentCount: null };
  }
}
