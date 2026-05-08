'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadAuthEmail, loadStudents, loadUsers, loadColleges, saveAuthEmail, saveStudents, saveUsers, saveColleges } from '@/lib/storage';
import { StudentRecord, User, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  students: StudentRecord[];
  colleges: string[];
  login: (email: string, password: string, role: UserRole) => { success: boolean; message: string };
  register: (name: string, email: string, password: string, role: UserRole, college?: string) => { success: boolean; message: string };
  addCollege: (college: string) => { success: boolean; message: string };
  removeCollege: (college: string) => { success: boolean; message: string };
  logout: () => void;
  addStudent: (student: StudentRecord) => void;
  importStudents: (newStudents: StudentRecord[]) => void;
  deleteStudent: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);

  useEffect(() => {
    const storedUsers = loadUsers();
    const storedStudents = loadStudents();
    const storedColleges = loadColleges();
    setStudents(storedStudents);
    setColleges(storedColleges);
    const authEmail = loadAuthEmail();
    const activeUser = authEmail ? storedUsers.find((account) => account.email === authEmail) ?? null : null;
    setUser(activeUser);
  }, []);

  const persistUsers = (users: User[]) => {
    saveUsers(users);
  };

  const persistStudents = (records: StudentRecord[]) => {
    saveStudents(records);
    setStudents(records);
  };

  const persistColleges = (updatedColleges: string[]) => {
    saveColleges(updatedColleges);
    setColleges(updatedColleges);
  };

  const login = (email: string, password: string, role: UserRole) => {
    const users = loadUsers();
    const matched = users.find((account) => account.email.toLowerCase() === email.toLowerCase() && account.password === password && account.role === role);
    if (!matched) {
      return { success: false, message: 'Invalid credentials or role.' };
    }
    saveAuthEmail(matched.email);
    setUser(matched);
    return { success: true, message: 'Login successful.' };
  };

  const register = (name: string, email: string, password: string, role: UserRole, college?: string) => {
    const users = loadUsers();
    if (users.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const newUser: User = { name, email, password, role };
    if (college || role !== 'admin') {
      newUser.college = college;
    }
    const updated = [...users, newUser];
    persistUsers(updated);
    saveAuthEmail(newUser.email);
    setUser(newUser);
    return { success: true, message: 'Registration complete. Welcome!' };
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
    persistColleges(updated);
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
    persistColleges(updated);
    return { success: true, message: 'College removed successfully.' };
  };

  const logout = () => {
    saveAuthEmail(null);
    setUser(null);
  };

  const addStudent = (student: StudentRecord) => {
    const updated = [student, ...students];
    persistStudents(updated);
  };

  const importStudents = (newStudents: StudentRecord[]) => {
    const updated = [...newStudents, ...students];
    persistStudents(updated);
  };

  const deleteStudent = (id: string) => {
    const updated = students.filter((record) => record.id !== id);
    persistStudents(updated);
  };

  return (
    <AuthContext.Provider value={{ user, students, colleges, login, register, addCollege, removeCollege, logout, addStudent, importStudents, deleteStudent }}>
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
