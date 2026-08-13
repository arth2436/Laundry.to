'use client';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useRouter } from 'next/navigation';

interface Props { title: string; subtitle?: string; actions?: React.ReactNode; }

export default function TopBar({ title, subtitle, actions }: Props) {
  const router = useRouter();
  const orders = useOrderStore(s => s.orders);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const pendingCount = mounted ? orders.filter(o => o.orderStatus === 'Pending').length : 0;

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        {actions}
        <div className="tooltip-wrap">
          <button 
            className="btn btn-glass btn-icon" 
            style={{ position: 'relative' }}
            onClick={() => router.push('/orders?status=Pending')}
          >
            <Bell size={18} />
            {pendingCount > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
            )}
          </button>
          <span className="tooltip">{pendingCount} Pending Orders</span>
        </div>
      </div>
    </header>
  );
}
