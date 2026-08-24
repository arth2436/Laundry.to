'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const SYNC_KEYS = ['lms_customers', 'lms_orders', 'lms_settings', 'lms_rates', 'lms_users', 'lms_services', 'lms_service_items'];
const OBJECT_URL = 'https://api.restful-api.dev/objects/ff8081819d82fab6019f6508035a64b5';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, currentUser } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Background cloud database synchronization
  useEffect(() => {
    if (!mounted) return;

    let lastHash = '';

    const getHash = (data: Record<string, string | null>) => {
      return JSON.stringify(data);
    };

    const pull = async () => {
      try {
        const res = await fetch(OBJECT_URL);
        if (!res.ok) return;
        const json = await res.json();
        const cloudData = json.data || {};
        
        let changed = false;


        if (changed) {
          window.dispatchEvent(new Event('storage'));
          try {
            const { useCustomerStore } = await import('@/store/customerStore');
            const { useOrderStore } = await import('@/store/orderStore');
            const { useSettingsStore } = await import('@/store/settingsStore');
            useCustomerStore.getState().load();
            useOrderStore.getState().load();
            useSettingsStore.getState().load();
          } catch (e) {}
        }
      } catch (e) {
        console.error('Cloud pull sync failed:', e);
      }
    };

    const push = async () => {
      try {
        const data: Record<string, string | null> = {};
        SYNC_KEYS.forEach(key => {
          data[key] = localStorage.getItem(key) || '[]';
        });

        const currentHash = getHash(data);
        if (currentHash === lastHash) return;

        await fetch(OBJECT_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'laundryto_sync_data',
            data
          })
        });
        lastHash = currentHash;
      } catch (e) {
        console.error('Cloud push sync failed:', e);
      }
    };

    // Initial pull
    pull().then(() => {
      const data: Record<string, string | null> = {};
      SYNC_KEYS.forEach(key => {
        data[key] = localStorage.getItem(key) || '[]';
      });
      lastHash = getHash(data);
    });

    // Check for local storage changes and push them every 2 seconds
    const pushInterval = setInterval(push, 2000);
    // Periodically pull every 5 seconds
    const pullInterval = setInterval(pull, 5000);

    return () => {
      clearInterval(pushInterval);
      clearInterval(pullInterval);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const path = pathname.split('?')[0];
    const isPublic = path === '/login' || path.startsWith('/t/');
    const isAdminOnly = path.startsWith('/settings');

    if (!isAuthenticated) {
      if (!isPublic) {
        setAuthorized(false);
        router.replace('/login');
      } else {
        setAuthorized(true);
      }
    } else {
      if (isPublic && path === '/login') {
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
