'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function AdminIndex() {
  const router = useRouter();
  const { initialized, user } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    if (user?.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [initialized, user, router]);

  return null;
}
