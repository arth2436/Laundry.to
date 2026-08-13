'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { settingsDB } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { CompanySettings, Order } from '@/types';
import QRCode from 'qrcode';

// Each physical garment gets its own tag
interface GarmentTag {
  tagId: string;           // e.g. ORD-0001-001
  globalIndex: number;     // e.g. 3
  totalItems: number;      // e.g. 17  (total across all items)
  itemType: string;        // e.g. "T-Shirt"
  customerName: string;
  orderId: string;
  mobile: string;
  createdAt: string;
  deliveryDate?: string;
  shopName: string;
}

// Generate one tag per quantity unit across all items
function buildTags(order: Order, shopName: string): GarmentTag[] {
  let total = 0;
  order.items.forEach(i => { total += Math.max(1, Number(i.quantity)); });

  const tags: GarmentTag[] = [];
  let globalIndex = 1;

  order.items.forEach((item, itemIdx) => {
    const qty = Math.max(1, Number(item.quantity));
    for (let q = 0; q < qty; q++) {
      const seq = String(globalIndex).padStart(3, '0');
      tags.push({
        tagId: `${order.orderId}-${seq}`,
        globalIndex,
        totalItems: total,
        itemType: item.type,
        customerName: order.customerName,
        orderId: order.orderId,
        mobile: order.customerMobile,
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        shopName,
      });
      globalIndex++;
    }
  });

  return tags;
}

// BarcodeCanvas: renders a 1D Code128 barcode using JsBarcode
function BarcodeCanvas({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    import('jsbarcode').then(mod => {
      if (cancelled || !svgRef.current) return;
      const JsBarcode = mod.default;
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.6,
        height: 38,
        displayValue: false, // hide value in raw barcode image itself to make it cleaner
        margin: 2,
        lineColor: '#000000',
        background: '#ffffff',
      });
    });
    return () => { cancelled = true; };
  }, [value]);

  return <svg ref={svgRef} style={{ width: '100%', maxWidth: 220 }} />;
}

// SingleTag component
function SingleTag({ tag, idx, isLast }: { tag: GarmentTag; idx: number; isLast: boolean }) {
  const date = new Date(tag.createdAt);
  const dayStr = format(date, 'EEE, dd/MMM');

  const deliveryStr = tag.deliveryDate
    ? format(new Date(tag.deliveryDate), 'dd/MMM')
    : '—';

  return (
    <div style={{
      width: '100%',
      maxWidth: 300,
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 12,
      color: '#000',
      background: '#fff',
      padding: '12px 14px',
      pageBreakAfter: isLast ? 'avoid' : 'always',
      breakAfter: isLast ? 'avoid' : 'always',
    }}>
      {/* Logo & Shop Name Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8, borderBottom: '1px dashed #ccc', paddingBottom: 6 }}>
        <img 
          src="/logo.jpg" 
          alt="Logo" 
          style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #ccc', objectFit: 'cover' }} 
        />
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {tag.shopName}
        </div>
      </div>

      {/* Customer & Order details */}
      <div style={{ lineHeight: 1.3, marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Customer:</span>
          <span>{tag.customerName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Mobile:</span>
          <span>{tag.mobile}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Order No:</span>
          <span style={{ fontWeight: 700 }}>{tag.orderId}</span>
        </div>
      </div>

      {/* Barcode Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '6px 0', borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '6px 0' }}>
        <BarcodeCanvas value={tag.tagId} />
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#000', marginTop: -2 }}>{tag.tagId}</div>
      </div>

      {/* Item info */}
      <div style={{ marginTop: 4, lineHeight: 1.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Garment:</span>
          <span style={{ fontWeight: 700 }}>{tag.itemType.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Received:</span>
          <span>{dayStr}</span>
        </div>
        {tag.deliveryDate && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Delivery:</span>
            <span style={{ fontWeight: 750 }}>{deliveryStr}</span>
          </div>
        )}
      </div>

      {/* Item count / total */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingTop: 4, borderTop: '1px solid #000' }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>
          TAG {tag.globalIndex} OF {tag.totalItems}
        </div>
      </div>

      {/* Dashed separator (except last) */}
      {!isLast && (
        <div style={{
          marginTop: 10,
          borderTop: '2px dashed #000',
          marginLeft: -14, marginRight: -14,
        }} />
      )}
    </div>
  );
}

export default function TagPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { orders, load } = useOrderStore();
  const [settings, setSettings] = useState<CompanySettings>(settingsDB.get());
  const [order, setOrder] = useState<Order | null>(null);
  const [tags, setTags] = useState<GarmentTag[]>([]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push('/login'); }, [isAuthenticated, router, mounted]);
  useEffect(() => { if (mounted) { load(); setSettings(settingsDB.get()); } }, [load, mounted]);
  useEffect(() => {
    if (mounted) {
      const o = orders.find(o => o.id === id);
      if (o) {
        setOrder(o);
        setTags(buildTags(o, settingsDB.get().name));
      }
    }
  }, [orders, id, mounted]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar
          title="Laundry Tags"
          subtitle={order ? `${tags.length} tags — ${order.orderId}` : ''}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={`/orders/${id}/invoice`} className="btn btn-glass btn-sm">
                <ArrowLeft size={14} />Invoice
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={14} />Print All Tags
              </button>
            </div>
          }
        />

        <div className="page-body fade-in">
          {!order ? (
            <div className="empty-state"><p>Order not found.</p></div>
          ) : (
            <>
              {/* Screen preview */}
              <div className="no-print" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* Info card */}
                <div className="card" style={{ flex: '0 0 260px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--text-primary)' }}>
                    📋 Tag Summary
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Order</span>
                      <span style={{ fontWeight: 700 }}>{order.orderId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Customer</span>
                      <span style={{ fontWeight: 600 }}>{order.customerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Mobile</span>
                      <span>{order.customerMobile}</span>
                    </div>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{item.type}</span>
                        <span className="badge badge-blue">{item.quantity} tag{item.quantity > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Tags</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 16 }}>{tags.length}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
                    onClick={() => window.print()}
                  >
                    <Printer size={15} />Print {tags.length} Tags
                  </button>
                </div>

                {/* Tag preview strip */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Preview — Thermal Roll Format
                  </div>
                  <div style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: 'white',
                    boxShadow: 'var(--shadow-md)',
                    width: 'fit-content',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}>
                    {tags.map((tag, i) => (
                      <SingleTag key={tag.tagId} tag={tag} idx={i} isLast={i === tags.length - 1} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Print layout — full thermal roll */}
              <style>{`
                @media print {
                  html, body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .app-layout, .sidebar, .topbar, .no-print {
                    display: none !important;
                  }
                  .print-tags {
                    display: block !important;
                  }
                  @page {
                    size: 80mm auto;
                    margin: 0;
                  }
                }
              `}</style>

              <div className="print-tags" style={{ display: 'none' }}>
                {tags.map((tag, i) => (
                  <SingleTag key={tag.tagId} tag={tag} idx={i} isLast={i === tags.length - 1} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
