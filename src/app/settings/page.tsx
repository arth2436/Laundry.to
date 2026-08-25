'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { settingsDB, servicesDB, serviceItemsDB, DEFAULT_SETTINGS, DEFAULT_SERVICE_ITEMS, usersDB } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Save, Plus, Trash2, Settings as SettingsIcon, Layers, Search, Check, X, ShieldAlert, MessageCircle, Download, Upload } from 'lucide-react';
import { CompanySettings, Service, ServiceItem, User } from '@/types';

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const CATEGORIES = ['MEN', 'Women', 'Kids', 'Footwear', 'Household'];

import { useSettingsStore } from '@/store/settingsStore';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, hasAccess } = useAuthStore();
  const loadSettings = useSettingsStore(s => s.load);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'catalog' | 'whatsapp' | 'email' | 'security'>('profile');
  const [activeService, setActiveService] = useState('wash-fold');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Users password states
  const [users, setUsers] = useState<User[]>([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');

  // WhatsApp Local Gateway states
  const [waStatus, setWaStatus] = useState<string>('Loading');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState<string | null>(null);
  const [waServerRunning, setWaServerRunning] = useState<boolean>(true);
  const [waPublicUrl, setWaPublicUrl] = useState<string | null>(null);

  const handleExportData = () => {
    const data: Record<string, string | null> = {};
    const keys = ['lms_customers', 'lms_orders', 'lms_settings', 'lms_rates', 'lms_users', 'lms_services', 'lms_service_items', 'lms_auth'];
    keys.forEach(k => {
      data[k] = localStorage.getItem(k);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laundryto_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('Importing data will overwrite your current settings, customers, and orders. Do you want to proceed?')) {
          Object.entries(data).forEach(([key, val]) => {
            if (val && typeof val === 'string') {
              localStorage.setItem(key, val);
            }
          });
          alert('Data imported successfully! The page will now reload.');
          window.location.reload();
        }
      } catch (err) {
        alert('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setSettings(settingsDB.get());
      setServices(servicesDB.getAll());
      // Always reload from DB to trigger migration of old localStorage data
      const freshItems = serviceItemsDB.getAll();
      setItems(freshItems);

      const allUsers = usersDB.getAll();
      setUsers(allUsers);
      const adminU = allUsers.find(u => u.role === 'admin');
      const cashierU = allUsers.find(u => u.role === 'cashier');
      if (adminU) setAdminPassword(adminU.password);
      if (cashierU) setCashierPassword(cashierU.password);
    }
  }, [mounted]);

  // WhatsApp Connection Polling
  useEffect(() => {
    if (activeTab !== 'whatsapp') return;
    
    let active = true;
    const fetchStatus = async () => {
      try {
        let gatewayOrigin = 'http://localhost:5000';
        if (settings.whatsappGatewayUrl) {
          try {
            gatewayOrigin = new URL(settings.whatsappGatewayUrl).origin;
          } catch (e) {}
        }
        const res = await fetch(`${gatewayOrigin}/status`, {
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        if (!active) return;
        

        if (!res.ok) throw new Error('Gateway returned error status');
        const data = await res.json();
        setWaStatus(data.status);
        setWaQr(data.qr);
        setWaNumber(data.number);
        setWaServerRunning(true);
        // Auto-detect and save public ngrok URL from gateway
        if (data.publicUrl && data.publicUrl !== settings.whatsappGatewayUrl) {
          setWaPublicUrl(data.publicUrl);
        }
      } catch (err) {
        if (!active) return;
        setWaStatus('Disconnected');
        setWaQr(null);
        setWaNumber(null);
        setWaServerRunning(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeTab, settings.whatsappGatewayUrl]);

  const handleWaDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your WhatsApp session?')) return;
    try {
      setWaStatus('Loading');
      let gatewayOrigin = 'http://localhost:5000';
      if (settings.whatsappGatewayUrl) {
        try {
          gatewayOrigin = new URL(settings.whatsappGatewayUrl).origin;
        } catch (e) {}
      }
      const res = await fetch(`${gatewayOrigin}/disconnect`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        alert('Disconnect request sent. Please wait for a new QR code to load.');
      } else {
        alert('Failed to disconnect WhatsApp.');
      }
    } catch (err) {
      alert('Failed to connect to local gateway server.');
    }
  };

  const handleAutoConfigure = () => {
    const updated = {
      ...settings,
      whatsappGatewayUrl: 'http://localhost:5000/messages/chat'
    };
    setSettings(updated);
    settingsDB.save(updated);
    loadSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    alert('Portal configured and saved successfully to use your local free gateway!');
  };

  const handleUpdatePassword = (userId: string, role: string, newPw: string) => {
    if (!newPw || newPw.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    const updatedUsers = users.map(u => u.id === userId ? { ...u, password: newPw.trim() } : u);
    setUsers(updatedUsers);
    usersDB.save(updatedUsers);
    alert(`${role.charAt(0).toUpperCase() + role.slice(1)} password updated successfully!`);
  };

  const handleSave = () => {
    try {
      console.log('💾 Saving data...');
      console.log('Items to save:', items.map(i => ({ name: i.name, price: i.price })));
      
      // Save to localStorage with verification
      settingsDB.save(settings);
      servicesDB.save(services);
      serviceItemsDB.save(items);
      
      // Verify save was successful by reading back
      const verification = serviceItemsDB.getAll();
      console.log('✓ Verification - Items in DB:', verification.map(i => ({ name: i.name, price: i.price })));
      
      const shirtItem = verification.find(i => i.name === 'Shirt');
      if (shirtItem) {
        console.log('✓ Shirt price confirmed saved:', shirtItem.price);
      }
      
      // Also check raw localStorage
      const rawData = localStorage.getItem('lms_service_items');
      if (rawData) {
        const parsed = JSON.parse(rawData);
        const rawShirt = parsed.find((i: any) => i.name === 'Shirt');
        console.log('✓ Raw localStorage Shirt price:', rawShirt?.price);
      }
      
      loadSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      alert('✓ Settings saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving changes. Please try again.');
    }
  };

  const updateItem = (itemId: string, field: keyof ServiceItem, val: any) => {
    console.log(`📝 Updating ${field} for item ${itemId} to:`, val);
    setItems(prev => {
      const updated = prev.map(item => item.id === itemId ? { ...item, [field]: val } : item);
      const updatedItem = updated.find(i => i.id === itemId);
      console.log(`✓ Item after update:`, updatedItem);
      return updated;
    });
  };

  const addItem = () => {
    const activeS = services.find(s => s.id === activeService);
    const defaultUnit = activeS?.defaultUnit || 'pc';
    const newItem: ServiceItem = {
      id: uid(),
      serviceId: activeService,
      name: 'New Laundry Item',
      category: activeService === 'shoe-clean' ? 'Footwear' : (activeService === 'household-clean' ? 'Household' : 'MEN'),
      price: defaultUnit === 'kg' ? 50 : 20,
      unit: defaultUnit,
      processingTime: '24 hours',
      enabled: true,
      icon: activeService === 'shoe-clean' ? '👟' : (activeService === 'household-clean' ? '🛌' : '👚')
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const setSettingValue = (k: keyof CompanySettings, v: string) => {
    setSettings(p => ({ ...p, [k]: v }));
  };

  const activeServiceObj = services.find(s => s.id === activeService);
  const filteredItems = items.filter(item => {
    const matchesService = item.serviceId === activeService;
    const matchesSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || item.category.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesService && matchesSearch;
  });

  if (!mounted) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Settings" subtitle="LMS Company Profile & Service Items Configurations"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                <Save size={15} />{saved ? '✓ Saved!' : 'Save Changes'}
              </button>
            </div>
          } />
        
        <div className="page-body fade-in">
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
            <button 
              onClick={() => setActiveTab('profile')} 
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                background: activeTab === 'profile' ? 'var(--primary-brand)' : 'transparent',
                color: activeTab === 'profile' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <SettingsIcon size={16} /> Company Profile
            </button>
            <button 
              onClick={() => setActiveTab('catalog')} 
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                background: activeTab === 'catalog' ? 'var(--primary-brand)' : 'transparent',
                color: activeTab === 'catalog' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Layers size={16} /> Service Items Catalog
            </button>
            <button 
              onClick={() => setActiveTab('whatsapp')} 
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                background: activeTab === 'whatsapp' ? 'var(--primary-brand)' : 'transparent',
                color: activeTab === 'whatsapp' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <MessageCircle size={16} /> WhatsApp Link
            </button>
            <button 
              onClick={() => setActiveTab('email')} 
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                background: activeTab === 'email' ? 'var(--primary-brand)' : 'transparent',
                color: activeTab === 'email' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ fontSize: 16 }}>📧</span> Email Settings
            </button>
            <button 
              onClick={() => setActiveTab('security')} 
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                background: activeTab === 'security' ? 'var(--primary-brand)' : 'transparent',
                color: activeTab === 'security' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ShieldAlert size={16} /> Security Settings
            </button>
          </div>

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="content-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Profile Form */}
                <div className="card">
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🏢 Shop Profile Information
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="input-group"><label className="input-label">Company Name</label><input className="input" value={settings.name || ''} onChange={e => setSettingValue('name', e.target.value)} /></div>
                    <div className="input-group"><label className="input-label">Tagline</label><input className="input" value={settings.tagline || ''} onChange={e => setSettingValue('tagline', e.target.value)} /></div>
                    <div className="input-group"><label className="input-label">Address</label><input className="input" value={settings.address || ''} onChange={e => setSettingValue('address', e.target.value)} /></div>
                    
                    <div className="input-row input-row-3">
                      <div className="input-group"><label className="input-label">City</label><input className="input" value={settings.city || ''} onChange={e => setSettingValue('city', e.target.value)} /></div>
                      <div className="input-group"><label className="input-label">State</label><input className="input" value={settings.state || ''} onChange={e => setSettingValue('state', e.target.value)} /></div>
                      <div className="input-group"><label className="input-label">Pincode</label><input className="input" value={settings.pincode || ''} onChange={e => setSettingValue('pincode', e.target.value)} /></div>
                    </div>
                    
                    <div className="input-row input-row-2">
                      <div className="input-group"><label className="input-label">Phone</label><input className="input" value={settings.phone || ''} onChange={e => setSettingValue('phone', e.target.value)} /></div>
                      <div className="input-group"><label className="input-label">Email Address</label><input className="input" type="email" value={settings.email || ''} onChange={e => setSettingValue('email', e.target.value)} /></div>
                    </div>
                    
                    <div className="input-group"><label className="input-label">GST Number</label><input className="input" value={settings.gst || ''} onChange={e => setSettingValue('gst', e.target.value)} /></div>
                    
                    <div className="input-row input-row-2">
                      <div className="input-group"><label className="input-label">Merchant UPI ID (for QR Payments)</label><input className="input" value={settings.upiId || ''} onChange={e => setSettingValue('upiId', e.target.value)} placeholder="laundryto@okaxis" /></div>
                      <div className="input-group"><label className="input-label">UPI Merchant Name</label><input className="input" value={settings.upiName || ''} onChange={e => setSettingValue('upiName', e.target.value)} placeholder="LaundryTO" /></div>
                    </div>
                    
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      💬 WhatsApp Gateway (Local)
                    </div>
                    <div className="input-group">
                      <label className="input-label">WhatsApp Gateway URL</label>
                      <input 
                        className="input" 
                        value={settings.whatsappGatewayUrl || ''} 
                        onChange={e => setSettingValue('whatsappGatewayUrl', e.target.value)} 
                        placeholder="http://localhost:5000/messages/chat" 
                      />
                    </div>
                  </div>
                </div>

                {/* Login Credentials & Quick Stats Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="card">
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔐 Role Credentials</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ padding: '12px 16px', background: 'var(--primary-brand-light)', border: '1px solid rgba(0, 102, 204, 0.15)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                        <div style={{ fontWeight: 750, color: 'var(--text-primary)', marginBottom: 4 }}>👑 Admin Role</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Username: <strong>Admin</strong></div>
                        <div style={{ color: 'var(--text-secondary)' }}>Password: <strong>admin@009</strong></div>
                      </div>
                      <div style={{ padding: '12px 16px', background: 'var(--purple-light)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                        <div style={{ fontWeight: 750, color: 'var(--text-primary)', marginBottom: 4 }}>💼 Cashier Desk Role</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Username: <strong>cashier</strong></div>
                        <div style={{ color: 'var(--text-secondary)' }}>Password: <strong>cashier@909</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Service Selection Scrollbar */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin' }}>
                {services.map(s => {
                  const isSelected = s.id === activeService;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setActiveService(s.id); setCatalogSearch(''); }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1px solid var(--primary-brand)' : '1px solid var(--border-light)',
                        background: isSelected ? 'var(--primary-brand)' : 'var(--bg-primary)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12.5,
                        fontWeight: 750,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Service Pricing Catalog Manager Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Manage Items for: <span style={{ color: 'var(--primary-brand)' }}>{activeServiceObj?.label}</span>
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      Configure individual items, pricing rate, and billing unit (kg, pc, pair, etc.) for this service module.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: 220 }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        className="input" 
                        style={{ paddingLeft: 30, fontSize: 12, height: 36 }} 
                        placeholder="Search items..." 
                        value={catalogSearch} 
                        onChange={e => setCatalogSearch(e.target.value)} 
                      />
                    </div>
                    <button 
                      className="btn btn-glass btn-sm" 
                      title="Reset catalog to default items"
                      onClick={() => {
                        if (confirm('Reset catalog to defaults? This will clear all your custom items for this service.')) {
                          const defaults = DEFAULT_SERVICE_ITEMS.filter((i: ServiceItem) => i.serviceId === activeService);
                          setItems(prev => [
                            ...prev.filter(i => i.serviceId !== activeService),
                            ...defaults
                          ]);
                        }
                      }}
                    >
                      Reset
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={addItem}>
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </div>

                {/* Items CRUD Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)' }}>Icon</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)' }}>Garment Item Name</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)' }}>Category</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)' }}>Price (₹)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)' }}>Unit</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)' }}>Est. Time</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-tertiary)' }}>Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-tertiary)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No items configured for this service. Click "Add Item" to add the first garment.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            {/* Emoji Icon */}
                            <td style={{ padding: '8px 14px' }}>
                              <input 
                                className="input" 
                                style={{ width: 44, textAlign: 'center', padding: '6px' }} 
                                value={item.icon || '👕'} 
                                onChange={e => updateItem(item.id, 'icon', e.target.value)} 
                              />
                            </td>
                            {/* Item Name */}
                            <td style={{ padding: '8px 14px' }}>
                              <input 
                                className="input" 
                                style={{ fontWeight: 600 }}
                                value={item.name} 
                                onChange={e => updateItem(item.id, 'name', e.target.value)} 
                              />
                            </td>
                            {/* Category Select */}
                            <td style={{ padding: '8px 14px' }}>
                              <select 
                                className="input" 
                                style={{ padding: '6px 10px', height: 34 }}
                                value={item.category} 
                                onChange={e => updateItem(item.id, 'category', e.target.value)}
                              >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            {/* Price */}
                            <td style={{ padding: '8px 14px' }}>
                              <input 
                                className="input" 
                                type="number" 
                                placeholder="0"
                                value={item.price === undefined ? '' : item.price} 
                                onChange={e => updateItem(item.id, 'price', e.target.value === '' ? 0 : Number(e.target.value))} 
                                style={{ width: 90 }}
                              />
                            </td>
                            {/* Unit */}
                             <td style={{ padding: '8px 14px' }}>
                               <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                 <select 
                                   className="input" 
                                   style={{ padding: '6px 10px', height: 34, width: 85 }}
                                   value={['pc', 'kg', 'both', 'pair', 'set', 'sqft'].includes(item.unit || 'pc') ? (item.unit || 'pc') : 'custom'} 
                                   onChange={e => {
                                     const val = e.target.value;
                                     if (val === 'custom') {
                                       updateItem(item.id, 'unit', '');
                                     } else {
                                       updateItem(item.id, 'unit', val);
                                     }
                                   }}
                                 >
                                   <option value="pc">pc</option>
                                   <option value="kg">kg</option>
                                   <option value="both">both</option>
                                   <option value="pair">pair</option>
                                   <option value="set">set</option>
                                   <option value="sqft">sqft</option>
                                   <option value="custom">Custom...</option>
                                 </select>
                                 {!['pc', 'kg', 'both', 'pair', 'set', 'sqft'].includes(item.unit || 'pc') && (
                                   <input 
                                     className="input" 
                                     style={{ width: 80 }}
                                     placeholder="Unit..."
                                     value={item.unit || ''} 
                                     onChange={e => updateItem(item.id, 'unit', e.target.value)} 
                                   />
                                 )}
                               </div>
                             </td>
                            {/* Est Time */}
                            <td style={{ padding: '8px 14px' }}>
                              <input 
                                className="input" 
                                value={item.processingTime} 
                                onChange={e => updateItem(item.id, 'processingTime', e.target.value)} 
                              />
                            </td>
                            {/* Active Toggle Switch */}
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={item.enabled} 
                                  onChange={e => updateItem(item.id, 'enabled', e.target.checked)} 
                                   style={{ width: 34, height: 18, appearance: 'none', background: item.enabled ? 'var(--success)' : 'var(--border-light)', borderRadius: 9, transition: '0.2s', position: 'relative', cursor: 'pointer' }}
                                />
                                <div style={{ width: 12, height: 12, background: '#fff', borderRadius: '50%', position: 'absolute', transform: item.enabled ? 'translateX(18px)' : 'translateX(3px)', transition: '0.2s' }} />
                              </label>
                            </td>
                            {/* Delete Button */}
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                              <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(item.id)}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
              <div className="card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, background: '#25D366', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}>
                    <MessageCircle size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Direct WhatsApp Link</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Connect your personal or business WhatsApp to automate your shop notifications for free.</p>
                  </div>
                </div>

                <div className="divider" style={{ margin: '20px 0' }} />

                {/* Auto-detected Public URL Banner */}
                {waPublicUrl && waPublicUrl !== settings.whatsappGatewayUrl && (
                  <div style={{ padding: '14px 18px', background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 18 }}>🌐</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: 12.5, color: '#15803d' }}>Public URL Detected! Copy this URL for use from any laptop:</div>
                      <code style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{waPublicUrl}</code>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const updated = { ...settings, whatsappGatewayUrl: waPublicUrl };
                        setSettings(updated);
                        settingsDB.save(updated);
                        setWaPublicUrl(null);
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                      }}
                    >
                      ✅ Use This URL
                    </button>
                  </div>
                )}

                {!waServerRunning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Offline Banner */}
                    <div style={{ padding: '20px 24px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, marginBottom: 8 }}>⚠️</div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--danger)', marginBottom: 6 }}>Gateway Offline — Not Connected</div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 auto 0', lineHeight: 1.6, maxWidth: 480 }}>
                        The WhatsApp gateway is not running at <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 4 }}>{settings.whatsappGatewayUrl?.replace('/messages/chat', '') || 'http://localhost:5000'}</code>.
                      </p>
                    </div>

                    {/* Two Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Option A - Same Machine */}
                      <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>💻 Option A — This Computer</div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>Run the gateway on this computer. Open a terminal and run:</p>
                        <div style={{ background: '#1a1a2e', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 11.5, color: '#7dd3fc', marginBottom: 12, lineHeight: 1.8 }}>
                          cd e:\Laundry\whatsapp-gateway<br/>
                          npm start
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Then refresh this page.</p>
                      </div>

                      {/* Option B - Internet via ngrok */}
                      <div style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>🌐 Option B — Any Network (Internet)</div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>Use ngrok to get a <strong>public URL</strong> that works from any laptop, anywhere:</p>
                        <div style={{ background: '#1a1a2e', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 11.5, color: '#7dd3fc', marginBottom: 12, lineHeight: 1.8 }}>
                          <span style={{ color: '#94a3b8' }}># 1. Run the gateway</span><br/>
                          npm start<br/>
                          <span style={{ color: '#94a3b8' }}># 2. In another terminal</span><br/>
                          ngrok http 5000
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Copy the <code>https://xxxx.ngrok-free.app</code> URL from ngrok, then paste it below.</p>
                      </div>
                    </div>

                    {/* URL Configurator */}
                    <div style={{ padding: '20px 24px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>🔗 Set Gateway URL</div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Paste your public ngrok URL or local IP address here to connect from any device:</p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          className="input"
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                          placeholder="https://xxxx.ngrok-free.app/messages/chat  or  http://localhost:5000/messages/chat"
                          value={settings.whatsappGatewayUrl || ''}
                          onChange={e => setSettingValue('whatsappGatewayUrl', e.target.value)}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => { const s = { ...settings }; settingsDB.save(s); setSaved(true); setTimeout(() => setSaved(false), 2000); setWaServerRunning(true); setActiveTab('whatsapp'); }} style={{ whiteSpace: 'nowrap' }}>
                          Save &amp; Retry
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                        💡 Get a <strong>free permanent URL</strong>: Sign up at <a href="https://dashboard.ngrok.com/signup" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-brand)' }}>ngrok.com</a> → Domains → claim your free static domain → run <code>ngrok http --domain=YOUR-DOMAIN.ngrok-free.app 5000</code>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {waStatus === 'Connected' ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 64, height: 64, background: 'rgba(37, 211, 102, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <Check size={32} color="#25D366" />
                        </div>
                        <div style={{ fontWeight: 850, fontSize: 16, color: 'var(--text-primary)' }}>WhatsApp is Connected!</div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, marginBottom: 24 }}>
                          Linked Account Number: <strong>+{waNumber}</strong>
                        </p>
                        
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                          <button className="btn btn-glass" onClick={handleAutoConfigure} style={{ fontSize: 12.5 }}>
                            ⚙️ Auto-Configure Portal API Setting
                          </button>
                          <button className="btn btn-danger" onClick={handleWaDisconnect} style={{ fontSize: 12.5 }}>
                            Disconnect WhatsApp Session
                          </button>
                        </div>
                      </div>
                    ) : waStatus === 'Scanning' && waQr ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center', padding: '10px 0' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ background: 'white', padding: 12, borderRadius: 12, boxShadow: 'var(--shadow-md)', display: 'inline-block', border: '1px solid var(--border-light)' }}>
                            <img src={waQr} alt="WhatsApp QR Code" style={{ width: 220, height: 220, display: 'block' }} />
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>QR code updates automatically</p>
                        </div>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>How to connect:</h4>
                          <ol style={{ paddingLeft: 18, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.5 }}>
                            <li>Open <strong>WhatsApp</strong> on your phone.</li>
                            <li>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>.</li>
                            <li>Tap on <strong>Link a Device</strong>.</li>
                            <li>Point your phone screen to the QR code on the left to scan it.</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div className="spinner-border" style={{ width: 24, height: 24, color: 'var(--primary-brand)', marginBottom: 16 }} />
                        <div style={{ fontWeight: 750, fontSize: 13.5, color: 'var(--text-primary)' }}>
                          {waStatus === 'Initializing' ? 'Launching WhatsApp Engine...' : 'Connecting to WhatsApp Client...'}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {waStatus === 'Initializing' 
                            ? 'Starting local headless browser and loading WhatsApp Web (takes 10-15 seconds)...' 
                            : 'Please wait a moment for the QR code to load.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
              <div className="card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)' }}>
                    <span style={{ fontSize: 24 }}>📧</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Email Configuration</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Connect your SMTP email account (like Gmail) to send invoices and notifications.</p>
                  </div>
                </div>

                <div className="divider" style={{ margin: '20px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>SMTP Credentials</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Email Address (e.g., yourshop@gmail.com)</label>
                        <input 
                          className="input" 
                          type="email" 
                          value={settings.smtpEmail || ''} 
                          onChange={e => setSettingValue('smtpEmail', e.target.value)} 
                          placeholder="Enter your email address"
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">App Password</label>
                        <input 
                          className="input" 
                          type="password" 
                          value={settings.smtpPassword || ''} 
                          onChange={e => setSettingValue('smtpPassword', e.target.value)} 
                          placeholder="Enter your App Password"
                        />
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                          <strong>For Gmail users:</strong> Do not use your regular password. You need to create an <strong>App Password</strong>. Go to your Google Account Settings &gt; Security &gt; 2-Step Verification &gt; App Passwords. Generate a new password and paste it here.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
              <div className="card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, background: 'rgba(239, 68, 68, 0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
                    <ShieldAlert size={24} color="var(--danger)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Security Settings</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Update passwords for the user accounts associated with this portal.</p>
                  </div>
                </div>

                <div className="divider" style={{ margin: '20px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Admin User Password */}
                  <div style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>👑 Administrator Account</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Username: <strong>Admin</strong></div>
                      </div>
                      <span className="badge badge-blue">Admin Role</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                      <div className="input-group" style={{ flex: 1, margin: 0 }}>
                        <label className="input-label">New Admin Password</label>
                        <input 
                          className="input" 
                          type="text" 
                          value={adminPassword} 
                          onChange={e => setAdminPassword(e.target.value)} 
                          placeholder="Enter new admin password"
                        />
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleUpdatePassword('1', 'admin', adminPassword)}
                        style={{ height: 38 }}
                      >
                        Update Password
                      </button>
                    </div>
                  </div>

                  {/* Cashier User Password */}
                  <div style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>💼 Cashier Desk Account</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Username: <strong>cashier</strong></div>
                      </div>
                      <span className="badge badge-purple">Cashier Role</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                      <div className="input-group" style={{ flex: 1, margin: 0 }}>
                        <label className="input-label">New Cashier Password</label>
                        <input 
                          className="input" 
                          type="text" 
                          value={cashierPassword} 
                          onChange={e => setCashierPassword(e.target.value)} 
                          placeholder="Enter new cashier password"
                        />
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleUpdatePassword('2', 'cashier', cashierPassword)}
                        style={{ height: 38 }}
                      >
                        Update Password
                      </button>
                    </div>
                  </div>

                  {/* Backup & Data Sync */}
                  <div style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 850, fontSize: 14, color: 'var(--text-primary)' }}>🔄 Sync & Backup Data</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Export all data from one environment (e.g. live site) and import it to another (e.g. local).</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button className="btn btn-glass" onClick={handleExportData} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, cursor: 'pointer', fontWeight: 600 }}>
                        <Download size={14} /> Export Backup (JSON)
                      </button>
                      <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, cursor: 'pointer', margin: 0, padding: '0 16px', borderRadius: 'var(--radius-sm)', justifyContent: 'center', fontWeight: 600 }}>
                        <Upload size={14} /> Import Backup (JSON)
                        <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
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
