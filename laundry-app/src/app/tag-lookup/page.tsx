'use client';
import { useState, useEffect, useRef } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { settingsDB } from '@/lib/db';
import { ShoppingBag, Search, Tag } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Order, CompanySettings } from '@/types';
import jsbarcode from 'jsbarcode';

function BarcodeDisplay({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current) {
      try {
        jsbarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 10,
          margin: 4,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [value]);
  return <svg ref={svgRef} style={{ width: '100%', maxWidth: 220 }} />;
}

export default function TagLookupPage() {
  const { orders, load } = useOrderStore();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [query, setQuery] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [foundTagIndex, setFoundTagIndex] = useState<number | null>(null);
  const [foundItemType, setFoundItemType] = useState<string>('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    load();
    setSettings(settingsDB.get());
  }, [load]);

  useEffect(() => {
    if (!query) {
      setFoundOrder(null);
      setFoundTagIndex(null);
      setFoundItemType('');
      return;
    }

    const trimmed = query.trim().toUpperCase();
    // Parse tag id e.g. ORD-0003-001 or ORD-0003
    const tagMatch = trimmed.match(/^(ORD-\d{4})-(\d{3})$/);
    let orderId = '';
    let tagIdx: number | null = null;

    if (tagMatch) {
      orderId = tagMatch[1];
      tagIdx = parseInt(tagMatch[2], 10);
    } else {
      orderId = trimmed;
    }

    const matchedOrder = orders.find(o => o.orderId.toUpperCase() === orderId);
    if (matchedOrder) {
      setFoundOrder(matchedOrder);
      if (tagIdx !== null) {
        setFoundTagIndex(tagIdx);
        // Find which item type this tag index belongs to
        let currentIdx = 1;
        let itemType = '';
        for (const item of matchedOrder.items) {
          const qty = Math.max(1, Number(item.quantity));
          if (tagIdx >= currentIdx && tagIdx < currentIdx + qty) {
            itemType = item.type;
            break;
          }
          currentIdx += qty;
        }
        setFoundItemType(itemType || 'Laundry Item');
      } else {
        setFoundTagIndex(null);
        setFoundItemType('');
      }
    } else {
      setFoundOrder(null);
      setFoundTagIndex(null);
      setFoundItemType('');
    }
  }, [query, orders]);

  if (!mounted) return null;

  const statusBadge = (s: string) => ({ Pending: 'badge-yellow', 'In-Progress': 'badge-blue', Completed: 'badge-green', Delivered: 'badge-purple' }[s] || 'badge-gray');
  const payBadge = (s: string) => ({ Paid: 'badge-green', Unpaid: 'badge-red', Partial: 'badge-yellow' }[s] || 'badge-gray');

  return (
    <div className="auth-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '24px 16px' }}>
      <div className="auth-card" style={{ width: '100%', maxWidth: 440, background: 'var(--bg-primary)', padding: '28px 24px', borderRadius: 16, boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{settings?.name || 'LaundryTO'}</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Garment Tag Lookup</h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Scan barcode or enter ID to view garment & customer details</p>
        </div>

        {/* Search Input */}
        <div className="search-bar" style={{ width: '100%', marginBottom: 20 }}>
          <Search size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Scan barcode or type ORD-XXXX-XXX..." 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lookup results */}
        {foundOrder ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tag details ticket */}
            <div style={{
              background: '#ffffff',
              border: '2px solid var(--border-light)',
              borderRadius: 12,
              padding: 16,
              color: '#000000',
              fontFamily: 'monospace',
              fontSize: 13,
              boxShadow: 'var(--shadow-sm)'
            }}>
              
              {/* Ticket logo header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottom: '1px dashed #ccc', paddingBottom: 8, marginBottom: 12 }}>
                <img src="/logo.jpg" alt="Logo" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{settings?.name || 'LAUNDRYTO'}</span>
              </div>

              {/* Customer and Order info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Customer Name:</span>
                  <span>{foundOrder.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Mobile Number:</span>
                  <span>{foundOrder.customerMobile}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Order Number:</span>
                  <span style={{ fontWeight: 700 }}>{foundOrder.orderId}</span>
                </div>
                {foundTagIndex !== null && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700 }}>Garment Type:</span>
                      <span style={{ fontWeight: 700 }}>{foundItemType.toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700 }}>Garment Tag ID:</span>
                      <span style={{ fontWeight: 700 }}>{foundOrder.orderId}-{String(foundTagIndex).padStart(3, '0')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Barcode representation */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '14px 0', paddingTop: 8, borderTop: '1px dashed #ccc' }}>
                <BarcodeDisplay value={foundTagIndex !== null ? `${foundOrder.orderId}-${String(foundTagIndex).padStart(3, '0')}` : foundOrder.orderId} />
              </div>

              {/* Status details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px dashed #ccc', paddingTop: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Order Status:</span>
                  <span className={`badge ${statusBadge(foundOrder.orderStatus)}`}>{foundOrder.orderStatus}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Payment Status:</span>
                  <span className={`badge ${payBadge(foundOrder.paymentStatus)}`}>{foundOrder.paymentStatus}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Date Received:</span>
                  <span>{format(new Date(foundOrder.createdAt), 'dd MMM yyyy')}</span>
                </div>
                {foundOrder.deliveryDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>Delivery Date:</span>
                    <span>{format(new Date(foundOrder.deliveryDate), 'dd MMM yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : query ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <ShoppingBag />
            <h3>No results found</h3>
            <p style={{ fontSize: 12 }}>Check your tag ID prefix (e.g. ORD-0003-001)</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 0', border: '1px dashed var(--border-light)', borderRadius: 12 }}>
            <Tag size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Waiting for barcode scan...</p>
          </div>
        )}

        {/* Back Link */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--primary-brand)', textDecoration: 'none', fontWeight: 650 }}>
            Go to Admin Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
