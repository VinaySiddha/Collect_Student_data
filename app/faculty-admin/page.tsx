'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function FacultyAdminIndex() {
  const router = useRouter();
  const { initialized, user } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    if (user?.role === 'faculty_admin') {
      router.replace('/faculty-admin/dashboard');
    }
  }, [initialized, user, router]);

  return null;
}
