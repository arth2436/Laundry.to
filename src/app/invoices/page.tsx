'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import Link from 'next/link';
import { FileText, Printer, Eye, Search, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Order, PaymentStatus } from '@/types';

export default function InvoicesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { orders, load, updatePayment } = useOrderStore();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkPaid = (order: Order, status: PaymentStatus) => {
    updatePayment(order.id, status);
    showToast(
      status === 'Paid'
        ? `✅ ${order.orderId} marked as Paid`
        : `↩️ ${order.orderId} marked as Unpaid`,
      status === 'Paid' ? 'success' : 'info'
    );
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push('/login'); }, [isAuthenticated, router, mounted]);
  useEffect(() => { if (mounted) load(); }, [load, mounted]);

  if (!mounted || !isAuthenticated) return null;

  // Sort orders by orderId descending (latest first)
  const sorted = [...orders].sort((a, b) => b.orderId.localeCompare(a.orderId));

  const filtered = sorted.filter(o => {
    const q = search.toLowerCase();
    return (
      o.orderId.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerMobile.includes(q)
    );
  });

  const getStatusColor = (status: Order['paymentStatus']) => {
    if (status === 'Paid') return { bg: '#e6faf0', color: '#16a34a', label: 'Paid' };
    if (status === 'Partial') return { bg: '#fff7ed', color: '#ea580c', label: 'Partial' };
    return { bg: '#fef2f2', color: '#dc2626', label: 'Unpaid' };
  };

  const getOrderStatusColor = (status: Order['orderStatus']) => {
    if (status === 'Delivered') return '#16a34a';
    if (status === 'Completed') return '#0284c7';
    if (status === 'In-Progress') return '#d97706';
    return '#6b7280';
  };

  const totalBilled = filtered.reduce((sum, o) => sum + o.finalAmount, 0);
  const totalPaid = filtered.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.finalAmount, 0);
  const totalUnpaid = filtered.filter(o => o.paymentStatus !== 'Paid').reduce((sum, o) => sum + o.finalAmount, 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar
          title="Invoices"
          subtitle={`${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} in sequence`}
          actions={
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 32, height: 36, width: 220, fontSize: 13 }}
                placeholder="Search invoice, customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          }
        />

        <div className="page-body fade-in">

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Billed', value: `₹${totalBilled.toFixed(0)}`, color: 'var(--primary-brand)', icon: '🧾' },
              { label: 'Total Collected', value: `₹${totalPaid.toFixed(0)}`, color: '#16a34a', icon: '✅' },
              { label: 'Outstanding', value: `₹${totalUnpaid.toFixed(0)}`, color: '#dc2626', icon: '⏳' },
              { label: 'Total Invoices', value: filtered.length, color: 'var(--text-primary)', icon: '📋' },
            ].map(card => (
              <div key={card.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28 }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: card.color, marginTop: 2 }}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Invoice Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                    {['#', 'Invoice No.', 'Date', 'Customer', 'Mobile', 'Items', 'Amount', 'Payment', 'Order Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>No invoices found</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                          {search ? 'Try a different search term.' : 'Create your first order to generate an invoice.'}
                        </div>
                        {!search && (
                          <Link href="/orders/new" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
                            + New Order
                          </Link>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((order, idx) => {
                      const pStatus = getStatusColor(order.paymentStatus);
                      return (
                        <tr
                          key={order.id}
                          style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Serial No */}
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>
                            {filtered.length - idx}
                          </td>

                          {/* Invoice No */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={14} style={{ color: 'var(--primary-brand)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 800, color: 'var(--primary-brand)', fontSize: 13 }}>{order.orderId}</span>
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{format(new Date(order.createdAt), 'dd MMM yyyy')}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(order.createdAt), 'hh:mm a')}</div>
                          </td>

                          {/* Customer */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{order.customerName}</div>
                          </td>

                          {/* Mobile */}
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                            {order.customerMobile}
                          </td>

                          {/* Items Count */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', background: 'var(--bg-tertiary)',
                              borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                              color: 'var(--text-primary)'
                            }}>
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Amount */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--text-primary)' }}>₹{order.finalAmount.toFixed(0)}</div>
                            {order.discount > 0 && (
                              <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>-₹{order.discount.toFixed(0)} off</div>
                            )}
                          </td>

                          {/* Payment Status */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              background: pStatus.bg,
                              color: pStatus.color,
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                            }}>
                              {pStatus.label}
                            </span>
                          </td>

                          {/* Order Status */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: getOrderStatusColor(order.orderStatus) }}>
                              ● {order.orderStatus}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Link
                                href={`/orders/${order.id}/invoice`}
                                className="btn btn-glass btn-sm"
                                style={{ padding: '5px 10px', gap: 5, fontSize: 12 }}
                              >
                                <Eye size={13} /> View
                              </Link>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '5px 10px', gap: 5, fontSize: 12 }}
                                onClick={() => window.open(`/orders/${order.id}/invoice`, '_blank')}
                              >
                                <Printer size={13} /> Print
                              </button>
                              {order.paymentStatus !== 'Paid' ? (
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: '5px 12px', gap: 5, fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                  onClick={() => handleMarkPaid(order, 'Paid')}
                                  title="Mark as Paid"
                                >
                                  <CheckCircle size={13} /> Mark Paid
                                </button>
                              ) : (
                                <button
                                  className="btn btn-glass btn-sm"
                                  style={{ padding: '5px 10px', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}
                                  onClick={() => handleMarkPaid(order, 'Unpaid')}
                                  title="Undo — Mark as Unpaid"
                                >
                                  <XCircle size={13} /> Undo
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer row */}
            {filtered.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderTop: '1px solid var(--border-light)',
                background: 'var(--bg-secondary)', fontSize: 13
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Showing <strong>{filtered.length}</strong> invoice{filtered.length !== 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: 20 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Total: <strong style={{ color: 'var(--text-primary)' }}>₹{totalBilled.toFixed(0)}</strong>
                  </span>
                  <span style={{ color: '#16a34a' }}>
                    Paid: <strong>₹{totalPaid.toFixed(0)}</strong>
                  </span>
                  <span style={{ color: '#dc2626' }}>
                    Due: <strong>₹{totalUnpaid.toFixed(0)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === 'success' ? '#16a34a' : '#0284c7',
          color: '#fff', borderRadius: 12, padding: '12px 20px',
          fontSize: 14, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideUp 0.25s ease'
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
