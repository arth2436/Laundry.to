import type { Metadata } from 'next';
import './globals.css';
import RouteGuard from '@/components/layout/RouteGuard';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: 'LaundryTO — Laundry & Dry Clean Management System',
  description: 'Premium Laundry Management System for managing orders, billing, and revenue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="bg-orbs" />
        <RouteGuard>
          {children}
          <MobileNav />
        </RouteGuard>
      </body>
    </html>
  );
}
