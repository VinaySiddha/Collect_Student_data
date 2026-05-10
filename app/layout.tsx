import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Gographic - Student ID Card Data Portal',
  description: 'Gographic: Design | Print | Care. Collect student ID card data from multiple colleges with our professional printing portal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
