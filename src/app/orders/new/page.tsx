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
            categoryMatch = Array.isArray(def.services) && def.services.includes(item.serviceId);
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

  // temporary simplified render to isolate syntax issues
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="New Order (dev)" />
        <div className="page-body">
          <div className="card">New Order page (temp simplified)</div>
        </div>
      </div>
    </div>
  );
}
