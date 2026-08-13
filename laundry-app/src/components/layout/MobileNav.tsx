'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Plus, 
  Users, 
  Menu, 
  Settings, 
  LogOut, 
  FileText, 
  Tag 
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, hasAccess, isAuthenticated } = useAuthStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the sheet when page pathname changes
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  if (!mounted || !isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = currentUser?.name?.split(' ').map(w => w[0]).join('').toUpperCase() || 'U';

  const primaryTabs = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/orders/new', label: 'New Order', icon: Plus, isCenter: true },
    { href: '/customers', label: 'Customers', icon: Users },
  ];

  return (
    <>
      {/* Bottom Bar */}
      <nav className="mobile-nav">
        {primaryTabs.map((tab) => {
          if (tab.isCenter) {
            return (
              <Link key={tab.href} href={tab.href} className="mobile-nav-item">
                <div className="mobile-nav-center">
                  <tab.icon size={22} />
                </div>
              </Link>
            );
          }
          const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href) && tab.href !== '/orders');
          return (
            <Link 
              key={tab.href} 
              href={tab.href} 
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={19} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {/* More Tab */}
        <button 
          onClick={() => setIsMoreOpen(true)} 
          className={`mobile-nav-item ${isMoreOpen ? 'active' : ''}`}
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>

      {/* Drawer Overlay */}
      <div 
        className={`mobile-sheet-overlay ${isMoreOpen ? 'open' : ''}`}
        onClick={() => setIsMoreOpen(false)}
      />

      {/* Drawer Sheet */}
      <div className={`mobile-sheet ${isMoreOpen ? 'open' : ''}`}>
        <div className="mobile-sheet-drag-handle" onClick={() => setIsMoreOpen(false)} />
        
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '0 4px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{currentUser?.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
              {currentUser?.role === 'admin' ? '🛡️ Administrator' : '💼 Cashier Staff'}
            </div>
          </div>
        </div>

        <div className="mobile-sheet-title">More Portal Actions</div>
        
        <div className="mobile-sheet-grid">
          {/* Invoices */}
          <Link href="/invoices" className="mobile-sheet-btn">
            <FileText size={20} color="var(--primary-brand)" />
            <span>Invoices</span>
          </Link>

          {/* Barcode scanner */}
          <Link href="/tag-lookup" className="mobile-sheet-btn">
            <Tag size={20} color="var(--purple)" />
            <span>Scan Tag</span>
          </Link>

          {/* Settings (Admin Only) */}
          {hasAccess(['admin']) && (
            <Link href="/settings" className="mobile-sheet-btn">
              <Settings size={20} color="var(--text-secondary)" />
              <span>Settings</span>
            </Link>
          )}

          {/* Sign Out */}
          <button onClick={handleLogout} className="mobile-sheet-btn danger" style={{ gridColumn: hasAccess(['admin']) ? 'span 3' : 'span 1' }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
