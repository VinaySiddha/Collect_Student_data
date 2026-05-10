export type UserRole = 'faculty' | 'admin';

export interface User {
  name: string;
  email: string;
  password: string;
  college?: string;
  role: UserRole;
}

export interface DbUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  college?: string | null;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  college: string;
  name: string;
  studentId: string;
  course: string;
  year: string;
  email: string;
  phone: string;
  photo?: string;
  createdBy?: string;
  createdAt: string;
}
