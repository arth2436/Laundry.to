'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { settingsDB } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { ShoppingBag, Search, Eye, Tag, Trash2, Bell, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Order, OrderStatus, PaymentMethod } from '@/types';
import { Suspense } from 'react';

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasAccess } = useAuthStore();
  const { orders, load, updateStatus, updatePaymentMethod, deleteOrder, searchOrders } = useOrderStore();
  const [query, setQuery] = useState('');
  
  const initialStatus = searchParams?.get('status') || 'All';
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  // Pickup notification modal states
  const [notifOrder, setNotifOrder] = useState<Order | null>(null);
  const [notifText, setNotifText] = useState('');
  const [copied, setCopied] = useState(false);

  // Clothes Ready notification status state
  const [readyNotif, setReadyNotif] = useState<{
    show: boolean;
    orderId: string;
    customerName: string;
    mobile: string;
    email: string;
    loading: boolean;
    whatsappStatus: string;
    emailStatus: string;
    gatewayUsed: boolean;
  } | null>(null);

  const handleClothesReady = async (o: Order) => {
    // 1. Instantly update status to Completed in store/DB
    updateStatus(o.id, 'Completed');

    // 2. Open loading modal
    const email = o.customerEmail || `${o.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
    setReadyNotif({
      show: true,
      orderId: o.orderId,
      customerName: o.customerName,
      mobile: o.customerMobile,
      email: email,
      loading: true,
      whatsappStatus: 'Sending...',
      emailStatus: 'Sending...',
      gatewayUsed: false
    });

    const settings = settingsDB.get();
    const isUnpaid = o.paymentStatus !== 'Paid';
    const upiText = (isUnpaid && settings.upiId) 
      ? `\n💰 Pending Amount: ₹${o.finalAmount.toFixed(0)}\n💳 Pay via UPI: upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.upiName || settings.name)}&am=${o.finalAmount}&cu=INR\n`
      : '';
    const text = `Dear ${o.customerName},

Great news! Your laundry order ${o.orderId} is ready for collection at ${settings.name}.
${upiText}
📋 Order Summary: ${o.items.length} items
🏪 Collection Point: ${settings.name}, ${settings.address}, ${settings.city}
📞 Contact Number: ${settings.phone}

Please visit us at your convenience to collect your clean, fresh garments. Thank you for choosing ${settings.name}!`;

    // 3. Trigger WhatsApp & Email background sends in parallel
    const { sendWhatsAppDirect, sendEmailDirect } = await import('@/lib/notifications');
    
    const [waRes, emailRes] = await Promise.all([
      sendWhatsAppDirect(o.customerMobile, text, settings),
      sendEmailDirect(email, `Your Laundry Order ${o.orderId} is Ready!`, text)
    ]);

    // 4. Update modal state with results
    setReadyNotif(prev => prev ? {
      ...prev,
      loading: false,
      whatsappStatus: waRes.success ? (waRes.gatewayUsed ? 'Sent via API Gateway!' : 'Sent (Simulated)!') : `Failed: ${waRes.message}`,
      emailStatus: emailRes.success ? 'Sent (Simulated)!' : 'Failed',
      gatewayUsed: waRes.gatewayUsed
    } : null);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push('/login'); }, [isAuthenticated, router, mounted]);
  useEffect(() => { if (mounted) { load(); } }, [load, mounted]);

  // Update notification text when order changes
  useEffect(() => {
    if (notifOrder) {
      const settings = settingsDB.get();
      const isUnpaid = notifOrder.paymentStatus !== 'Paid';
      const upiText = (isUnpaid && settings.upiId) 
        ? `\n💰 Pending Amount: ₹${notifOrder.finalAmount.toFixed(0)}\n💳 Pay via UPI Link: upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.upiName || settings.name)}&am=${notifOrder.finalAmount}&cu=INR\n`
        : '';
      const text = `Dear ${notifOrder.customerName},

Great news! Your laundry order ${notifOrder.orderId} is ready for collection at ${settings.name}.
${upiText}
📋 Order Summary: ${notifOrder.items.length} items
🏪 Collection Point: ${settings.name}, ${settings.address}, ${settings.city}
📞 Contact Number: ${settings.phone}
⏰ Shop Operating Hours: 9:00 AM - 9:00 PM

Please visit us at your convenience to collect your clean, fresh garments. Thank you for choosing ${settings.name}!`;
      setNotifText(text);
      setCopied(false);
    }
  }, [notifOrder]);

  const handleSendWhatsApp = async () => {
    if (!notifOrder) return;
    const settingsObj = settingsDB.get();
    
    if (settingsObj.whatsappGatewayUrl) {
      const targetOrder = notifOrder;
      setNotifOrder(null); // Close the manual modal
      
      const email = targetOrder.customerEmail || `${targetOrder.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      setReadyNotif({
        show: true,
        orderId: targetOrder.orderId,
        customerName: targetOrder.customerName,
        mobile: targetOrder.customerMobile,
        email: email,
        loading: true,
        whatsappStatus: 'Sending...',
        emailStatus: 'Skipped (WhatsApp only)',
        gatewayUsed: true
      });
      
      const { sendWhatsAppDirect } = await import('@/lib/notifications');
      const waRes = await sendWhatsAppDirect(targetOrder.customerMobile, notifText, settingsObj);
      
      setReadyNotif(prev => prev ? {
        ...prev,
        loading: false,
        whatsappStatus: waRes.success ? 'Sent via API Gateway!' : `Failed: ${waRes.message}`,
        gatewayUsed: waRes.gatewayUsed
      } : null);
    } else {
      const cleanMobile = notifOrder.customerMobile.replace(/\D/g, '');
      const formattedMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
      const url = `https://api.whatsapp.com/send?phone=${formattedMobile}&text=${encodeURIComponent(notifText)}`;
      window.open(url, '_blank');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(notifText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayed = (query ? searchOrders(query) : orders)
    .filter(o => statusFilter === 'All' || o.orderStatus === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusBadge = (s: string) => ({ Pending: 'badge-yellow', 'In-Progress': 'badge-blue', Completed: 'badge-green', Delivered: 'badge-purple' }[s] || 'badge-gray');
  const STATUS_FLOW: OrderStatus[] = ['Pending', 'In-Progress', 'Completed', 'Delivered'];

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Orders" subtitle={`${orders.length} total orders`}
          actions={<Link href="/orders/new" className="btn btn-primary btn-sm"><ShoppingBag size={15} />New Order</Link>} />
        <div className="page-body fade-in">
          <div className="card">
            <div className="section-header" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-bar">
                  <Search size={16} />
                  <input className="search-input" placeholder="Search order, customer…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <div className="tabs">
                  {['All', 'Pending', 'In-Progress', 'Completed', 'Delivered'].map(s => (
                    <button key={s} className={`tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{displayed.length} results</span>
            </div>

            {displayed.length === 0 ? (
              <div className="empty-state"><ShoppingBag /><h3>No orders found</h3><p>No orders match your current filter.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="mobile-responsive-table">
                  <thead>
                    <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Weight</th><th>Amount</th><th>Payment Method</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {displayed.map((o: Order) => (
                      <tr key={o.id}>
                        <td data-label="Order ID"><span style={{ color: 'var(--primary-brand)', fontWeight: 750 }}>{o.orderId}</span></td>
                        <td data-label="Customer">
                          <div style={{ display: 'inline-block', textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.customerName}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{o.customerMobile}</div>
                          </div>
                        </td>
                        <td data-label="Items" style={{ fontWeight: 500 }}>{o.items.length} items</td>
                        <td data-label="Weight" style={{ fontWeight: 500 }}>{o.totalWeight.toFixed(2)} kg</td>
                        <td data-label="Amount" style={{ fontWeight: 750, color: 'var(--text-primary)' }}>₹{o.finalAmount.toLocaleString('en-IN')}</td>
                        <td data-label="Payment Method">
                          {hasAccess(['admin']) ? (
                            <select className="input" style={{ padding: '6px 28px 6px 12px', fontSize: 12, width: 'auto', borderRadius: 20, height: 'auto', lineHeight: 1 }}
                              value={o.paymentMethod} onChange={e => updatePaymentMethod(o.id, e.target.value as PaymentMethod)}>
                              <option>Cash</option>
                              <option>UPI</option>
                              <option>Card</option>
                              <option>Online</option>
                            </select>
                          ) : (
                            <span className={`badge ${o.paymentMethod === 'Cash' ? 'badge-blue' : o.paymentMethod === 'UPI' ? 'badge-green' : 'badge-gray'}`}>
                              {o.paymentMethod || '—'}
                            </span>
                          )}
                        </td>
                        <td data-label="Status">
                          <select className="input" style={{ padding: '6px 28px 6px 12px', fontSize: 12, width: 'auto', borderRadius: 20, height: 'auto', lineHeight: 1 }}
                            value={o.orderStatus} 
                            onChange={e => {
                              const newStatus = e.target.value as OrderStatus;
                              if (newStatus === 'Completed') {
                                handleClothesReady(o);
                              } else {
                                updateStatus(o.id, newStatus);
                              }
                            }}>
                            {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{format(new Date(o.createdAt), 'dd MMM, hh:mm a')}</td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Link href={`/orders/${o.id}/invoice`} className="btn btn-glass btn-sm btn-icon" title="View Invoice"><Eye size={14} /></Link>
                            <Link href={`/orders/${o.id}/tag`} className="btn btn-glass btn-sm btn-icon" title="Print Tag"><Tag size={14} /></Link>
                            {o.orderStatus !== 'Completed' && o.orderStatus !== 'Delivered' && (
                              <button 
                                onClick={() => handleClothesReady(o)} 
                                className="btn btn-glass btn-sm btn-icon" 
                                style={{ color: 'var(--success)' }} 
                                title="Clothes Ready"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button onClick={() => setNotifOrder(o)} className="btn btn-glass btn-sm btn-icon" style={{ color: o.orderStatus === 'Completed' ? 'var(--success)' : 'inherit' }} title="Send Pickup Notification"><Bell size={14} /></button>
                            {hasAccess(['admin']) && (
                              <button className="btn btn-glass btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => confirm('Delete this order?') && deleteOrder(o.id)} title="Delete Order"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PICKUP NOTIFICATION MODAL */}
      {notifOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 500, padding: 24, boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} style={{ color: 'var(--primary-brand)' }} /> Send Pickup Notification
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setNotifOrder(null)}><X size={18} /></button>
            </div>

            <div className="input-group" style={{ marginBottom: 18 }}>
              <label className="input-label">Recipient Mobile</label>
              <input className="input" value={notifOrder.customerMobile} disabled style={{ background: 'var(--bg-secondary)', fontWeight: 650 }} />
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Notification Message</label>
              <textarea 
                className="input" 
                style={{ minHeight: 180, fontSize: 12.5, fontFamily: 'monospace', lineHeight: 1.5 }}
                value={notifText} 
                onChange={e => setNotifText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-glass" onClick={() => setNotifOrder(null)}>Cancel</button>
              <button className="btn btn-glass" onClick={handleCopyText} style={{ minWidth: 100 }}>{copied ? '✓ Copied' : 'Copy Text'}</button>
              <button className="btn btn-primary" onClick={handleSendWhatsApp}>Send WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* CLOTHES READY NOTIFICATION STATUS MODAL */}
      {readyNotif && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 450, padding: 24, boxShadow: 'var(--shadow-2xl)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -10 }}>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setReadyNotif(null)}
                disabled={readyNotif.loading}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ fontSize: 36, marginBottom: 14 }}>✨</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Order {readyNotif.orderId} Completed!
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Dispatching "Clothes Ready" notifications to <strong>{readyNotif.customerName}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 24 }}>
              {/* WhatsApp Notification Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>💬</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>WhatsApp Notification</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{readyNotif.mobile}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 750, color: readyNotif.loading ? 'var(--text-muted)' : 'var(--success)' }}>
                  {readyNotif.whatsappStatus}
                </div>
              </div>

              {/* Email Notification Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📧</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Email Notification</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{readyNotif.email}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 750, color: readyNotif.loading ? 'var(--text-muted)' : 'var(--success)' }}>
                  {readyNotif.emailStatus}
                </div>
              </div>
            </div>

            {readyNotif.loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                <span className="spinner-border" />
                Sending notifications...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!readyNotif.gatewayUsed && (
                  <button 
                    className="btn btn-glass"
                    onClick={() => {
                      const settings = settingsDB.get();
                      const cleanMobile = readyNotif.mobile.replace(/\D/g, '');
                      const formattedMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
                      const text = `Dear ${readyNotif.customerName},

Great news! Your laundry order ${readyNotif.orderId} is ready for collection at ${settings.name}.

Please visit us at your convenience to collect your clean, fresh garments. Thank you for choosing ${settings.name}!`;
                      window.open(`https://api.whatsapp.com/send?phone=${formattedMobile}&text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    style={{ fontSize: 12, justifyContent: 'center' }}
                  >
                    🔗 Open WhatsApp Chat Manually
                  </button>
                )}
                <button 
                  className="btn btn-primary" 
                  onClick={() => setReadyNotif(null)}
                  style={{ width: '100%', justifyContent: 'center', height: 38 }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner-border {
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          borderRadius: 50%;
          display: inline-block;
          animation: spin 0.75s linear infinite;
        }
      `}</style>

    </div>
  );
}

export default function OrdersPage() {
  return <Suspense fallback={<div />}><OrdersContent /></Suspense>;
}
