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
        <button
          className="pending-orders-button"
          onClick={() => router.push('/orders?status=Pending')}
          aria-label={`View ${pendingCount} pending orders`}
        >
          <span className="pending-orders-icon">
            <Bell size={18} />
            {pendingCount > 0 && (
              <span className="pending-orders-dot" />
            )}
          </span>
          <span>{pendingCount} Pending {pendingCount === 1 ? 'Order' : 'Orders'}</span>
        </button>
      </div>
    </header>
  );
}
