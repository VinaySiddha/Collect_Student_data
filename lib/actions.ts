'use server';

import { dbExecute } from './db';
import { User, StudentRecord, UserRole, DbUser } from './types';
import { RowDataPacket } from 'mysql2';

// MySQL returns BLOB columns as Buffer/Uint8Array — convert to base64 data URL for client components
function normalizeStudentRow(row: RowDataPacket): StudentRecord {
  const photo = row.photo;
  let photoStr: string | undefined;
  if (photo instanceof Buffer || photo instanceof Uint8Array) {
    const b64 = Buffer.from(photo).toString('base64');
    photoStr = b64 ? `data:image/png;base64,${b64}` : undefined;
  } else if (typeof photo === 'string' && photo.length > 0) {
    photoStr = photo;
  }
  return { ...row, photo: photoStr } as StudentRecord;
}

async function getCollegeId(name: string | null | undefined): Promise<number | null> {
  if (!name) return null;
  const [rows] = await dbExecute<RowDataPacket[]>(
    'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NULL',
    [name.trim()]
  );
  return rows.length > 0 ? (rows[0] as RowDataPacket).id as number : null;
}

export async function loginUser(email: string, passwordHash: string) {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.*, c.name AS college
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE u.email = ? AND u.password = ? AND u.deleted_at IS NULL`,
      [email.toLowerCase(), passwordHash]
    );
    if (rows.length === 0) {
      return { success: false, message: 'Invalid email or password.' };
    }
    return { success: true, message: 'Login successful.', user: rows[0] as User };
  } catch {
    return { success: false, message: 'Database connection failed.' };
  }
}

export async function registerUser(name: string, email: string, passwordHash: string, role: UserRole, college?: string) {
  try {
    const [existing] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const collegeId = await getCollegeId(college);

    await dbExecute(
      'INSERT INTO users (name, email, password, role, college_id) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), passwordHash, role, collegeId]
    );

    const newUser: User = { name, email, password: passwordHash, role, college };
    return { success: true, message: 'Registration complete. Welcome!', user: newUser };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Failed to create account.' };
  }
}

export async function getStudents() {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM students WHERE deleted_at IS NULL ORDER BY createdAt DESC'
    );
    return rows.map(normalizeStudentRow);
  } catch (error) {
    console.error('Fetch students error:', error);
    return [];
  }
}

export async function addStudentToDb(student: StudentRecord) {
  try {
    await dbExecute(
      `INSERT INTO students
         (id, college, name, parentage, studentId, rollNo, studentClass,
          course, year, email, phone, busStop, bloodGroup, photo, photoId, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.id, student.college, student.name,
        student.parentage    ?? null,
        student.studentId    ?? null,
        student.rollNo       ?? null,
        student.studentClass ?? null,
        student.course       ?? null,
        student.year         ?? null,
        student.email        ?? null,
        student.phone,
        student.busStop      ?? null,
        student.bloodGroup   ?? null,
        student.photo        ?? null,
        student.photoId      ?? null,
        student.createdBy    ?? null,
      ]
    );
    return { success: true };
  } catch (error) {
    console.error('Add student error:', error);
    return { success: false };
  }
}

export async function deleteStudentFromDb(id: string, deletedBy?: string) {
  try {
    await dbExecute('UPDATE students SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy ?? null, id]);
    return { success: true };
  } catch (error) {
    console.error('Delete student error:', error);
    return { success: false };
  }
}

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

export async function deleteUser(id: number, deletedBy?: string) {
  try {
    await dbExecute('UPDATE users SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy ?? null, id]);
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false };
  }
}

export async function updateUser(id: number, data: { name: string; email: string; role: string; college?: string | null; passwordHash?: string }) {
  try {
    const collegeId = await getCollegeId(data.college);
    if (data.passwordHash) {
      await dbExecute(
        'UPDATE users SET name=?, email=?, role=?, college_id=?, password=? WHERE id=? AND deleted_at IS NULL',
        [data.name, data.email.toLowerCase(), data.role, collegeId, data.passwordHash, id]
      );
    } else {
      await dbExecute(
        'UPDATE users SET name=?, email=?, role=?, college_id=? WHERE id=? AND deleted_at IS NULL',
        [data.name, data.email.toLowerCase(), data.role, collegeId, id]
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false };
  }
}

export async function updateStudentInDb(student: StudentRecord) {
  try {
    await dbExecute(
      'UPDATE students SET college=?, name=?, studentId=?, course=?, year=?, email=?, phone=? WHERE id=? AND deleted_at IS NULL',
      [student.college, student.name, student.studentId, student.course, student.year, student.email, student.phone, student.id]
    );
    return { success: true };
  } catch (error) {
    console.error('Update student error:', error);
    return { success: false };
  }
}

export async function getUsersByCollege(college: string): Promise<DbUser[]> {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, c.name AS college, u.created_at
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE c.name = ? AND u.role = 'faculty' AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
      [college]
    );
    return rows as DbUser[];
  } catch (error) {
    console.error('Get users by college error:', error);
    return [];
  }
}

export async function getStudentsByCollege(college: string): Promise<StudentRecord[]> {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM students WHERE college = ? AND deleted_at IS NULL ORDER BY createdAt DESC',
      [college]
    );
    return rows.map(normalizeStudentRow);
  } catch (error) {
    console.error('Fetch students by college error:', error);
    return [];
  }
}

export async function migrateRoleEnum() {
  try {
    await dbExecute(
      "ALTER TABLE users MODIFY COLUMN role ENUM('faculty', 'admin', 'faculty_admin') NOT NULL DEFAULT 'faculty'"
    );
  } catch {
    // Already migrated or no structural change needed
  }
}


export async function ensureCollegesTable() {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS colleges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const [count] = await dbExecute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM colleges WHERE deleted_at IS NULL'
    );
    if ((count[0] as RowDataPacket).cnt === 0) {
      const defaultColleges = ['Engineering College', 'Arts & Science College', 'Business School', 'Design Institute'];
      for (const name of defaultColleges) {
        await dbExecute('INSERT IGNORE INTO colleges (name) VALUES (?)', [name]);
      }
    }
  } catch {
    // Table may already exist or DB not reachable
  }
}

export async function addCollegeToDb(name: string) {
  const trimmed = name.trim();
  try {
    // If a soft-deleted college with this name exists, restore it
    const [deleted] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NOT NULL',
      [trimmed]
    );
    if (deleted.length > 0) {
      await dbExecute('UPDATE colleges SET deleted_at = NULL WHERE name = ?', [trimmed]);
      return { success: true, message: 'College restored successfully.' };
    }

    // Check for an active college with the same name
    const [active] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM colleges WHERE name = ? AND deleted_at IS NULL',
      [trimmed]
    );
    if (active.length > 0) {
      return { success: false, message: 'This college already exists.' };
    }

    await dbExecute('INSERT INTO colleges (name) VALUES (?)', [trimmed]);
    return { success: true, message: 'College added successfully.' };
  } catch {
    return { success: false, message: 'Failed to add college.' };
  }
}

export async function deleteCollegeFromDb(name: string, deletedBy?: string) {
  try {
    await dbExecute('UPDATE colleges SET deleted_at = NOW(), deleted_by = ? WHERE name = ?', [deletedBy ?? null, name]);
    return { success: true, message: 'College removed successfully.' };
  } catch {
    return { success: false, message: 'Failed to remove college.' };
  }
}

export async function changeMyPassword(email: string, currentPasswordHash: string, newPasswordHash: string) {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? AND password = ? AND deleted_at IS NULL',
      [email.toLowerCase(), currentPasswordHash]
    );
    if (rows.length === 0) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    await dbExecute(
      'UPDATE users SET password = ? WHERE email = ? AND deleted_at IS NULL',
      [newPasswordHash, email.toLowerCase()]
    );
    return { success: true, message: 'Password updated successfully.' };
  } catch {
    return { success: false, message: 'Failed to update password.' };
  }
}

export async function getCollegesFromDb() {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT name FROM colleges WHERE deleted_at IS NULL ORDER BY name'
    );
    return rows.map(r => r.name as string);
  } catch {
    return ['Engineering College', 'Arts & Science College', 'Business School', 'Design Institute'];
  }
}

export async function getDeletedStudents(): Promise<StudentRecord[]> {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT *, deleted_by AS deletedBy FROM students WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    return rows.map(normalizeStudentRow);
  } catch (error) {
    console.error('Fetch deleted students error:', error);
    return [];
  }
}

export async function getDeletedStudentsByCollege(college: string): Promise<StudentRecord[]> {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT *, deleted_by AS deletedBy FROM students WHERE college = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      [college]
    );
    return rows.map(normalizeStudentRow);
  } catch (error) {
    console.error('Fetch deleted students by college error:', error);
    return [];
  }
}

export async function restoreStudentInDb(id: string): Promise<{ success: boolean }> {
  try {
    await dbExecute('UPDATE students SET deleted_at = NULL WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Restore student error:', error);
    return { success: false };
  }
}

export async function getDeletedUsersByCollege(college: string): Promise<DbUser[]> {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, c.name AS college, u.created_at, u.deleted_by AS deletedBy
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE c.name = ? AND u.role = 'faculty' AND u.deleted_at IS NOT NULL
       ORDER BY u.deleted_at DESC`,
      [college]
    );
    return rows as DbUser[];
  } catch (error) {
    console.error('Get deleted users by college error:', error);
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

export async function restoreUserInDb(id: number): Promise<{ success: boolean }> {
  try {
    await dbExecute('UPDATE users SET deleted_at = NULL WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Restore user error:', error);
    return { success: false };
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
  try {
    await dbExecute('UPDATE colleges SET deleted_at = NULL WHERE name = ?', [name]);
    return { success: true, message: 'College restored successfully.' };
  } catch {
    return { success: false, message: 'Failed to restore college.' };
  }
}
