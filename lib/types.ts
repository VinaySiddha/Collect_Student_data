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

export interface StudentAuditRow {
  auditId: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  snapshot: 'BEFORE' | 'AFTER';
  changedAt: string;
  changedBy: string | null;
  studentId: string;
  college: string | null;
  name: string | null;
  course: string | null;
  year: string | null;
  studentClass: string | null;
  rollno: string | null;
  phone: string | null;
  hasPhoto: number | null;
  deletedBy: string | null;
}

export interface UserAuditRow {
  auditId: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  snapshot: 'BEFORE' | 'AFTER';
  changedAt: string;
  userId: number;
  name: string | null;
  email: string | null;
  role: string | null;
  college: string | null;
  deletedBy: string | null;
}

export interface CollegeAuditRow {
  auditId: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  snapshot: 'BEFORE' | 'AFTER';
  changedAt: string;
  collegeId: number;
  name: string | null;
  deletedBy: string | null;
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
  percentage?: string;
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
  percentage?: string;
  photo?: string;
  createdBy?: string;
  deletedBy?: string | null;
}
