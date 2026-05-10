import { StudentRecord, User } from './types';

const USERS_KEY = 'student-id-users';
const STUDENTS_KEY = 'student-id-students';
const AUTH_KEY = 'student-id-auth';
const COLLEGES_KEY = 'student-id-colleges';

const defaultAdmin: User = {
  name: 'Admin User',
  email: 'admin@college.edu',
  password: 'Admin@123',
  role: 'admin',
};

const defaultColleges = ['Engineering College', 'Arts & Science College', 'Business School', 'Design Institute'];

export function loadUsers(): User[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as User[]) : [];
    if (!parsed.find((user) => user.email === defaultAdmin.email)) {
      parsed.push(defaultAdmin);
      saveUsers(parsed);
    }
    return parsed;
  } catch {
    return [defaultAdmin];
  }
}

export function saveUsers(users: User[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadStudents(): StudentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STUDENTS_KEY);
    return raw ? (JSON.parse(raw) as StudentRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStudents(students: StudentRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function loadAuthEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_KEY);
}

export function saveAuthEmail(email: string | null) {
  if (typeof window === 'undefined') return;
  if (email) {
    window.localStorage.setItem(AUTH_KEY, email);
  } else {
    window.localStorage.removeItem(AUTH_KEY);
  }
}

const AUTH_USER_KEY = 'student-id-auth-user';

type StoredUser = { name: string; email: string; role: string; college?: string };

export function saveAuthUser(user: StoredUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function loadAuthUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function loadColleges(): string[] {
  if (typeof window === 'undefined') return defaultColleges;
  try {
    const raw = window.localStorage.getItem(COLLEGES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    if (!parsed?.length) {
      saveColleges(defaultColleges);
      return defaultColleges;
    }
    return parsed;
  } catch {
    saveColleges(defaultColleges);
    return defaultColleges;
  }
}

export function saveColleges(colleges: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COLLEGES_KEY, JSON.stringify(colleges));
}
