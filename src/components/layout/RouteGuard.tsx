'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const SYNC_KEYS = ['lms_customers', 'lms_orders', 'lms_settings', 'lms_rates', 'lms_users', 'lms_services', 'lms_service_items'];
// Cloud sync disabled - using localStorage only

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, currentUser } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Background cloud database synchronization (disabled - using localStorage only)
  // Note: Cloud sync feature is disabled. App uses localStorage for all data persistence.
  useEffect(() => {
    if (!mounted) return;
    // Cloud sync disabled - all data is stored in localStorage
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const path = pathname.split('?')[0];
    const isPublic = path === '/login';
    const isAdminOnly = path.startsWith('/settings');

    if (!isAuthenticated) {
      if (!isPublic) {
        setAuthorized(false);
        router.replace('/login');
      } else {
        setAuthorized(true);
      }
    } else {
      if (isPublic) {
        setAuthorized(false);
        router.replace('/dashboard');
      } else if (isAdminOnly && currentUser?.role !== 'admin') {
        setAuthorized(false);
        router.replace('/dashboard');
      } else {
        setAuthorized(true);
      }
    }
  }, [pathname, isAuthenticated, currentUser, router, mounted]);

  // Avoid rendering anything until verification is complete on client mount
  if (!mounted || !authorized) {
    return null;
  }

  return <>{children}</>;
}
