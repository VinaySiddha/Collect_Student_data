'use client';

import { useAuth } from '@/components/AuthProvider';
import PageLoader from '@/components/PageLoader';
import FloatingContact from '@/components/FloatingContact';
import { useEffect, useState } from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { initialized } = useAuth();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (initialized) {
      // Brief fade-out before unmounting
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [initialized]);

  return (
    <>
      {visible && (
        <div className={`transition-opacity duration-300 ${initialized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <PageLoader />
        </div>
      )}
      <div className={`transition-opacity duration-300 ${initialized && !visible ? 'opacity-100' : initialized ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>
      <FloatingContact />
    </>
  );
}
