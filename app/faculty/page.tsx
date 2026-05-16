'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function FacultyIndex() {
  const router = useRouter();
  const { initialized, user } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    if (user?.role === 'faculty') {
      router.replace('/faculty/dashboard');
    }
  }, [initialized, user, router]);

  return null;
}
