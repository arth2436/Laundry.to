'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Users, Plus, Search, Trash2, Eye, Phone, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Customer } from '@/types';

export default function CustomersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { customers, load, addCustomer, deleteCustomer, searchCustomers } = useCustomerStore();
  const { orders, load: loadO } = useOrderStore();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', email: '' });
  const [err, setErr] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !isAuthenticated) router.push('/login'); }, [isAuthenticated, router, mounted]);
  useEffect(() => { if (mounted) { load(); loadO(); } }, [load, loadO, mounted]);

  const displayed = query ? searchCustomers(query) : customers;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile) { setErr('Name and mobile are required.'); return; }
    if (!/^\d{10}$/.test(form.mobile)) { setErr('Mobile must be 10 digits.'); return; }
    addCustomer(form);
    setForm({ name: '', mobile: '', email: '' });
    setErr('');
    setShowAdd(false);
  };

  const getCustomerRevenue = (cid: string) =>
    orders.filter(o => o.customerId === cid && o.paymentStatus === 'Paid').reduce((s, o) => s + o.finalAmount, 0);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Customers" subtitle={`${customers.length} registered customers`}
          actions={
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={15} />Add Customer</button>
          } />
        <div className="page-body fade-in">
          <div className="card">
            <div className="section-header" style={{ marginBottom: 24 }}>
              <div className="search-bar">
                <Search size={16} />
                <input className="search-input" placeholder="Search by name, mobile, ID…" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{displayed.length} results</span>
            </div>

            {displayed.length === 0 ? (
              <div className="empty-state"><Users /><h3>No customers found</h3><p>Add your first customer to get started.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="mobile-responsive-table">
                  <thead>
                    <tr><th>Customer</th><th>Mobile</th><th>Email</th><th>Orders</th><th>Revenue</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {displayed.map((c: Customer) => (
                      <tr key={c.id}>
                        <td data-label="Customer">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, boxShadow: '0 2px 6px rgba(15,23,42,0.1)' }}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 650, color: 'var(--text-primary)' }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.customerId}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Mobile"><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Phone size={12} style={{ color: 'var(--text-muted)' }} />{c.mobile}</div></td>
                        <td data-label="Email"><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}><Mail size={12} style={{ color: 'var(--text-muted)' }} />{c.email || '—'}</div></td>
                        <td data-label="Orders"><span className="badge badge-blue">{c.totalOrders}</span></td>
                        <td data-label="Revenue" style={{ fontWeight: 750, color: 'var(--success)' }}>₹{getCustomerRevenue(c.id).toLocaleString('en-IN')}</td>
                        <td data-label="Joined" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Link href={`/orders?customer=${c.id}`} className="btn btn-glass btn-sm btn-icon" title="View Customer Orders"><Eye size={14} /></Link>
                            <button className="btn btn-glass btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteCustomer(c.id)} title="Delete Customer"><Trash2 size={14} /></button>
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

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Add Customer</h2>
              <button className="btn btn-glass btn-icon btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer full name" required />
              </div>
              <div className="input-group">
                <label className="input-label">Mobile Number *</label>
                <input className="input" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit mobile number" maxLength={10} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email (optional)</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="customer@email.com" />
              </div>
              {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
              <div className="modal-footer" style={{ marginTop: 0, paddingTop: 16 }}>
                <button type="button" className="btn btn-glass" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
