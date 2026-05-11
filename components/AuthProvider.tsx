'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadAuthEmail, saveAuthEmail, saveAuthUser, loadAuthUser } from '@/lib/storage';
import { hashPasswordClient } from '@/lib/clientHash';
import { StudentRecord, User, UserRole } from '@/lib/types';
import {
  loginUser,
  registerUser,
  getStudents,
  addStudentToDb,
  deleteStudentFromDb,
  updateStudentInDb,
  getCollegesFromDb,
  migrateRoleEnum,
  ensureCollegesTable,
  addCollegeToDb,
  deleteCollegeFromDb,
} from '@/lib/actions';

interface AuthContextValue {
  user: User | null;
  initialized: boolean;
  students: StudentRecord[];
  colleges: string[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; role: UserRole | null }>;
  register: (name: string, email: string, password: string, role: UserRole, college?: string) => Promise<{ success: boolean; message: string }>;
  addCollege: (college: string) => Promise<{ success: boolean; message: string }>;
  removeCollege: (college: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  addStudent: (student: StudentRecord) => Promise<void>;
  importStudents: (newStudents: StudentRecord[]) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  updateStudent: (student: StudentRecord) => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshColleges: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      // Restore user session from localStorage before any async work
      const storedUser = loadAuthUser();
      if (storedUser) {
        setUser(storedUser as User);
      }

      await Promise.all([migrateRoleEnum(), ensureCollegesTable()]);

      const [dbStudents, dbColleges] = await Promise.all([
        getStudents(),
        getCollegesFromDb(),
      ]);
      setStudents(dbStudents);
      setColleges(dbColleges);

      setInitialized(true);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const passwordHash = await hashPasswordClient(email, password);
    const result = await loginUser(email, passwordHash);
    if (result.success && result.user) {
      saveAuthEmail(result.user.email);
      saveAuthUser({
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        college: result.user.college,
      });
      setUser(result.user);
      return { success: true, message: result.message, role: result.user.role as UserRole };
    }
    return { success: false, message: result.message, role: null };
  };

  const register = async (name: string, email: string, password: string, role: UserRole, college?: string) => {
    const passwordHash = await hashPasswordClient(email, password);
    const result = await registerUser(name, email, passwordHash, role, college);
    if (result.success && result.user) {
      saveAuthEmail(result.user.email);
      saveAuthUser({
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        college: result.user.college,
      });
      setUser(result.user);
    }
    return { success: result.success, message: result.message };
  };

  const addCollege = async (college: string) => {
    const normalized = college.trim();
    if (!normalized) {
      return { success: false, message: 'Please provide a valid college name.' };
    }
    const result = await addCollegeToDb(normalized);
    if (result.success) {
      setColleges(prev => [...prev, normalized].sort());
    }
    return result;
  };

  const removeCollege = async (college: string) => {
    const normalized = college.trim();
    if (!normalized) {
      return { success: false, message: 'Invalid college name.' };
    }
    const associatedStudents = students.filter((record) => record.college === normalized);
    if (associatedStudents.length > 0) {
      return { success: false, message: 'Cannot remove a college that still has students.' };
    }
    const result = await deleteCollegeFromDb(normalized, user?.name || user?.email);
    if (result.success) {
      setColleges(prev => prev.filter(c => c !== normalized));
    }
    return result;
  };

  const logout = () => {
    saveAuthEmail(null);
    saveAuthUser(null);
    setUser(null);
    window.location.href = '/login';
  };

  const addStudent = async (student: StudentRecord) => {
    const result = await addStudentToDb(student);
    if (result.success) {
      setStudents([student, ...students]);
    }
  };

  const importStudents = async (newStudents: StudentRecord[]) => {
    for (const student of newStudents) {
      await addStudentToDb(student);
    }
    setStudents([...newStudents, ...students]);
  };

  const deleteStudent = async (id: string) => {
    const result = await deleteStudentFromDb(id, user?.name || user?.email);
    if (result.success) {
      setStudents(students.filter((record) => record.id !== id));
    }
  };

  const updateStudent = async (student: StudentRecord) => {
    const result = await updateStudentInDb(student);
    if (result.success) {
      setStudents(students.map((r) => (r.id === student.id ? student : r)));
    }
  };

  const refreshStudents = async () => {
    const dbStudents = await getStudents();
    setStudents(dbStudents);
  };

  const refreshColleges = async () => {
    const dbColleges = await getCollegesFromDb();
    setColleges(dbColleges);
  };

  return (
    <AuthContext.Provider value={{
      user,
      initialized,
      students,
      colleges,
      login,
      register,
      addCollege,
      removeCollege,
      logout,
      addStudent,
      importStudents,
      deleteStudent,
      updateStudent,
      refreshStudents,
      refreshColleges,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
