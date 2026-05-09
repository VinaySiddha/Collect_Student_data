'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadAuthEmail, saveAuthEmail } from '@/lib/storage';
import { StudentRecord, User, UserRole } from '@/lib/types';
import { 
  loginUser, 
  registerUser, 
  getStudents, 
  addStudentToDb, 
  deleteStudentFromDb, 
  getCollegesFromDb 
} from '@/lib/actions';

interface AuthContextValue {
  user: User | null;
  students: StudentRecord[];
  colleges: string[];
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string, role: UserRole, college?: string) => Promise<{ success: boolean; message: string }>;
  addCollege: (college: string) => { success: boolean; message: string };
  removeCollege: (college: string) => { success: boolean; message: string };
  logout: () => void;
  addStudent: (student: StudentRecord) => Promise<void>;
  importStudents: (newStudents: StudentRecord[]) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      const dbStudents = await getStudents();
      const dbColleges = await getCollegesFromDb();
      setStudents(dbStudents);
      setColleges(dbColleges);
      
      const authEmail = loadAuthEmail();
      if (authEmail) {
        // In a real app, we'd verify the session/cookie on the server
        // For this demo, we'll try to find the user in the DB
        // (Note: This is a bit inefficient, usually you'd use a session token)
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    const result = await loginUser(email, password, role);
    if (result.success && result.user) {
      saveAuthEmail(result.user.email);
      setUser(result.user);
    }
    return { success: result.success, message: result.message };
  };

  const register = async (name: string, email: string, password: string, role: UserRole, college?: string) => {
    const result = await registerUser(name, email, password, role, college);
    if (result.success && result.user) {
      saveAuthEmail(result.user.email);
      setUser(result.user);
    }
    return { success: result.success, message: result.message };
  };

  const addCollege = (college: string) => {
    const normalized = college.trim();
    if (!normalized) {
      return { success: false, message: 'Please provide a valid college name.' };
    }
    if (colleges.includes(normalized)) {
      return { success: false, message: 'This college already exists.' };
    }
    const updated = [...colleges, normalized];
    setColleges(updated);
    return { success: true, message: 'College added successfully.' };
  };

  const removeCollege = (college: string) => {
    const normalized = college.trim();
    if (!normalized) {
      return { success: false, message: 'Invalid college name.' };
    }
    if (!colleges.includes(normalized)) {
      return { success: false, message: 'College not found.' };
    }
    const associatedStudents = students.filter((record) => record.college === normalized);
    if (associatedStudents.length > 0) {
      return { success: false, message: 'Cannot remove a college that still has students.' };
    }
    const updated = colleges.filter((item) => item !== normalized);
    setColleges(updated);
    return { success: true, message: 'College removed successfully.' };
  };

  const logout = () => {
    saveAuthEmail(null);
    setUser(null);
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
    const result = await deleteStudentFromDb(id);
    if (result.success) {
      setStudents(students.filter((record) => record.id !== id));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      students, 
      colleges, 
      login, 
      register, 
      addCollege, 
      removeCollege, 
      logout, 
      addStudent, 
      importStudents, 
      deleteStudent 
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
