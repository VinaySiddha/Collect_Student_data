'use server';

import { dbExecute } from './db';
import { User, StudentRecord, UserRole, DbUser, DraftRecord, AuditLog, LoginHistory } from './types';
import { RowDataPacket } from 'mysql2';
import { headers } from 'next/headers';

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
    // Record login history (non-blocking)
    const { ip, ua } = await getRequestMeta();
    dbExecute(
      'INSERT INTO login_history (user_email, user_name, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?)',
      [emailClean.toLowerCase(), u.name ?? email, ip, ua, nowIST()]
    ).catch(() => {});
    return { success: true, message: 'Login successful.', user: rows[0] as User };
  } catch {
    return { success: false, message: 'Database connection failed.' };
  }
}

export async function registerUser(name: string, email: string, passwordHash: string, role: UserRole, college?: string) {
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
    await dbExecute(
      'INSERT INTO users (name, email, password, role, college_id) VALUES (?, ?, ?, ?, ?)',
      [nameClean, emailClean.toLowerCase(), passwordHash, role, collegeId]
    );
    return { success: true, message: 'Registration complete. Welcome!', user: { name: nameClean, email: emailClean, password: passwordHash, role, college } as User };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Failed to create account.' };
  }
}

// ── Students ───────────────────────────────────────────────────────────────────

export async function addStudentToDb(student: StudentRecord) {
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
    await dbExecute(
      `INSERT INTO students
         (id, college, name, parentage, studentid, rollNo, studentClass,
          course, year, email, phone, busStop, bloodGroup, photo, createdby)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.id,
        college,
        name,
        t(student.parentage),
        t(student.studentId),
        t(student.rollNo),
        t(student.studentClass),
        t(student.course),
        t(student.year),
        t(student.email),
        phone,
        t(student.busStop),
        t(student.bloodGroup),
        photoBlob,
        t(student.createdBy) ?? 'Unknown',
      ]
    );
    return { success: true, message: 'Student registered successfully.' };
  } catch (error: unknown) {
    console.error('Add student error:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Duplicate entry')) return { success: false, message: 'A student with this ID already exists.' };
    return { success: false, message: 'Failed to save student record.' };
  }
}

export async function updateStudentInDb(student: StudentRecord) {
  const name  = t(student.name);
  const phone = t(student.phone);
  if (!name)  return { success: false, message: 'Student name is required.' };
  if (!phone) return { success: false, message: 'Phone number is required.' };

  // For updates: NULL photo means "keep existing" — but since photo is NOT NULL in DB
  // we preserve the old value by not updating it when null.
  try {
    if (student.photo) {
      const photoBlob = Buffer.from(student.photo.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await dbExecute(
        `UPDATE students SET
           college=?, name=?, parentage=?, studentid=?, rollNo=?, studentClass=?,
           course=?, year=?, email=?, phone=?, busStop=?, bloodGroup=?, photo=?
         WHERE id=? AND deleted_at IS NULL`,
        [
          t(student.college) ?? student.college,
          name,
          t(student.parentage),
          t(student.studentId),
          t(student.rollNo),
          t(student.studentClass),
          t(student.course),
          t(student.year),
          t(student.email),
          phone,
          t(student.busStop),
          t(student.bloodGroup),
          photoBlob,
          student.id,
        ]
      );
    } else {
      // No new photo — update all other fields, leave photo column untouched
      await dbExecute(
        `UPDATE students SET
           college=?, name=?, parentage=?, studentid=?, rollNo=?, studentClass=?,
           course=?, year=?, email=?, phone=?, busStop=?, bloodGroup=?
         WHERE id=? AND deleted_at IS NULL`,
        [
          t(student.college) ?? student.college,
          name,
          t(student.parentage),
          t(student.studentId),
          t(student.rollNo),
          t(student.studentClass),
          t(student.course),
          t(student.year),
          t(student.email),
          phone,
          t(student.busStop),
          t(student.bloodGroup),
          student.id,
        ]
      );
    }
    return { success: true, message: 'Student updated successfully.' };
  } catch (error) {
    console.error('Update student error:', error);
    return { success: false, message: 'Failed to update student record.' };
  }
}

export async function deleteStudentFromDb(id: string, deletedBy?: string) {
  if (!id) return { success: false, message: 'Student ID is required.' };
  try {
    await dbExecute(
      'UPDATE students SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
      [t(deletedBy) ?? 'Unknown', id]
    );
    return { success: true };
  } catch (error) {
    console.error('Delete student error:', error);
    return { success: false };
  }
}

export async function restoreStudentInDb(id: string): Promise<{ success: boolean }> {
  if (!id) return { success: false };
  try {
    await dbExecute('UPDATE students SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Restore student error:', error);
    return { success: false };
  }
}

export async function getStudents() {
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
  if (!id) return { success: false };
  try {
    await dbExecute(
      'UPDATE users SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
      [t(deletedBy) ?? 'Unknown', id]
    );
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false };
  }
}

export async function restoreUserInDb(id: number): Promise<{ success: boolean }> {
  if (!id) return { success: false };
  try {
    await dbExecute('UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Restore user error:', error);
    return { success: false };
  }
}

export async function updateUser(id: number, data: { name: string; email: string; role: string; college?: string | null; passwordHash?: string }) {
  const name  = t(data.name);
  const email = t(data.email);
  if (!name)  return { success: false, message: 'Name is required.' };
  if (!email) return { success: false, message: 'Email is required.' };

  try {
    const collegeId = await getCollegeId(data.college);
    if (data.passwordHash) {
      await dbExecute(
        'UPDATE users SET name=?, email=?, role=?, college_id=?, password=? WHERE id=? AND deleted_at IS NULL',
        [name, email.toLowerCase(), data.role, collegeId, data.passwordHash, id]
      );
    } else {
      await dbExecute(
        'UPDATE users SET name=?, email=?, role=?, college_id=? WHERE id=? AND deleted_at IS NULL',
        [name, email.toLowerCase(), data.role, collegeId, id]
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false };
  }
}

export async function changeMyPassword(email: string, currentPasswordHash: string, newPasswordHash: string) {
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
  const trimmed = t(name);
  if (!trimmed) return { success: false, message: 'College name is required.' };
  try {
    const [deleted] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NOT NULL',
      [trimmed]
    );
    if (deleted.length > 0) {
      await dbExecute('UPDATE colleges SET deleted_at = NULL WHERE name = ?', [trimmed]);
      return { success: true, message: 'College restored successfully.' };
    }
    const [active] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NULL',
      [trimmed]
    );
    if (active.length > 0) return { success: false, message: 'This college already exists.' };

    await dbExecute('INSERT INTO colleges (name) VALUES (?)', [trimmed]);
    return { success: true, message: 'College added successfully.' };
  } catch {
    return { success: false, message: 'Failed to add college.' };
  }
}

export async function deleteCollegeFromDb(name: string, deletedBy?: string) {
  const trimmed = t(name);
  if (!trimmed) return { success: false, message: 'College name is required.' };
  try {
    await dbExecute(
      'UPDATE colleges SET deleted_at = NOW(), deleted_by = ? WHERE name = ? AND deleted_at IS NULL',
      [t(deletedBy) ?? 'Unknown', trimmed]
    );
    return { success: true, message: 'College removed successfully.' };
  } catch {
    return { success: false, message: 'Failed to remove college.' };
  }
}

export async function getDeletedColleges(): Promise<{ name: string; deletedBy: string | null }[]> {
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
  const trimmed = t(name);
  if (!trimmed) return { success: false, message: 'College name is required.' };
  try {
    await dbExecute('UPDATE colleges SET deleted_at = NULL, deleted_by = NULL WHERE name = ?', [trimmed]);
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
