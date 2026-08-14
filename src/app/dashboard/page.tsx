'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Users, ShoppingBag, Clock, CheckCircle, TrendingUp, DollarSign, Package, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { customers, load: loadC } = useCustomerStore();
  const { orders, load: loadO, getTodayRevenue, getWeekRevenue, getMonthRevenue, getTotalRevenue } = useOrderStore();

  const [mounted, setMounted] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push('/login'); }, [isAuthenticated, router, mounted]);
  useEffect(() => { if (mounted) { loadC(); loadO(); } }, [loadC, loadO, mounted]);

  const pending = orders.filter(o => o.orderStatus === 'Pending');
  const inProgress = orders.filter(o => o.orderStatus === 'In-Progress');
  const completed = orders.filter(o => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered');
  const recent = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = subDays(new Date(), 7);

  const getFilteredOrders = () => {
    switch (selectedKpi) {
      case "Today's Revenue":
        return orders.filter(o => o.paymentStatus === 'Paid' && o.createdAt.startsWith(todayStr));
      case 'Week Revenue':
        return orders.filter(o => o.paymentStatus === 'Paid' && new Date(o.createdAt) >= weekAgo);
      case 'Total Revenue':
        return orders.filter(o => o.paymentStatus === 'Paid');
      case 'Total Orders':
        return orders;
      case 'Pending':
        return orders.filter(o => o.orderStatus === 'Pending');
      case 'In Progress':
        return orders.filter(o => o.orderStatus === 'In-Progress');
      case 'Completed':
        return orders.filter(o => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered');
      default:
        return recent;
    }
  };

  const filteredOrders = getFilteredOrders();
  const sortedFilteredOrders = selectedKpi 
    ? [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : filteredOrders;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayStr = format(d, 'yyyy-MM-dd');
    const rev = orders.filter(o => o.paymentStatus === 'Paid' && o.createdAt.startsWith(dayStr)).reduce((s, o) => s + o.finalAmount, 0);
    return { label: format(d, 'EEE'), rev };
  });
  const maxRev = Math.max(...last7.map(d => d.rev), 1);

  const statusBadge = (s: string) => ({ Pending: 'badge-yellow', 'In-Progress': 'badge-blue', Completed: 'badge-green', Delivered: 'badge-purple' }[s] || 'badge-gray');
  const payBadge = (s: string) => ({ Paid: 'badge-green', Unpaid: 'badge-red', Partial: 'badge-yellow' }[s] || 'badge-gray');
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const KPIS = [
    { label: "Today's Revenue", value: fmt(getTodayRevenue()), sub: 'Paid orders today', icon: DollarSign },
    { label: 'Week Revenue', value: fmt(getWeekRevenue()), sub: 'This week paid', icon: TrendingUp },
    { label: 'Total Revenue', value: fmt(getTotalRevenue()), sub: 'All time paid', icon: Activity },
    { label: 'Total Customers', value: customers.length.toString(), sub: 'Registered', icon: Users },
    { label: 'Total Orders', value: orders.length.toString(), sub: 'All orders', icon: ShoppingBag },
    { label: 'Pending', value: pending.length.toString(), sub: 'Awaiting processing', icon: Clock },
    { label: 'In Progress', value: inProgress.length.toString(), sub: 'Being processed', icon: Package },
    { label: 'Completed', value: completed.length.toString(), sub: 'Done & delivered', icon: CheckCircle },
  ];

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Dashboard" subtitle={`Welcome back! ${mounted ? format(new Date(), 'EEEE, dd MMM yyyy') : ''}`}
          actions={<Link href="/orders/new" className="btn btn-primary btn-sm"><Package size={13} style={{ marginRight: 2 }} />New Order</Link>} />

        <div className="page-body fade-in">

          {/* KPI Grid */}
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            {KPIS.map(({ label, value, sub, icon: Icon }) => {
              const isRevenueKpi = ["Today's Revenue", "Week Revenue", "Total Revenue"].includes(label);
              const isActive = selectedKpi === label;
              return (
                <div 
                  key={label} 
                  className={`kpi-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isRevenueKpi) {
                      const tf = label === "Today's Revenue" ? "today" : label === "Week Revenue" ? "week" : "year";
                      router.push(`/dashboard/revenue?timeframe=${tf}`);
                    } else {
                      setSelectedKpi(isActive ? null : label);
                    }
                  }}
                  style={{ 
                    cursor: 'pointer',
                    position: 'relative',
                    border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border-light)',
                    background: isActive ? 'rgba(0, 102, 204, 0.04)' : 'var(--bg-secondary)',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {isActive && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="kpi-label" style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: isActive ? 750 : 600 }}>{label}</span>
                      {isRevenueKpi && (
                        <span style={{ display: 'inline-flex', color: 'var(--primary-brand)', opacity: 0.7 }} title="View Detailed Report">
                          ↗
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      width: 34, 
                      height: 34, 
                      borderRadius: '6px', 
                      background: isActive ? 'var(--accent)' : '#f1f5f9', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      border: isActive ? '1px solid var(--accent)' : '1px solid #e2e8f0',
                      transition: 'all 0.2s ease'
                    }}>
                      <Icon size={14} style={{ color: isActive ? '#ffffff' : '#475569' }} />
                    </div>
                  </div>
                  <div className="kpi-value" style={{ color: isActive ? 'var(--primary-brand)' : 'var(--text-primary)' }}>{value}</div>
                  <div className="kpi-sub" style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{sub}</div>
                </div>
              );
            })}
          </div>

          <div className="content-grid content-grid-2" style={{ marginBottom: 20 }}>
            {/* Revenue Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <div>
                  <div className="section-title">Weekly Revenue</div>
                  <div className="section-sub">Last 7 days performance</div>
                </div>
              </div>
              
              <div style={{ position: 'relative', height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {/* Horizontal Dashed Grid Lines */}
                <div style={{ position: 'absolute', inset: '0 0 24px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                  <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                  <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                  <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                </div>
                
                {/* Columns */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 130, zIndex: 1, position: 'relative' }}>
                  {last7.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{d.rev > 0 ? `₹${d.rev}` : ''}</span>
                      <div style={{
                        width: '24px',
                        borderRadius: '3px 3px 0 0',
                        background: d.rev > 0 ? 'var(--primary-brand)' : '#f1f5f9',
                        minHeight: 4,
                        height: `${(d.rev / maxRev) * 100}%`,
                        transition: 'height 0.4s ease',
                      }} />
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Status */}
            <div className="card">
              <div className="section-header" style={{ marginBottom: 20 }}>
                <div>
                  <div className="section-title">Order Status</div>
                  <div className="section-sub">Current breakdown</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Pending', count: pending.length, color: 'var(--warning)' },
                  { label: 'In Progress', count: inProgress.length, color: 'var(--primary-brand)' },
                  { label: 'Completed', count: completed.length, color: 'var(--success)' },
                ].map(({ label, count, color }) => {
                  const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 550 }}>{label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filtered Data Section */}
          <div className="card">
            <div className="section-header">
              <div>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedKpi ? `${selectedKpi} Data` : 'Recent Orders'}
                  {selectedKpi && (
                    <span style={{ fontSize: 11, background: 'rgba(0, 102, 204, 0.08)', color: 'var(--primary-brand)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      Filtered
                    </span>
                  )}
                </div>
                <div className="section-sub">
                  {selectedKpi === 'Total Customers' 
                    ? `Showing ${customers.length} registered customers`
                    : selectedKpi 
                      ? `Showing ${sortedFilteredOrders.length} records matching "${selectedKpi}"`
                      : `Latest ${recent.length} orders logged`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedKpi && (
                  <button className="btn btn-danger btn-sm" onClick={() => setSelectedKpi(null)}>Clear Filter</button>
                )}
                <Link href={selectedKpi === 'Total Customers' ? '/customers' : '/orders'} className="btn btn-glass btn-sm">
                  {selectedKpi === 'Total Customers' ? 'Manage Customers' : 'View All Orders'}
                </Link>
              </div>
            </div>

            {selectedKpi === 'Total Customers' ? (
              customers.length === 0 ? (
                <div className="empty-state"><Users /><h3>No customers yet</h3><p>Customers will appear here when they register.</p></div>
              ) : (
                <div className="table-wrap">
                  <table className="mobile-responsive-table">
                    <thead>
                      <tr><th>Customer Name</th><th>Mobile</th><th>Email</th><th>Total Orders</th><th>Paid Revenue</th></tr>
                    </thead>
                    <tbody>
                      {customers.map(c => {
                        const cOrders = orders.filter(o => o.customerId === c.id);
                        const cRev = cOrders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.finalAmount, 0);
                        return (
                          <tr key={c.id}>
                            <td data-label="Customer Name" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                            <td data-label="Mobile" style={{ color: 'var(--text-secondary)' }}>{c.mobile}</td>
                            <td data-label="Email" style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                            <td data-label="Total Orders"><span className="badge badge-blue">{cOrders.length} order{cOrders.length !== 1 ? 's' : ''}</span></td>
                            <td data-label="Paid Revenue" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{cRev.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              sortedFilteredOrders.length === 0 ? (
                <div className="empty-state"><ShoppingBag /><h3>No orders match this filter</h3><p>There are no orders matching "{selectedKpi}".</p></div>
              ) : (
                <div className="table-wrap">
                  <table className="mobile-responsive-table">
                    <thead>
                      <tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {sortedFilteredOrders.map(o => (
                        <tr key={o.id}>
                          <td data-label="Order ID"><Link href={`/orders/${o.id}/invoice`} style={{ color: 'var(--primary-brand)', fontWeight: 700, textDecoration: 'none' }}>{o.orderId}</Link></td>
                          <td data-label="Customer">
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-block' }}>{o.customerName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customerMobile}</div>
                          </td>
                          <td data-label="Amount" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{o.finalAmount.toLocaleString('en-IN')}</td>
                          <td data-label="Payment">
                            <span className={`badge ${payBadge(o.paymentStatus)}`}>
                              {o.paymentStatus}{o.paymentMethod ? ` (${o.paymentMethod})` : ''}
                            </span>
                          </td>
                          <td data-label="Status"><span className={`badge ${statusBadge(o.orderStatus)}`}>{o.orderStatus}</span></td>
                          <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{format(new Date(o.createdAt), 'dd MMM, hh:mm a')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
