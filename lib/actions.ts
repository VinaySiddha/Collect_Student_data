'use server';

import { dbExecute } from './db';
import { User, StudentRecord, UserRole } from './types';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';

function hashPassword(password: string, email: string) {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase()}:${password}`)
    .digest('hex');
}

export async function loginUser(email: string, password: string, role: UserRole) {
  try {
    const hashedPassword = hashPassword(password, email);
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?',
      [email.toLowerCase(), hashedPassword, role]
    );

    if (rows.length === 0) {
      // Fallback: plain-text password check for legacy/transition accounts
      const [plainRows] = await dbExecute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?',
        [email.toLowerCase(), password, role]
      );

      if (plainRows.length > 0) {
        return { success: true, message: 'Login successful.', user: plainRows[0] as User };
      }

      return { success: false, message: 'Invalid credentials or role.' };
    }

    return { success: true, message: 'Login successful.', user: rows[0] as User };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Database connection failed.' };
  }
}

export async function registerUser(name: string, email: string, password: string, role: UserRole, college?: string) {
  try {
    const [existing] = await dbExecute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const hashedPassword = hashPassword(password, email);

    await dbExecute(
      'INSERT INTO users (name, email, password, role, college) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), hashedPassword, role, college ?? null]
    );

    const newUser: User = { name, email, password: hashedPassword, role, college };
    return { success: true, message: 'Registration complete. Welcome!', user: newUser };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Failed to create account.' };
  }
}

export async function getStudents() {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>('SELECT * FROM students ORDER BY createdAt DESC');
    return rows as StudentRecord[];
  } catch (error) {
    console.error('Fetch students error:', error);
    return [];
  }
}

export async function addStudentToDb(student: StudentRecord) {
  try {
    await dbExecute(
      'INSERT INTO students (id, college, name, studentId, course, year, email, phone, photo, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student.id, student.college, student.name, student.studentId, student.course, student.year, student.email, student.phone, student.photo ?? null, student.createdBy ?? null]
    );
    return { success: true };
  } catch (error) {
    console.error('Add student error:', error);
    return { success: false };
  }
}

export async function deleteStudentFromDb(id: string) {
  try {
    await dbExecute('DELETE FROM students WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Delete student error:', error);
    return { success: false };
  }
}

export async function getCollegesFromDb() {
  try {
    const [rows] = await dbExecute<RowDataPacket[]>(
      'SELECT DISTINCT college FROM users WHERE college IS NOT NULL'
    );
    const userColleges = rows.map(r => r.college as string);
    const defaultColleges = ['Engineering College', 'Arts & Science College', 'Business School', 'Design Institute'];
    return Array.from(new Set([...defaultColleges, ...userColleges]));
  } catch {
    return ['Engineering College', 'Arts & Science College', 'Business School', 'Design Institute'];
  }
}
