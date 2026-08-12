'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { settingsDB } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Printer, Download, MessageCircle, ArrowLeft, Package, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { CompanySettings, Order } from '@/types';

const getItemUnit = (itemType: string): string => {
  const match = itemType.match(/Charged per (.*)$/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  const lower = itemType.toLowerCase();
  if (lower.includes('charged per pc') || lower.includes('per pc') || lower.includes('/pc')) return 'pc';
  if (lower.includes('charged per kg') || lower.includes('per kg') || lower.includes('/kg')) return 'kg';
  return 'pc';
};

// ─── Shared Invoice Copy Block (used for both Customer & Shop copies) ───────
function InvoiceCopyBlock({ order, settings, compact = false }: {
  order: Order;
  settings: CompanySettings;
  compact?: boolean;
}) {
  const fs = compact ? { title: 16, sub: 10, body: 11, tableHead: 10, tableBody: 11, total: 15, footer: 9 }
                     : { title: 20, sub: 12, body: 13, tableHead: 12, tableBody: 13, total: 18, footer: 11 };
  const pad = compact ? '5px 10px' : '8px 12px';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #000' }}>
        <div>
          <div style={{ fontSize: fs.title, fontWeight: 900 }}>{settings.name}</div>
          <div style={{ fontSize: fs.sub, color: '#555', marginTop: 1 }}>{settings.tagline}</div>
          <div style={{ fontSize: fs.sub, color: '#555' }}>{settings.address}, {settings.city} | {settings.phone}</div>
          {settings.gst && <div style={{ fontSize: fs.sub }}>GST: {settings.gst}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: compact ? 18 : 24, fontWeight: 900 }}>INVOICE</div>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700 }}>{order.orderId}</div>
          <div style={{ fontSize: fs.sub }}>{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
        </div>
      </div>

      {/* Bill To + Order Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: fs.sub, color: '#888', marginBottom: 3 }}>BILL TO</div>
          <div style={{ fontWeight: 800, fontSize: fs.body + 2 }}>{order.customerName}</div>
          <div style={{ fontSize: fs.body }}>{order.customerMobile}</div>
          {order.customerEmail && <div style={{ fontSize: fs.sub, color: '#555' }}>{order.customerEmail}</div>}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: fs.sub, color: '#888', marginBottom: 3 }}>ORDER INFO</div>
          <div style={{ fontSize: fs.body }}>Status: <strong>{order.orderStatus}</strong></div>
          <div style={{ fontSize: fs.body }}>Payment: <strong>{order.paymentStatus} ({order.paymentMethod})</strong></div>
          {order.deliveryDate && <div style={{ fontSize: fs.body }}>Delivery: <strong>{format(new Date(order.deliveryDate), 'dd MMM yyyy')}</strong></div>}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: fs.tableBody }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {['#', 'Item', 'Qty', 'Weight', 'Rate', 'Amount'].map(h => (
              <th key={h} style={{ padding: pad, textAlign: 'left', fontWeight: 700, fontSize: fs.tableHead }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => {
            const unit = getItemUnit(item.type);
            const isKg = unit === 'kg' || unit === 'both';
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: pad }}>{i + 1}</td>
                <td style={{ padding: pad, fontWeight: 600 }}>{item.type}</td>
                <td style={{ padding: pad }}>{item.quantity}</td>
                <td style={{ padding: pad }}>{isKg ? `${item.weight}kg` : '—'}</td>
                <td style={{ padding: pad }}>₹{item.rate} / {unit}</td>
                <td style={{ padding: pad, fontWeight: 700 }}>₹{Number(item.amount).toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals + UPI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {settings.upiId && order.paymentStatus !== 'Paid' ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6, border: '1px dashed #000', borderRadius: 4 }}>
            <img
              src="/upi-qr.png"
              alt="UPI QR" style={{ width: compact ? 60 : 70, height: compact ? 60 : 70 }}
            />
            <div style={{ fontSize: fs.sub }}>
              <div style={{ fontWeight: 'bold' }}>UPI SCAN & PAY</div>
              <div>₹{order.finalAmount.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: '#555' }}>{settings.upiId}</div>
            </div>
          </div>
        ) : <div />}
        <div style={{ minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: fs.body }}><span>Subtotal</span><span>₹{order.totalAmount.toFixed(0)}</span></div>
          {order.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: fs.body }}><span>Discount</span><span>-₹{order.discount.toFixed(0)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: fs.total, fontWeight: 900, borderTop: '2px solid #000', marginTop: 4 }}>
            <span>TOTAL</span><span>₹{order.finalAmount.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, textAlign: 'center', fontSize: fs.footer, color: '#888', borderTop: '1px solid #ddd', paddingTop: 8 }}>
        Thank you for choosing {settings.name}! | {settings.phone} | {settings.email}
      </div>
    </div>
  );
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { orders, load, updateStatus, updatePayment } = useOrderStore();
  const [settings, setSettings] = useState<CompanySettings>(settingsDB.get());
  const [order, setOrder] = useState<Order | null>(null);
  const [payToast, setPayToast] = useState<string | null>(null);

  const handleMarkPaid = (newStatus: 'Paid' | 'Unpaid') => {
    if (!order) return;
    updatePayment(order.id, newStatus);
    setOrder(prev => prev ? { ...prev, paymentStatus: newStatus } : null);
    setPayToast(newStatus === 'Paid' ? '✅ Marked as Paid!' : '↩️ Marked as Unpaid');
    setTimeout(() => setPayToast(null), 3000);
  };

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

    // Update local order state so the UI reflects the Completed status immediately
    setOrder(prev => prev ? { ...prev, orderStatus: 'Completed' } : null);

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

    const settingsObj = settingsDB.get();
    const isUnpaid = o.paymentStatus !== 'Paid';
    const upiText = (isUnpaid && settingsObj.upiId) 
      ? `\n💰 Pending Amount: ₹${o.finalAmount.toFixed(0)}\n💳 Pay via UPI: upi://pay?pa=${settingsObj.upiId}&pn=${encodeURIComponent(settingsObj.upiName || settingsObj.name)}&am=${o.finalAmount}&cu=INR\n`
      : '';
    const text = `Dear ${o.customerName},

Great news! Your laundry order ${o.orderId} is ready for collection at ${settingsObj.name}.
${upiText}
📋 Order Summary: ${o.items.length} items
🏪 Collection Point: ${settingsObj.name}, ${settingsObj.address}, ${settingsObj.city}
📞 Contact Number: ${settingsObj.phone}

Please visit us at your convenience to collect your clean, fresh garments. Thank you for choosing ${settingsObj.name}!`;

    // 3. Trigger WhatsApp & Email background sends in parallel
    const { sendWhatsAppDirect, sendEmailDirect } = await import('@/lib/notifications');
    
    const [waRes, emailRes] = await Promise.all([
      sendWhatsAppDirect(o.customerMobile, text, settingsObj),
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
  const printRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push('/login'); }, [isAuthenticated, router, mounted]);
  useEffect(() => { if (mounted) { load(); setSettings(settingsDB.get()); } }, [load, mounted]);
  useEffect(() => { if (mounted) { const o = orders.find(o => o.id === id); if (o) setOrder(o); } }, [orders, id, mounted]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`Invoice-${order?.orderId}.pdf`);
  };

  const handleWhatsApp = async () => {
    if (!order) return;
    const msg = `🧺 *${settings.name}*\n📋 Invoice: *${order.orderId}*\n\nDear *${order.customerName}*,\n\nYour laundry order is ready!\n\n` +
      order.items.map(i => {
        const unit = getItemUnit(i.type);
        const isKg = unit === 'kg';
        return isKg 
          ? `• ${i.type} — ${i.weight}kg × ₹${i.rate}/kg = *₹${i.amount}*`
          : `• ${i.type} — ${i.quantity}${unit} × ₹${i.rate}/${unit} = *₹${i.amount}*`;
      }).join('\n') +
      `\n\n💰 *Total: ₹${order.finalAmount.toFixed(0)}*\nPayment: ${order.paymentStatus} (${order.paymentMethod})\n\nThank you for choosing ${settings.name}! 🙏`;

    if (settings.whatsappGatewayUrl) {
      const email = order.customerEmail || `${order.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      setReadyNotif({
        show: true,
        orderId: order.orderId,
        customerName: order.customerName,
        mobile: order.customerMobile,
        email: email,
        loading: true,
        whatsappStatus: 'Generating PDF & Sending...',
        emailStatus: 'Skipped (WhatsApp only)',
        gatewayUsed: true
      });

      let pdfBase64: string | undefined;
      try {
        const { default: jsPDF } = await import('jspdf');
        const { default: html2canvas } = await import('html2canvas');
        if (printRef.current) {
          const canvas = await html2canvas(printRef.current, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const w = pdf.internal.pageSize.getWidth();
          const h = (canvas.height * w) / canvas.width;
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
          pdfBase64 = pdf.output('dataurlstring');
        }
      } catch (pdfErr) {
        console.error('Failed to generate PDF for WhatsApp:', pdfErr);
      }

      const { sendWhatsAppDirect } = await import('@/lib/notifications');
      const waRes = await sendWhatsAppDirect(
        order.customerMobile, 
        msg, 
        settings, 
        pdfBase64, 
        `Invoice-${order.orderId}.pdf`
      );

      setReadyNotif(prev => prev ? {
        ...prev,
        loading: false,
        whatsappStatus: waRes.success ? 'Invoice & PDF Sent via Gateway!' : `Failed: ${waRes.message}`,
        gatewayUsed: waRes.gatewayUsed
      } : null);
    } else {
      const phone = order.customerMobile.replace(/\D/g, '');
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const orderStatusColor: Record<string, string> = { Pending: 'var(--warning)', 'In-Progress': 'var(--primary-brand)', Completed: 'var(--success)', Delivered: 'var(--purple)' };
  const payColor: Record<string, string> = { Paid: 'var(--success)', Unpaid: 'var(--danger)', Partial: 'var(--warning)' };

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Invoice" subtitle={order?.orderId}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/orders" className="btn btn-glass btn-sm"><ArrowLeft size={14} />Back</Link>
              {order && <Link href={`/orders/${id}/tag`} className="btn btn-glass btn-sm">🏷️ Tag</Link>}
              {order && order.orderStatus !== 'Completed' && order.orderStatus !== 'Delivered' && (
                <button 
                  className="btn btn-sm" 
                  onClick={() => handleClothesReady(order)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    background: 'var(--success)', 
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700
                  }}
                >
                  <CheckCircle size={14} /> Clothes Ready
                </button>
              )}
              <button className="btn btn-glass btn-sm" onClick={handleWhatsApp}><MessageCircle size={14} />WhatsApp + PDF</button>
              <button className="btn btn-glass btn-sm" onClick={handleDownloadPDF}><Download size={14} />PDF</button>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}><Printer size={14} />Print</button>
              {order && (
                order.paymentStatus !== 'Paid' ? (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, cursor: 'pointer', padding: '6px 14px' }}
                    onClick={() => handleMarkPaid('Paid')}
                  >
                    <CheckCircle size={14} /> Mark as Paid
                  </button>
                ) : (
                  <button
                    className="btn btn-glass btn-sm"
                    style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => handleMarkPaid('Unpaid')}
                    title="Undo payment status"
                  >
                    <CheckCircle size={14} /> Paid ✓
                  </button>
                )
              )}
            </div>
          } />

        <div className="page-body fade-in">
          {!order ? (
            <div className="empty-state"><p>Order not found.</p></div>
          ) : (
            <div ref={printRef} className="card no-print" style={{ maxWidth: 760, margin: '0 auto', padding: 32 }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={22} color="white" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{settings.name}</h2>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '2px 0 0' }}>{settings.tagline}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>{settings.phone} · {settings.email}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>INVOICE</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-brand)', marginTop: 1 }}>{order.orderId}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
                </div>
              </div>

              <div className="divider" style={{ margin: '20px 0' }} />

              {/* Customer + Status Info */}
              <div className="input-row input-row-2" style={{ marginBottom: 24 }}>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>BILL TO</div>
                  <div style={{ fontWeight: 750, fontSize: 14.5, color: 'var(--text-primary)' }}>{order.customerName}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{order.customerMobile}</div>
                  {order.customerEmail && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{order.customerEmail}</div>}
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>ORDER INFO</div>
                  {[
                    { label: 'Order Status', val: order.orderStatus, color: orderStatusColor[order.orderStatus] },
                    { label: 'Payment', val: `${order.paymentStatus} (${order.paymentMethod})`, color: payColor[order.paymentStatus] },
                    ...(order.deliveryDate ? [{ label: 'Delivery', val: format(new Date(order.deliveryDate), 'dd MMM yyyy'), color: 'var(--text-primary)' }] : []),
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 550 }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['#', 'Item Type', 'Qty', 'Weight', 'Rate', 'Amount'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => {
                      const unit = getItemUnit(item.type);
                      const isKg = unit === 'kg';
                      return (
                        <tr key={item.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12.5 }}>{i + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 650, fontSize: 13, color: 'var(--text-primary)' }}>{item.type}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>{isKg ? `${item.weight} kg` : '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>₹{item.rate} / {unit}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 750, color: 'var(--text-primary)', fontSize: 13.5 }}>₹{Number(item.amount).toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & UPI Pay */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 40, flexWrap: 'wrap' }}>
                {settings.upiId && order.paymentStatus !== 'Paid' ? (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', flex: 1, minWidth: 280 }}>
                    <img 
                      src="/upi-qr.png" 
                      alt="UPI QR Code" 
                      style={{ width: 100, height: 100, border: '1px solid #e2e8f0', borderRadius: 4 }} 
                    />
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>UPI Scan & Pay</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>₹{order.finalAmount.toFixed(0)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>{settings.upiId}</div>
                      <div style={{ fontSize: 9.5, color: 'var(--primary-brand)', fontWeight: 650, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 8 }}>●</span> GPay · PhonePe · Paytm · BHIM
                      </div>
                    </div>
                  </div>
                ) : <div style={{ flex: 1 }} />}

                <div style={{ minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <span>Total Weight</span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.totalWeight.toFixed(2)} kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{order.totalAmount.toFixed(0)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--success)' }}>
                      <span>Discount</span><span style={{ fontWeight: 700 }}>-₹{order.discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 850, fontSize: 18, color: 'var(--text-primary)' }}>
                    <span>Total Bill</span><span>₹{order.finalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {order.notes && (
                <div style={{ marginTop: 18, padding: '12px 16px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Instructions</div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>{order.notes}</p>
                </div>
              )}

              <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11.5, paddingTop: 18, borderTop: '1px solid var(--border-light)' }}>
                <p>{settings.address}, {settings.city}, {settings.state} — {settings.pincode}</p>
                {settings.gst && <p style={{ marginTop: 3 }}>GST: {settings.gst}</p>}
                <p style={{ marginTop: 8, color: 'var(--text-primary)', fontWeight: 700 }}>Thank you for choosing {settings.name}! 🙏</p>
              </div>
            </div>
          )}

          {/* Print-only white invoice — TWO COPIES: Customer + Shop */}
          <style>{`
            @media print {
              .app-layout, .sidebar, .topbar, .no-print { display: none !important; }
              .print-invoice { display: block !important; }
              body { background: white !important; margin: 0; padding: 16px; font-family: Arial, sans-serif; color: #000; }
            }
          `}</style>
          {order && (
            <div className="print-invoice" style={{ display: 'none', maxWidth: 720, margin: '0 auto' }}>

              {/* ───── CUSTOMER COPY ───── */}
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  ✂ CUSTOMER COPY
                </div>
                <InvoiceCopyBlock order={order} settings={settings} />
              </div>

              {/* ───── DASHED CUT LINE ───── */}
              <div style={{ margin: '18px 0', borderTop: '1.5px dashed #999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ background: 'white', padding: '0 10px', fontSize: 14, color: '#aaa', marginTop: -10 }}>✂</span>
              </div>

              {/* ───── SHOP COPY ───── */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  ✂ SHOP COPY
                </div>
                <InvoiceCopyBlock order={order} settings={settings} compact />
              </div>

            </div>
          )}
        </div>
      </div>

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
                      const settingsObj = settingsDB.get();
                      const cleanMobile = readyNotif.mobile.replace(/\D/g, '');
                      const formattedMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
                      const text = `Dear ${readyNotif.customerName},

Great news! Your laundry order ${readyNotif.orderId} is ready for collection at ${settingsObj.name}.

Please visit us at your convenience to collect your clean, fresh garments. Thank you for choosing ${settingsObj.name}!`;
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

      {/* Payment Toast */}
      {payToast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: payToast.includes('Paid!') ? '#16a34a' : '#0284c7',
          color: '#fff', borderRadius: 12, padding: '12px 22px',
          fontSize: 14, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideUpToast 0.25s ease'
        }}>
          {payToast}
        </div>
      )}
      <style>{`
        @keyframes slideUpToast {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
