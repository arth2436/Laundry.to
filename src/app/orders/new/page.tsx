'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import { servicesDB, serviceItemsDB } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Plus, Trash2, Search, Calculator, Tag, FileText, X, Check, Calendar, Settings2, Sparkles, UserPlus, Layers } from 'lucide-react';
import { LaundryItem, PaymentMethod, Service, ServiceItem } from '@/types';

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const CATEGORIES = ['MEN', 'Women', 'Kids', 'Footwear', 'Household'];

const CATEGORY_DEFS = [
  { id: 'footwear', label: 'Footwear', kind: 'category', key: 'Footwear', subs: ['Shoes', 'Socks'] },
  { id: 'wash-and-steam', label: 'WASH AND STEAM', kind: 'service', services: ['steam-iron', 'steam-ironing'], subs: ['Men', 'Women'] },
  { id: 'dry-clean', label: 'DRY CLEAN', kind: 'service', services: ['dry-clean'], subs: ['Men', 'Women'] },
  { id: 'wash-and-fold', label: 'WASH AND FOLD', kind: 'service', services: ['wash-fold', 'express-laundry', 'premium-wash'], subs: ['Men', 'Women', 'Kids'] },
  { id: 'household', label: 'Household', kind: 'category', key: 'Household', subs: ['Bedsheet', 'Towel', 'Blanket'] },
];

interface BasketItem {
  id: string;
  type: string;
  quantity: number;
  weight: number | string;
  rate: number;
  amount: number;
  unit: 'pc' | 'kg' | 'both';
  serviceLabel: string;
  note?: string;
  image?: string | null;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { customers, load: loadC, searchCustomers, addCustomer } = useCustomerStore();
  const { addOrder } = useOrderStore();

  // Services & Items loaded from DB
  const [services, setServices] = useState<Service[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  // POS Filter States
  const [selectedService, setSelectedService] = useState('wash-fold');
  const [selectedCategory, setSelectedCategory] = useState('MEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  // Customer Selector & Inputs
  const [cusQuery, setCusQuery] = useState('');
  const [selectedCus, setSelectedCus] = useState<{ id: string; name: string; mobile: string; email?: string } | null>(null);
  const [showAddCusModal, setShowAddCusModal] = useState(false);
  const [newCusName, setNewCusName] = useState('');
  const [newCusMobile, setNewCusMobile] = useState('');

  // Order Details
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [discount, setDiscount] = useState<number | ''>('');
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Unpaid');
  const [isPriority, setIsPriority] = useState(false);
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState('');
  const [saving, setSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [savedOrder, setSavedOrder] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ServiceItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalWeight, setModalWeight] = useState<any>(1);
  const [modalUnit, setModalUnit] = useState<BasketItem['unit']>('pc');
  const [modalNote, setModalNote] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [productListSelectedId, setProductListSelectedId] = useState<string | null>(null);
  const [productListQty, setProductListQty] = useState(1);
  const [productListWeight, setProductListWeight] = useState<any>(1);
  const [productListUnit, setProductListUnit] = useState<BasketItem['unit']>('pc');
  const [productListNote, setProductListNote] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRate, setCustomRate] = useState<number | ''>('');
  const [customUnit, setCustomUnit] = useState<BasketItem['unit']>('pc');
  const [customQty, setCustomQty] = useState(1);
  const [customWeight, setCustomWeight] = useState<any>(1);
  const [customNote, setCustomNote] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [showDiscountInline, setShowDiscountInline] = useState(false);
  const [showNoteInline, setShowNoteInline] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageInputValue, setImageInputValue] = useState('');
  const [showOrderNoteInline, setShowOrderNoteInline] = useState(false);
  const [orderNoteInput, setOrderNoteInput] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    if (mounted) {
      loadC();
      const allS = servicesDB.getAll();
      const allI = serviceItemsDB.getAll();
      setServices(allS);
      setServiceItems(allI);
      if (allS.length > 0) {
        setSelectedService(allS[0].id);
      }
    }
  }, [loadC, mounted]);

  // Set default expected delivery date (3 days from now)
  useEffect(() => {
    if (mounted && !delivery) {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      setDelivery(threeDaysLater.toISOString().split('T')[0]);
    }
  }, [mounted, delivery]);

  const cusResults = cusQuery.trim().length > 0 ? searchCustomers(cusQuery) : customers.slice(0, 6);

  // Add Item to basket from visual catalog grid
  const calculateAmount = (qty: number, weightVal: any, rate: number, unit: string) => {
    const w = (unit === 'kg' || unit === 'both') ? (parseFloat(weightVal.toString()) || 0) : 1;
    const q = (unit === 'pc' || unit === 'both') ? qty : 1;
    return Math.round(q * w * rate);
  };

  const handleAddToBasket = (item: ServiceItem) => {
    // open inline product detail panel to allow quantity/notes before adding
    const currentService = services.find(s => s.id === selectedService);
    const serviceLabel = currentService?.label || 'Wash & Fold';
    setActiveProduct(item);
    // initialize modal fields
    setModalQuantity(1);
    setModalWeight(1);
    setModalUnit(item.unit === 'kg' ? 'kg' : 'pc');
    setModalNote('');
    // open basket on small screens
    // setIsBasketOpen(true);
  };

  // Remove or update items from basket
  const updateBasketQty = (id: string, delta: number) => {
    setBasket(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return {
        ...item,
        quantity: newQty,
        amount: calculateAmount(newQty, item.weight, item.rate, item.unit)
      };
    }));
  };

  const setBasketUnit = (id: string, newUnit: BasketItem['unit']) => {
    setBasket(prev => prev.map(item => {
      if (item.id !== id) return item;

      const matchedService = services.find(s => s.label === item.serviceLabel);
      const matched = serviceItems.find(si => si.name.toLowerCase() === item.type.toLowerCase() && si.serviceId === matchedService?.id);
      let rate = item.rate;
      if (matched) {
        if (newUnit === matched.unit) {
          rate = matched.price;
        }
      }

      return {
        ...item,
        unit: newUnit,
        rate,
        amount: calculateAmount(item.quantity, item.weight, rate, newUnit)
      };
    }));
  };

  const removeBasketItem = (id: string) => {
    setBasket(prev => prev.filter(item => item.id !== id));
  };

  const updateBasketWeight = (id: string, weightVal: string) => {
    setBasket(prev => prev.map(item => {
      if (item.id !== id) return item;
      const parsed = parseFloat(weightVal) || 0;
      return {
        ...item,
        weight: weightVal,
        amount: calculateAmount(item.quantity, parsed, item.rate, item.unit)
      };
    }));
  };

  const updateBasketRate = (id: string, rate: number) => {
    setBasket(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newRate = Math.max(0, rate);
      return {
        ...item,
        rate: newRate,
        amount: calculateAmount(item.quantity, item.weight, newRate, item.unit)
      };
    }));
  };

  // Add a quick Custom Item
  const handleAddCustomItem = () => {
    // open inline custom item panel instead of browser prompts
    setCustomName(''); setCustomRate(''); setCustomUnit('pc'); setCustomQty(1); setCustomWeight(1); setCustomNote('');
    setShowCustomPanel(true);
  };

  const confirmAddModal = () => {
    if (!activeProduct) return;
    const currentService = services.find(s => s.id === selectedService);
    const serviceLabel = currentService?.label || 'Wash & Fold';
    const rate = activeProduct.price ?? 0;
    const unit: BasketItem['unit'] = modalUnit;

    setBasket(prev => {
      const existingIdx = prev.findIndex(b => b.type === activeProduct.name && b.serviceLabel === serviceLabel && b.unit === unit && b.note === modalNote);
      if (existingIdx >= 0) {
        return prev.map((b, idx) => {
          if (idx !== existingIdx) return b;
          const newQty = b.quantity + modalQuantity;
          return {
            ...b,
            quantity: newQty,
            weight: modalWeight,
            rate,
            note: modalNote,
            image: (activeProduct as any).image || null,
            amount: calculateAmount(newQty, modalWeight, rate, unit)
          };
        });
      } else {
        return [...prev, {
          id: uid(),
          type: activeProduct.name,
          quantity: modalQuantity,
          weight: modalWeight,
          rate,
          amount: calculateAmount(modalQuantity, modalWeight, rate, unit),
          unit,
          serviceLabel,
          note: modalNote,
          image: (activeProduct as any).image || null
        }];
      }
    });

    // close active product panel
    setActiveProduct(null);
  };

  const openEditModalForItem = (itemId: string) => {
    const found = basket.find(b => b.id === itemId);
    if (!found) return;
    // find matching service item to get price/image
    const matched = serviceItems.find(si => si.name.toLowerCase() === found.type.toLowerCase());
    setActiveProduct(matched || ({ id: 'custom', name: found.type, price: found.rate, unit: found.unit } as ServiceItem));
    setModalQuantity(found.quantity);
    setModalWeight(found.weight);
    setModalUnit(found.unit);
    setModalNote(found.note || '');
    // remove the existing item so confirmAddModal will re-add (or update)
    setBasket(prev => prev.filter(b => b.id !== itemId));
  };

  // Customer Quick Add
  const handleQuickAddCustomer = () => {
    if (!newCusName || !newCusMobile) return alert('Name and Mobile are required.');
    const newCus = addCustomer({
      name: newCusName,
      mobile: newCusMobile,
      email: `${newCusName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
    });
    setSelectedCus({
      id: newCus.id,
      name: newCus.name,
      mobile: newCus.mobile,
      email: newCus.email,
    });
    setNewCusName('');
    setNewCusMobile('');
    setShowAddCusModal(false);
  };

  const totalItemsCount = basket.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = basket.reduce((s, i) => s + ((i.unit === 'kg' || i.unit === 'both') ? (parseFloat(i.weight.toString()) || 0) : 0), 0);
  const totalAmount = basket.reduce((s, i) => s + i.amount, 0);
  const finalAmount = Math.max(0, totalAmount - Number(discount));

  const handleSave = async () => {
    if (!selectedCus) {
      setSubmissionError('Select a customer before placing the order.');
      return;
    }
    if (basket.length === 0) {
      setSubmissionError('Add at least one item to the basket before placing the order.');
      return;
    }
    setSubmissionError('');
    setSaving(true);

    const orderItems: LaundryItem[] = basket.map(item => ({
      id: item.id,
      type: `${item.type} (${item.serviceLabel}) - Charged per ${item.unit.toUpperCase()}`,
      quantity: item.quantity,
      weight: parseFloat(item.weight.toString()) || 0,
      rate: item.rate,
      amount: item.amount
    }));

    const order = addOrder({
      customerId: selectedCus.id,
      customerName: selectedCus.name,
      customerMobile: selectedCus.mobile,
      customerEmail: selectedCus.email ?? '',
      items: orderItems,
      totalWeight,
      totalAmount,
      discount: Number(discount),
      finalAmount,
      paymentStatus: payStatus,
      paymentMethod: payment,
      orderStatus: 'Pending',
      notes: notes + (isPriority ? ' [PRIORITY ORDER]' : ''),
      deliveryDate: delivery || undefined,
    });
    setSavedOrder(order.id);
    setSaving(false);
  };

  // Filter catalog items dynamically based on selectedService and category
  const filteredCatalog = serviceItems.filter(item => {
    const q = (productSearch || searchQuery).toLowerCase();
    const matchesSearch = q ? item.name.toLowerCase().includes(q) : true;
    const isEnabled = item.enabled;
    // Apply main category / service filtering if selected
    let categoryMatch = true;
    if (selectedMainCategory) {
      const def = CATEGORY_DEFS.find(d => d.id === selectedMainCategory);
      if (def) {
        if (def.kind === 'service') {
          categoryMatch = def.services.includes(item.serviceId);
        } else if (def.kind === 'category') {
          categoryMatch = item.category === def.key;
        }
      }
    }

    // Apply subcategory filter if selected (simple contains match)
    let subMatch = true;
    if (selectedSubCategory) {
      const sub = selectedSubCategory.toLowerCase();
      subMatch = item.name.toLowerCase().includes(sub) || (item.category || '').toLowerCase().includes(sub);
    }

    return matchesSearch && isEnabled && categoryMatch && subMatch;
  });

  // Deduplicated catalog (used when searching) - keep one representative per product name
  const dedupedCatalog = (() => {
    const seen = new Set<string>();
    const out: ServiceItem[] = [];
    for (const it of filteredCatalog) {
      const key = it.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(it);
      }
    }
    return out;
  })();

  if (!mounted || !isAuthenticated) return null;

  if (savedOrder) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <TopBar title="Order Created!" />
          <div className="page-body fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: 480, margin: '40px auto', padding: 40 }}>
              <div style={{ width: 72, height: 72, background: 'var(--success-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check size={32} color="var(--success)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 850, marginBottom: 8, letterSpacing: '-0.02em' }}>Order Saved Successfully</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14 }}>The order has been created and logged in the database.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => router.push(`/orders/${savedOrder}/tag`)}><Tag size={15} />Print Tag</button>
                <button className="btn btn-glass" onClick={() => router.push(`/orders/${savedOrder}/invoice`)}><FileText size={15} />View Invoice</button>
                <button className="btn btn-glass" onClick={() => { setSavedOrder(null); setSelectedCus(null); setBasket([]); }}>
                  <Plus size={15} />New Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="New Order" subtitle="Interactive POS Grid Order System" />
        
        <div className="page-body fade-in" style={{ padding: '16px 24px' }}>
          <div className="pos-layout">
            
            {/* LEFT CONTAINER: Visual Catalog Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* POS Top Bar Controls */}
              <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '18px 22px', flexWrap: 'wrap' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  {/* Categories above search */}
                  <div className="category-pills" style={{ width: '100%', justifyContent: 'center' }}>
                    {CATEGORY_DEFS.map(c => (
                      <button
                        key={c.id}
                        className={`category-pill ${selectedMainCategory === c.id ? 'active' : ''}`}
                        onClick={() => { setSelectedMainCategory(prev => prev === c.id ? null : c.id); setSelectedSubCategory(null); }}
                        style={{ textTransform: 'uppercase' }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Centered, larger search input */}
                  <div style={{ position: 'relative', width: '68%', minWidth: 360, maxWidth: 920 }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      className="search-input search-input--large"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>
                  {/* Controls row: Due Date, Note, Priority (left-aligned under search) */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', marginTop: 8, marginLeft: '16%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                      <Calendar size={16} style={{ color: 'var(--primary-brand)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Due Date</span>
                        <input 
                          type="date" 
                          value={delivery} 
                          onChange={e => setDelivery(e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', outline: 'none', padding: 0 }} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn btn-glass" style={{ gap: 8, height: 42 }} onClick={() => { setShowOrderNoteInline(s => !s); setOrderNoteInput(notes); }}>
                        <Settings2 size={16} /> Note
                      </button>
                    </div>

                    {showOrderNoteInline && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input className="input" placeholder="Order note / preferences" value={orderNoteInput} onChange={e => setOrderNoteInput(e.target.value)} style={{ minWidth: 280 }} />
                        <button className="btn btn-glass" onClick={() => { setNotes(orderNoteInput); setShowOrderNoteInline(false); }}>Save</button>
                      </div>
                    )}

                    {/* Priority Toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="checkbox" 
                          checked={isPriority} 
                          onChange={e => setIsPriority(e.target.checked)} 
                          style={{ width: 38, height: 20, appearance: 'none', background: isPriority ? 'var(--primary-brand)' : 'var(--border-light)', borderRadius: 10, transition: '0.2s', position: 'relative', cursor: 'pointer' }}
                        />
                        <div style={{ width: 14, height: 14, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: isPriority ? 21 : 3, transition: '0.2s' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isPriority ? 'var(--primary-brand)' : 'var(--text-muted)' }}>Priority</span>
                    </label>
                  </div>
                </div>

              {/* single search bar retained in the top card; duplicate removed */}

                {/* Product List selector (appears when Product List enabled) */}
                {showProductList && (
                  <div style={{ margin: '12px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label className="input-label">Product Name :</label>
                      <select className="input" value={productListSelectedId || ''} onChange={e => setProductListSelectedId(e.target.value || null)}>
                        <option value="">Select product</option>
                        {filteredCatalog.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12 }}>Quantity</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-glass" onClick={() => setProductListQty(q => Math.max(1, q - 1))}>-</button>
                        <div style={{ minWidth: 36, textAlign: 'center', fontWeight: 800 }}>{productListQty}</div>
                        <button className="btn btn-glass" onClick={() => setProductListQty(q => q + 1)}>+</button>
                      </div>
                    </div>

                    <div>
                      <button className="btn btn-primary" onClick={() => {
                        if (!productListSelectedId) return alert('Select a product first');
                        const p = serviceItems.find(si => si.id === productListSelectedId);
                        if (!p) return alert('Product not found');
                        // add to basket
                        const unit: BasketItem['unit'] = productListUnit || (p.unit === 'kg' ? 'kg' : 'pc');
                        const rate = p.price ?? 0;
                        setBasket(prev => {
                          const existingIdx = prev.findIndex(b => b.type === p.name && b.serviceLabel === (services.find(s => s.id === selectedService)?.label || '') && b.unit === unit && b.note === productListNote);
                          if (existingIdx >= 0) {
                            return prev.map((b, idx) => idx === existingIdx ? { ...b, quantity: b.quantity + productListQty, amount: calculateAmount(b.quantity + productListQty, productListWeight, b.rate, b.unit) } : b);
                          }
                          return [...prev, { id: uid(), type: p.name, quantity: productListQty, weight: productListWeight, rate, amount: calculateAmount(productListQty, productListWeight, rate, unit), unit, serviceLabel: services.find(s => s.id === selectedService)?.label || '', note: productListNote, image: (p as any).image || null }];
                        });
                      }}>Add</button>
                    </div>
                  </div>
                )}
                {/* Inline Custom Item Panel (replaces prompt flow) */}
                {showCustomPanel && (
                  <div className="card" style={{ margin: '12px 0', padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input className="input" placeholder="Item name" value={customName} onChange={e => setCustomName(e.target.value)} style={{ minWidth: 160 }} />
                      <input className="input" placeholder="Price" value={customRate} onChange={e => setCustomRate(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 100 }} />
                      <select className="input" value={customUnit} onChange={e => setCustomUnit(e.target.value as any)} style={{ width: 90 }}>
                        <option value="pc">PC</option>
                        <option value="kg">KG</option>
                        <option value="both">BOTH</option>
                      </select>
                      <input className="input" placeholder="Note (optional)" value={customNote} onChange={e => setCustomNote(e.target.value)} style={{ minWidth: 180 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-glass" onClick={() => setShowCustomPanel(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => {
                        if (!customName || customRate === '') return alert('Provide name and price');
                        const activeS = services.find(s => s.id === selectedService);
                        const serviceLabel = activeS?.label || 'Wash & Fold';
                        const unit = customUnit || (activeS?.defaultUnit || 'pc');
                        const rate = Number(customRate) || 0;
                        setBasket(prev => [...prev, {
                          id: uid(), type: customName, quantity: customQty, weight: customWeight, rate, amount: calculateAmount(customQty, customWeight, rate, unit), unit, serviceLabel, note: customNote, image: customImage || null
                        }]);
                        // reset
                        setShowCustomPanel(false);
                        setCustomName(''); setCustomRate(''); setCustomNote(''); setCustomImage(null); setCustomQty(1); setCustomWeight(1);
                      }}>Add</button>
                    </div>
                  </div>
                )}
                {activeProduct && (
                  <div className="card" style={{ margin: '12px 0', padding: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                    {activeProduct.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeProduct.image} alt={activeProduct.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{(activeProduct.icon as any) || '👕'}</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{activeProduct.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeProduct.description || ''}</div>

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="btn btn-glass" onClick={() => setModalQuantity(q => Math.max(1, q - 1))}>-</button>
                          <div style={{ minWidth: 48, textAlign: 'center', fontWeight: 800, fontSize: 18 }}>{modalQuantity}</div>
                          <button className="btn btn-glass" onClick={() => setModalQuantity(q => q + 1)}>+</button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="number" step="0.05" min="0" value={modalWeight} onChange={e => setModalWeight(e.target.value)} style={{ width: 80, padding: '8px 10px' }} />
                          <select value={modalUnit} onChange={e => setModalUnit(e.target.value as any)} style={{ padding: '8px 10px' }}>
                            <option value="pc">PC</option>
                            <option value="kg">KG</option>
                            <option value="both">BOTH</option>
                          </select>
                        </div>

                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Price</div>
                          <div style={{ fontWeight: 900, color: 'var(--primary-brand)', fontSize: 18 }}>₹{(activeProduct.price ?? 0).toFixed(0)}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <input className="input" placeholder="Item note (optional)" value={modalNote} onChange={e => setModalNote(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button className="btn btn-primary" onClick={confirmAddModal}>Add to Order</button>
                      <button className="btn btn-glass" onClick={() => setActiveProduct(null)}>Close</button>
                    </div>
                  </div>
                )}

              {/* Interactive Items Grid */}
              {(productSearch.trim() || selectedMainCategory) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: '6px 0 8px' }}>{productSearch.trim() || (CATEGORY_DEFS.find(d => d.id === selectedMainCategory)?.label || '')}</h3>
                    {selectedMainCategory && (
                      <div style={{ background: 'rgba(18,115,255,0.08)', border: '1px solid rgba(18,115,255,0.12)', color: 'var(--primary-brand)', padding: '8px 12px', borderRadius: 10, fontWeight: 800, fontSize: 13 }}>
                        {CATEGORY_DEFS.find(d => d.id === selectedMainCategory)?.label} ({filteredCatalog.length} clothes approx)
                      </div>
                    )}
                  </div>

                  {/* Subcategory chips */}
                  {selectedMainCategory && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {(() => {
                        const def = CATEGORY_DEFS.find(d => d.id === selectedMainCategory);
                        if (!def) return null;
                        return [
                          <button key="mixed" className={'btn btn-primary'} style={{ padding: '6px 8px', fontSize: 12 }}>Mixed any ({filteredCatalog.length} clothes approx)</button>,
                          ...def.subs.map(s => (
                            <button key={s} className={selectedSubCategory === s ? 'btn btn-primary' : 'btn btn-glass'} style={{ padding: '6px 8px', fontSize: 12 }} onClick={() => setSelectedSubCategory(prev => prev === s ? null : s)}>{s}</button>
                          ))
                        ];
                      })()}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
                    {/* Custom Item card first */}
                    <div
                      onClick={handleAddCustomItem}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px dashed var(--border-light)',
                        borderRadius: 12,
                        padding: '14px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#f3f6ff,#eef7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>+</div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Custom Item</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>₹0.00</span>
                    </div>
                    {dedupedCatalog.map(item => {
                      const currentService = services.find(s => s.id === selectedService);
                      const unit = item.unit || 'pc';
                      const rate = item.price ?? 0;

                      // Check if in basket
                      const inBasket = basket.find(b => b.type === item.name && b.serviceLabel === currentService?.label && b.unit === unit);
                      const isHovered = hoveredCard === item.name;
                      
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleAddToBasket(item)}
                          onMouseEnter={() => setHoveredCard(item.name)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            background: 'var(--bg-primary)',
                            border: inBasket ? '2px solid var(--primary-brand)' : '1px solid var(--border-light)',
                            borderRadius: 12,
                            padding: '14px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: inBasket ? '0 4px 12px rgba(0, 102, 204, 0.1)' : 'var(--shadow-sm)'
                          }}
                          className="catalog-item-card"
                        >
                          {inBasket && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBasketItem(inBasket.id);
                              }}
                              title="Remove from basket"
                              style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: isHovered ? 'var(--danger)' : 'var(--primary-brand)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isHovered ? 8 : 10,
                                fontWeight: 800,
                                border: '2px solid #ffffff',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                                zIndex: 10,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isHovered ? '✕' : inBasket.quantity}
                            </button>
                          )}
                          
                          {/* Product Image / Icon */}
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                          ) : (
                            <span style={{ fontSize: 26, marginBottom: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}>{item.icon || '👕'}</span>
                          )}
                          
                          {/* Name */}
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                            {item.name}
                          </span>
                          
                          {/* Price & Unit */}
                          <span style={{ fontSize: 11, fontWeight: 750, color: 'var(--primary-brand)' }}>
                            ₹{rate.toFixed(0)} <span style={{ fontSize: 9.5, opacity: 0.7, fontWeight: 550 }}>/{unit}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* RIGHT SIDEBAR: Basket & Summary Details */}
            <div className={`pos-basket-container ${isBasketOpen ? 'open' : ''}`}>
              <div className="mobile-basket-header">
                <h3 style={{ fontSize: 16, fontWeight: 850, margin: 0 }}>Order Basket</h3>
                <button className="btn btn-glass btn-sm" onClick={() => setIsBasketOpen(false)}>Close</button>
              </div>
              
              {/* CUSTOMER SEARCH & SELECTOR */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <label className="input-label" style={{ margin: 0 }}>Select Customer</label>
                  <button 
                    className="btn btn-glass btn-sm" 
                    style={{ fontSize: 11, padding: '4px 10px', height: 26, gap: 4 }}
                    onClick={() => setShowAddCusModal(true)}
                  >
                    <UserPlus size={12} /> Quick Add
                  </button>
                </div>
                
                {selectedCus ? (
                  <div style={{ background: 'var(--primary-brand-light)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(0, 102, 204, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{selectedCus.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{selectedCus.mobile}</div>
                    </div>
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                      onClick={() => setSelectedCus(null)}
                      title="Clear customer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 34, fontSize: 12.5 }}
                      placeholder="Type name or mobile..."
                      value={cusQuery}
                      onChange={e => setCusQuery(e.target.value)}
                    />
                    
                    {cusQuery.trim().length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 8, marginTop: 4, boxShadow: 'var(--shadow-lg)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                        {cusResults.length === 0 ? (
                          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                            No customer found
                          </div>
                        ) : (
                          cusResults.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                               setSelectedCus({ id: c.id, name: c.name, mobile: c.mobile, email: c.email });
                               setCusQuery('');
                               setSubmissionError('');
                              }}
                              style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}
                              className="btn-hover-glow"
                            >
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.mobile}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* POS BASKET LIST */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} style={{ color: 'var(--primary-brand)' }} />
                    <span style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text-primary)' }}>Selected Items ({totalItemsCount})</span>
                  </div>
                  {basket.length > 0 && (
                    <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={() => setBasket([])}>
                      Clear All
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                  {basket.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🧺</div>
                      Basket is empty. Select items from the catalog.
                    </div>
                  ) : (
                    basket.map(item => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--text-primary)' }}>{item.type}</span>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.serviceLabel}</div>
                          </div>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }} onClick={() => removeBasketItem(item.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 }}>
                          {/* Qty Counter */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                            <button style={{ border: 'none', background: 'none', width: 14, height: 18, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => updateBasketQty(item.id, -1)}>-</button>
                            <span style={{ fontSize: 11.5, fontWeight: 800, minWidth: 14, textAlign: 'center', color: 'var(--text-primary)' }}>{item.quantity}</span>
                            <button style={{ border: 'none', background: 'none', width: 14, height: 18, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => updateBasketQty(item.id, 1)}>+</button>
                            <span style={{ fontSize: 9.5, color: 'var(--text-muted)', marginLeft: 2 }}>{item.unit === 'pc' ? 'pc' : 'kg'}</span>
                            <button style={{ border: 'none', background: 'none', marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openEditModalForItem(item.id)}>Edit</button>
                          </div>

                          {/* Weight input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                            <input 
                              type="number" 
                              step="0.05"
                              min="0.1"
                              style={{ width: 42, height: 18, fontSize: 11, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--text-primary)', padding: 0 }}
                              value={item.weight} 
                              onChange={e => updateBasketWeight(item.id, e.target.value)} 
                            />
                            <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>kg</span>
                          </div>

                          {/* Billing Unit Segmented Selector */}
                          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-light)', background: 'var(--bg-primary)', height: 24 }}>
                            <button
                              onClick={() => { if (item.unit !== 'pc') setBasketUnit(item.id, 'pc'); }}
                              style={{
                                border: 'none',
                                padding: '0 4px',
                                fontSize: 8.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: item.unit === 'pc' ? 'var(--primary-brand)' : 'transparent',
                                color: item.unit === 'pc' ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.1s'
                              }}
                            >
                              PC
                            </button>
                            <button
                              onClick={() => { if (item.unit !== 'kg') setBasketUnit(item.id, 'kg'); }}
                              style={{
                                border: 'none',
                                padding: '0 4px',
                                fontSize: 8.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: item.unit === 'kg' ? 'var(--primary-brand)' : 'transparent',
                                color: item.unit === 'kg' ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.1s'
                              }}
                            >
                              KG
                            </button>
                            <button
                              onClick={() => { if (item.unit !== 'both') setBasketUnit(item.id, 'both'); }}
                              style={{
                                border: 'none',
                                padding: '0 4px',
                                fontSize: 8.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: item.unit === 'both' ? 'var(--primary-brand)' : 'transparent',
                                color: item.unit === 'both' ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.1s'
                              }}
                            >
                              BOTH
                            </button>
                          </div>

                          {/* Rate & Total amount */}
                          <div style={{ textAlign: 'right', minWidth: 60 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>₹</span>
                              <input
                                type="number"
                                style={{ width: 34, height: 18, fontSize: 10.5, textAlign: 'right', border: 'none', borderBottom: '1px dashed var(--border-light)', background: 'transparent', padding: 0, fontWeight: 700, color: 'var(--text-primary)' }}
                                value={item.rate}
                                onChange={e => updateBasketRate(item.id, parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 850, color: 'var(--text-primary)', marginTop: 2 }}>₹{item.amount.toFixed(0)}</div>
                          </div>
                        </div>

                        {/* optional note */}
                        {item.note && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>{item.note}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* BILLING SUMMARY CARD */}
              <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Weight Total</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{totalWeight.toFixed(2)} kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{totalAmount.toFixed(0)}</span>
                  </div>
                  
                  {/* Discount Field */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Discount (₹)</span>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="input" 
                      style={{ width: 80, height: 28, fontSize: 12, textAlign: 'right', padding: '2px 8px' }}
                      value={discount}
                      onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Total Payable</span>
                  <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--primary-brand)' }}>₹{finalAmount.toFixed(0)}</span>
                </div>

                {/* Payment Status & Type Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: 11, marginBottom: 6 }}>Payment Method</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['Cash', 'UPI', 'Card'] as PaymentMethod[]).map(m => (
                        <button
                          key={m}
                          type="button"
                          className={`btn ${payment === m ? 'btn-primary' : 'btn-glass'}`}
                          style={{ flex: 1, padding: '6px 0', fontSize: 11.5, height: 32, justifyContent: 'center' }}
                          onClick={() => setPayment(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: 11, marginBottom: 6 }}>Payment Status</label>
                    <select 
                      className="input" 
                      style={{ height: 34, padding: '4px 10px', fontSize: 12 }} 
                      value={payStatus} 
                      onChange={e => setPayStatus(e.target.value as any)}
                    >
                      <option value="Unpaid">❌ Unpaid</option>
                      <option value="Partial">⚠️ Partial Payment</option>
                      <option value="Paid">✅ Paid</option>
                    </select>
                  </div>
                </div>

                {notes && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, wordBreak: 'break-word' }}>
                    <strong>Note:</strong> {notes}
                  </div>
                )}

                {submissionError && (
                  <p role="alert" style={{ margin: '0 0 10px', color: 'var(--danger)', fontSize: 12, fontWeight: 650 }}>
                    {submissionError}
                  </p>
                )}
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 13.5, fontWeight: 700 }} 
                  onClick={handleSave} 
                  disabled={saving}
                >
                  {saving ? 'Creating Order...' : '✓ Place Order'}
                </button>
              </div>
            </div>

          </div>

          {/* Mobile Sheet Overlay for Basket */}
          <div className={`mobile-sheet-overlay ${isBasketOpen ? 'open' : ''}`} onClick={() => setIsBasketOpen(false)} style={{ zIndex: 1001 }} />

          {/* Floating Mobile Checkout Bar */}
          {basket.length > 0 && (
            <div className="mobile-checkout-bar" onClick={() => setIsBasketOpen(true)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🧺</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#ffffff' }}>{totalItemsCount} Items</div>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>Total: ₹{finalAmount.toFixed(0)}</div>
                </div>
              </div>
              <button className="mobile-checkout-btn" onClick={(e) => { e.stopPropagation(); setIsBasketOpen(true); }}>
                View Basket & Pay ➔
              </button>
            </div>
          )}

        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCusModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 380, padding: 24, boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Quick Add Customer</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddCusModal(false)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div className="input-group">
                <label className="input-label">Customer Name</label>
                <input className="input" placeholder="e.g. Darpit Shah" value={newCusName} onChange={e => setNewCusName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Mobile Number</label>
                <input className="input" placeholder="e.g. 9876543210" value={newCusMobile} onChange={e => setNewCusMobile(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-glass" onClick={() => setShowAddCusModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleQuickAddCustomer} disabled={!newCusName || !newCusMobile}>Add & Select</button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM ADD / EDIT MODAL */}
  

    </div>
  );
}
