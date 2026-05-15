export type UserRole = 'faculty' | 'admin' | 'faculty_admin';

export interface AuditLog {
  id: number;
  userEmail: string;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LoginHistory {
  id: number;
  userEmail: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

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
  deletedBy?: string | null;
}

export interface DraftRecord {
  id: string;
  college: string;
  name: string;
  phone: string;
  studentId?: string;
  course?: string;
  year?: string;
  email?: string;
  parentage?: string;
  rollNo?: string;
  studentClass?: string;
  busStop?: string;
  bloodGroup?: string;
  dob?: string;
  address?: string;
  photo?: string;
  savedBy: string;
  updatedAt: string;
}

export interface StudentRecord {
  id: string;
  college: string;
  name: string;
  phone: string;
  createdAt: string;
  studentId?: string;
  course?: string;
  year?: string;
  email?: string;
  parentage?: string;
  rollNo?: string;
  studentClass?: string;
  busStop?: string;
  bloodGroup?: string;
  dob?: string;
  address?: string;
  photo?: string;
  createdBy?: string;
  deletedBy?: string | null;
}
