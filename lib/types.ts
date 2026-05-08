export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
  name: string;
  email: string;
  password: string;
  college?: string;
  role: UserRole;
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
