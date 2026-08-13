'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Users, ShoppingBag, PlusCircle, Settings, LogOut, Layers, Tag, FileText } from 'lucide-react';

const NAV_ADMIN = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/orders', label: 'All Orders', icon: ShoppingBag },
  { href: '/orders/new', label: 'New Order', icon: PlusCircle },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/tag-lookup', label: 'Scan Barcode', icon: Tag },
];
const NAV_CASHIER = [
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/orders/new', label: 'New Order', icon: PlusCircle },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/tag-lookup', label: 'Scan Barcode', icon: Tag },
];

import { useSettingsStore } from '@/store/settingsStore';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, hasAccess } = useAuthStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, [loadSettings]);

  const nav = mounted && hasAccess(['admin']) ? NAV_ADMIN : NAV_CASHIER;

  const handleLogout = () => { logout(); router.push('/login'); };
  const initials = mounted && currentUser?.name?.split(' ').map(w => w[0]).join('').toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ overflow: 'hidden', background: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="sidebar-logo-text">
          <h2>{mounted ? settings.name : 'LaundryTO'}</h2>
          <p>{mounted ? settings.tagline : 'Laundry & Dry Clean'}</p>
        </div>
      </div>


      <nav className="sidebar-nav">
        <span className="nav-section-label">Menu</span>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link ${pathname === href || (href !== '/' && pathname.startsWith(href) && href !== '/orders' ) ? 'active' : ''}`}>
            <Icon size={17} />{label}
          </Link>
        ))}
        {mounted && hasAccess(['admin']) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Admin</span>
            <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>
              <Settings size={17} />Settings
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="name">{mounted ? currentUser?.name : '...'}</div>
            <div className="role">{mounted ? (currentUser?.role === 'admin' ? '🛡️ Admin' : '💼 Cashier') : ''}</div>
          </div>
        </div>
        <button className="nav-link" onClick={handleLogout} style={{ color: 'var(--danger)', width: '100%' }}>
          <LogOut size={17} />Sign Out
        </button>
      </div>
    </aside>
  );
}
