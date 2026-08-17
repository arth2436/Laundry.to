"use client";

import React, { useState } from 'react';
import styles from './new-order.module.css';
import { ShoppingBag, Shirt, Search, Calendar, ChevronDown, ChevronUp, ToggleLeft, Activity, Layers, Minus, Plus, Upload, Camera, Image as ImageIcon, Trash2, Ban, X, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import { Customer } from '@/types';
import { useEffect } from 'react';

export default function NewOrderPage() {
  const router = useRouter();
  const { customers, load, searchCustomers, addCustomer } = useCustomerStore();
  const { addOrder } = useOrderStore();
  const [orderStep, setOrderStep] = useState<'search' | 'create'>('search');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', mobile: '', email: '' });
  const [addErr, setAddErr] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    load();
  }, [load]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.mobile) { setAddErr('Name and mobile are required.'); return; }
    if (!/^\d{10}$/.test(addForm.mobile)) { setAddErr('Mobile must be 10 digits.'); return; }
    const newC = addCustomer(addForm);
    setAddForm({ name: '', mobile: '', email: '' });
    setAddErr('');
    setShowAddCustomer(false);
    setSelectedCustomerForOrder(newC);
  };
  
  const displayedCustomers = customerSearchQuery ? searchCustomers(customerSearchQuery) : customers;

  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string; price: number; quantity: number; type: string; subType: string; imageText?: string; isShirtBan?: boolean; minPrice?: number; isCustom?: boolean } | null>(null);
  const [isDiscountExpanded, setIsDiscountExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('Discount');
  const [activeCategory, setActiveCategory] = useState('WASH AND FOLD');
  const [activeSubCategory, setActiveSubCategory] = useState('Mixed any (5 clothes approx)');
  const [itemNoteText, setItemNoteText] = useState('');
  const [productsList, setProductsList] = useState<{ id: number; name: string; quantity: number; search: string; showSuggestions: boolean }[]>([]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    if (category === 'FOOTWEAR') {
      setActiveSubCategory('Footware');
    } else {
      setActiveSubCategory('Mixed any (5 clothes approx)');
    }
  };

  const AVAILABLE_PRODUCTS = [
    "Bedsheet", "Blanket", "Blazer", "Boots", "Carpet", "Comforter", "Curtains", 
    "Designer Suit", "Gown", "Heels", "Jeans", "Kurta", "Kurti", "Leather Jacket", 
    "Leather Shoes", "Lehenga", "Pillow Cover", "Premium Jacket", "Sandals", 
    "Saree", "School Uniform", "Sherwani", "Shirt", "Silk Dress", "Silk Saree", 
    "Sneakers", "Sofa Cover", "Sports Shoes", "Suit", "T-Shirt", "Towel", 
    "Trouser", "Wedding Dress"
  ];

  const handleAddProduct = () => {
    setProductsList([...productsList, { id: Date.now(), name: '', quantity: 1, search: '', showSuggestions: false }]);
  };

  const handleUpdateProductSearch = (id: number, text: string) => {
    setProductsList(prev => prev.map(p => p.id === id ? { ...p, search: text, showSuggestions: true } : p));
  };

  const handleSelectProduct = (id: number, name: string) => {
    setProductsList(prev => prev.map(p => p.id === id ? { ...p, name, search: name, showSuggestions: false } : p));
  };

  const handleUpdateProductQty = (id: number, delta: number) => {
    const newList = productsList.map(p => p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p);
    setProductsList(newList);
    if (selectedItem?.isCustom) {
      const hasAnyPrice = newList.some(p => (p as any).price);
      if (hasAnyPrice) {
        const total = newList.reduce((acc, curr) => acc + (parseFloat((curr as any).price || '0') * curr.quantity), 0);
        setSelectedItem({...selectedItem, price: total});
      }
    }
  };

  const handleRemoveProduct = (id: number) => {
    const newList = productsList.filter(p => p.id !== id);
    setProductsList(newList);
    if (selectedItem?.isCustom) {
      const hasAnyPrice = newList.some(p => (p as any).price);
      if (hasAnyPrice) {
        const total = newList.reduce((acc, curr) => acc + (parseFloat((curr as any).price || '0') * curr.quantity), 0);
        setSelectedItem({...selectedItem, price: total});
      }
    }
  };

  const handleWashFoldClick = () => {
    setSelectedItem({
      id: 1,
      name: "WASH AND FOLD",
      price: 80,
      quantity: 1,
      type: "WASH AND FOLD (5 CLOTHES APPROX)",
      subType: "WASH AND FOLD (5 clothes approx)/Mixed any (5 clothes",
      imageText: "WASH\n&\nFOLD"
    });
  };

  const handleWashSteamClick = () => {
    setSelectedItem({
      id: 2,
      name: "WASH AND STEAM IRON",
      price: 110,
      quantity: 1,
      type: "WASH AND STEAM (5 CLOTHES APPROX)",
      subType: "Wash and Steam (5 clothes approx)/Mixed any (5 clothes",
      imageText: "WASH\n&\nSTEAM"
    });
  };

  const handleAllCategoriesClick = () => {
    setSelectedItem({
      id: 3,
      name: "ALL CATEGORIES",
      price: 110,
      quantity: 1,
      type: "WASH AND STEAM (5 CLOTHES APPROX)",
      subType: "Wash and Steam (5 clothes approx)/WASH & IRONING/All",
      isShirtBan: true,
      minPrice: 110.0
    });
  };

  const handleCustomItemClick = (category: string) => {
    setSelectedItem({
      id: Date.now(),
      name: "Custom Item",
      price: 0,
      quantity: 1,
      type: category,
      subType: "Custom Item",
      isCustom: true
    });
    setActiveTab('Price');
  };

  const handleFootwareClick = (name: string, price: number) => {
    setSelectedItem({
      id: Date.now(),
      name: name.toUpperCase(),
      price: price,
      quantity: 1,
      type: "FOOTWARE",
      subType: `Footware/Footware/${name}`,
      imageText: name.split(' ').map(w => w[0]).join('')
    });
    setActiveTab('Discount');
  };

  let calcAmt = 0;
  if (selectedItem && !selectedItem.isCustom) {
     calcAmt += selectedItem.price * selectedItem.quantity;
  }
  calcAmt += productsList.reduce((acc, curr) => acc + (parseFloat((curr as any).price || '0') * curr.quantity), 0);
  
  const amountDue = calcAmt.toFixed(2);

  const handleConfirmOrder = () => {
    const orderItems = [];
    if (selectedItem && !selectedItem.isCustom) {
        orderItems.push({
            id: Date.now().toString(),
            type: selectedItem.subType || selectedItem.name || 'Custom',
            quantity: selectedItem.quantity,
            weight: 1, // default
            rate: selectedItem.price,
            amount: selectedItem.price * selectedItem.quantity
        });
    }
    
    productsList.forEach(p => {
        if ((p as any).price && parseFloat((p as any).price) > 0) {
            const productName = p.name || p.search || 'Item';
            const categoryPrefix = selectedItem && selectedItem.type ? `${selectedItem.type} - ` : '';
            orderItems.push({
                id: p.id.toString(),
                type: `${categoryPrefix}${productName}`,
                quantity: p.quantity,
                weight: 1,
                rate: parseFloat((p as any).price),
                amount: parseFloat((p as any).price) * p.quantity
            });
        }
    });

    const finalAmt = orderItems.reduce((acc, item) => acc + item.amount, 0);
    if (finalAmt <= 0 && orderItems.length === 0) {
        alert("Please add at least one item with a valid price.");
        return;
    }

    const customerId = selectedCustomerForOrder?.id || 'walk-in';
    const customerName = selectedCustomerForOrder?.name || 'Walk-in';
    const customerMobile = selectedCustomerForOrder?.mobile || 'N/A';
    const customerEmail = selectedCustomerForOrder?.email || '';

    addOrder({
      customerId,
      customerName,
      customerMobile,
      customerEmail,
      items: orderItems,
      totalWeight: orderItems.length, // Placeholder
      totalAmount: finalAmt,
      discount: 0,
      finalAmount: finalAmt,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      orderStatus: 'Pending',
      notes: itemNoteText || ''
    });
    
    router.push('/orders');
  };

  if (!mounted) return null;

  if (orderStep === 'search') {
    if (!customerSearchQuery && !selectedCustomerForOrder) {
      return (
        <div className={styles.wizardContainer}>
          <div className={styles.initialSearchScreen}>
            <div className={styles.initialSearchTitle}>Search Customer for <span>New Order</span></div>
            <div className={styles.bigSearchInputWrapper}>
              <input 
                type="text" 
                className={styles.bigSearchInput} 
                placeholder="Search Customers by Name, Phone" 
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                autoFocus
              />
              {customerSearchQuery && (
                <div className={styles.bigSearchClear} onClick={() => setCustomerSearchQuery('')}><X size={20} /></div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.wizardContainer}>
        <div className={styles.splitScreen}>
          {/* Left Sidebar */}
          <div className={styles.splitLeft}>
            <div className={styles.leftTopBar}>
               <Search size={16} color="#9ca3af" style={{position: 'absolute', marginLeft: 12}} />
               <input 
                 type="text" 
                 className={styles.leftSearchInput} 
                 placeholder="Search" 
                 value={customerSearchQuery}
                 onChange={e => setCustomerSearchQuery(e.target.value)}
                 style={{paddingLeft: 36}}
                 autoFocus
               />
               {customerSearchQuery && (
                 <X size={16} color="#9ca3af" style={{position: 'absolute', right: 24, cursor: 'pointer'}} onClick={() => setCustomerSearchQuery('')} />
               )}
            </div>
            
            <div className={styles.customerListArea}>
              {displayedCustomers.length === 0 ? (
                <div style={{color: '#9ca3af', textAlign: 'center', marginTop: 24, fontSize: 14}}>No customers found.</div>
              ) : (
                displayedCustomers.map(c => (
                  <div 
                    key={c.id} 
                    className={`${styles.customerListItem} ${selectedCustomerForOrder?.id === c.id ? styles.customerListItemActive : ''}`}
                    onClick={() => setSelectedCustomerForOrder(c)}
                  >
                     <div className={styles.cliHeader}>
                        <div className={styles.cliAvatar}>{c.name.charAt(0).toUpperCase()}</div>
                        <div>
                           <div className={styles.cliName}>{c.name}</div>
                           <div className={styles.cliSub}>{c.mobile}</div>
                        </div>
                     </div>
                  </div>
                ))
              )}
            </div>
            
            <div className={styles.addCustomerPanel}>
               <button className={styles.btnAddCustomer} onClick={() => setShowAddCustomer(true)}>
                  <UserPlus size={18} /> Add Customer
               </button>
            </div>
          </div>
          
          {/* Right Panel */}
          <div className={styles.splitRight}>
             {selectedCustomerForOrder ? (
               <>
                 <div className={styles.infoPanel}>
                    <div className={styles.infoTitle}>
                       Customer Info
                       <button className={styles.btnViewInfo}>View Info</button>
                    </div>
                    
                    <div className={styles.infoGrid}>
                       <div>
                         <div className={styles.infoLabel}>Name:</div>
                         <div className={styles.infoValue}>{selectedCustomerForOrder.name}</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Email:</div>
                         <div className={styles.infoValue}>{selectedCustomerForOrder.email || '-'}</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Customer Type:</div>
                         <div className={styles.infoValue}>RETAIL</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Total Revenue:</div>
                         <div className={styles.infoValueBlue}>₹ 0.00</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Phone No.:</div>
                         <div className={styles.infoValue}>+91 {selectedCustomerForOrder.mobile}</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Date of Joining:</div>
                         <div className={styles.infoValue}>{new Date(selectedCustomerForOrder.createdAt).toLocaleDateString('en-GB')}</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Specific Preference:</div>
                         <div className={styles.infoValue}>-</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Total Due Amount:</div>
                         <div className={styles.infoValueBlue}>₹ 0</div>
                       </div>
                       <div>
                         <div className={styles.infoLabel}>Address:</div>
                         <div className={styles.infoValue}>-</div>
                       </div>
                    </div>
                    
                    <div className={styles.subsSection}>
                       <div className={styles.subsHeader}>
                          <div className={styles.subsTitle}>Subscriptions</div>
                          <button className={styles.btnAssignSub}>Assign Subscription</button>
                       </div>
                       <div className={styles.noSubText}>No subscription assigned</div>
                    </div>
                 </div>
                 
                 <div className={styles.bottomActionRow}>
                    <button className={styles.btnCancel} style={{borderRadius: 20}} onClick={() => { setCustomerSearchQuery(''); setSelectedCustomerForOrder(null); }}>Cancel</button>
                    <button className={styles.btnCont} onClick={() => setOrderStep('create')}>Continue</button>
                 </div>
               </>
             ) : (
               <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 16}}>
                  Select a customer to view details
               </div>
             )}
          </div>
        </div>

        {/* Quick Add Modal */}
        {showAddCustomer && (
          <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{background: 'white', borderRadius: 8, width: 400, padding: 24, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
                <h2 style={{margin: 0, fontSize: 18}}>Add Customer</h2>
                <button onClick={() => setShowAddCustomer(false)} style={{background: 'transparent', border: 'none', cursor: 'pointer'}}><X size={20}/></button>
              </div>
              <form onSubmit={handleQuickAdd} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 13, fontWeight: 500}}>Full Name *</label>
                  <input style={{padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6}} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 13, fontWeight: 500}}>Mobile Number *</label>
                  <input style={{padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6}} value={addForm.mobile} onChange={e => setAddForm(f => ({ ...f, mobile: e.target.value }))} maxLength={10} required />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 13, fontWeight: 500}}>Email (optional)</label>
                  <input type="email" style={{padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6}} value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                {addErr && <p style={{color: '#ef4444', fontSize: 13, margin: 0}}>{addErr}</p>}
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8}}>
                  <button type="button" onClick={() => setShowAddCustomer(false)} style={{padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer'}}>Cancel</button>
                  <button type="submit" style={{padding: '8px 16px', background: '#00b4d8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600}}>Add Customer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        {/* Left Sidebar */}
        <div className={styles.leftSidebar}>
          <div className={styles.customerBox}>
            <div className={styles.customerName}>{selectedCustomerForOrder?.name || 'Walk-in'}</div>
            <div className={styles.customerPhone}>{selectedCustomerForOrder?.mobile || ''}</div>
          </div>
          
          <div className={styles.orderHeader}>
            <h2>Create New Order</h2>
            <button className={styles.btnHold}>Hold</button>
          </div>
          
          <button className={styles.btnSubscription}>Add Subscription</button>
          
          <div className={styles.orderSummaryText}>Order Summary</div>
          <div className={styles.summaryIcons}>
             <div className={styles.summaryIconBox}>
                <ShoppingBag size={18} /> <span>{selectedItem ? 1 : 0}</span>
             </div>
             <div className={styles.summaryIconBox}>
                <Activity size={18} /> <span>0</span>
             </div>
             <div className={styles.summaryIconBox}>
                <Shirt size={18} /> <span>{selectedItem ? (productsList.length > 0 ? productsList.reduce((acc, curr) => acc + curr.quantity, 0) * selectedItem.quantity : selectedItem.quantity) : 0}</span> 
             </div>
             <div className={styles.summaryIconBox}>
                <Layers size={18} /> <span>0</span>
             </div>
          </div>

          {selectedItem && (
             <>
               <div style={{fontSize: 13, color: '#111827', marginTop: 24, textTransform: 'uppercase'}}>{selectedItem.type}</div>
               <div className={styles.cartItem} style={{marginTop: 12}}>
                  <div className={styles.cartItemLeft}>
                     <div className={styles.cartItemIcon}>
                        {selectedItem.isShirtBan ? (
                           <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', border: '1px solid #111827'}}>
                              <Shirt size={14} color="#111827" strokeWidth={1} />
                              <Ban size={18} color="#111827" strokeWidth={1.5} style={{position: 'absolute'}} />
                           </div>
                        ) : (
                           <div style={{fontSize: 7, color: '#00b4d8', textAlign: 'center', lineHeight: 1.1, padding: 2, whiteSpace: 'pre-line'}}>{selectedItem.imageText}</div>
                        )}
                     </div>
                     <div className={styles.cartItemInfo}>
                        <div className={styles.cartItemName}>{selectedItem.name}</div>
                        <div className={styles.cartItemCalc}>{selectedItem.quantity.toFixed(1)} x ₹ {selectedItem.price.toFixed(1)}</div>
                     </div>
                  </div>
                  <div className={styles.cartItemTotal}>₹ {(selectedItem.quantity * selectedItem.price).toFixed(2)}</div>
               </div>
             </>
          )}
          
          <div className={styles.discountCard} style={{ marginTop: selectedItem ? 24 : 16 }}>
            <div className={styles.discountHeader} style={{ borderBottom: isDiscountExpanded ? '1px solid #e5e7eb' : 'none' }}>
               <span className={styles.linkText} onClick={() => setIsDiscountExpanded(!isDiscountExpanded)} style={{cursor: 'pointer'}}>Discount / Promo / Charge</span>
               <button className={styles.chevronBtn} onClick={() => setIsDiscountExpanded(!isDiscountExpanded)}>
                  {isDiscountExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
               </button>
            </div>
            {isDiscountExpanded && (
               <div className={styles.totals}>
                  <div className={styles.totalRow}>
                     <span>Sub-total:</span>
                     <span className={styles.priceBlue}>₹ {amountDue}</span>
                  </div>
                  <div className={styles.totalRow}>
                     <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                       Round Off <input type="checkbox" checked readOnly style={{accentColor: '#d1d5db', width: 16, height: 16}} />
                     </span>
                     <span className={styles.totalRow} style={{fontWeight: 600, color: '#111827'}}>₹ 0.0</span>
                  </div>
               </div>
            )}
          </div>
        </div>
        
        {/* Right Area */}
        <div className={styles.rightArea}>
           <div className={styles.topBar}>
              <div className={styles.searchBox}><Search size={20} /></div>
              <div className={styles.datePicker}>
                 <div className={styles.dateLabel}>Due Date</div>
                 <div className={styles.dateValue}>Thu 20/Aug 11:30 AM to 01:30 PM <Calendar size={18}/></div>
              </div>
              <button className={styles.btnPrefs}>Preferences & Add Note</button>
              <div className={styles.priorityToggle}>
                 <ToggleLeft size={36} color="#d1d5db" strokeWidth={1.5} />
                 <span style={{marginTop: -4}}>Priority Order</span>
              </div>
           </div>
           
           {!selectedItem ? (
             <>
               <div className={styles.categories}>
                  <button className={`${styles.catBtn} ${activeCategory === 'WASH AND FOLD' ? styles.catActive : styles.catInactive}`} onClick={() => handleCategoryChange('WASH AND FOLD')}>WASH AND FOLD (5<br/>clothes approx)</button>
                  <button className={`${styles.catBtn} ${activeCategory === 'WASH AND STEAM' ? styles.catActive : styles.catInactive}`} onClick={() => handleCategoryChange('WASH AND STEAM')}>Wash and Steam (5<br/>clothes approx)</button>
                  <button className={`${styles.catBtn} ${activeCategory === 'DRY CLEAN' ? styles.catActive : styles.catInactive}`} onClick={() => handleCategoryChange('DRY CLEAN')}>DRY CLEAN</button>
                  <button className={`${styles.catBtn} ${activeCategory === 'FOOTWEAR' ? styles.catActive : styles.catInactive}`} onClick={() => handleCategoryChange('FOOTWEAR')}>Footware</button>
                  <button className={`${styles.catBtn} ${activeCategory === 'STEAM IRON' ? styles.catActive : styles.catInactive}`} onClick={() => handleCategoryChange('STEAM IRON')}>STEAM IRON</button>
               </div>
               
               <div className={styles.subCategories}>
                  {activeCategory !== 'FOOTWEAR' && (
                    <button className={`${styles.subCatBtn} ${activeSubCategory === 'Mixed any (5 clothes approx)' ? styles.catActive : styles.catInactive}`} onClick={() => setActiveSubCategory('Mixed any (5 clothes approx)')}>Mixed any (5 clothes approx)</button>
                  )}
                  {activeCategory === 'WASH AND STEAM' && (
                    <button className={`${styles.subCatBtn} ${activeSubCategory === 'WASH & IRONING' ? styles.catActive : styles.catInactive}`} style={{marginLeft: 12}} onClick={() => setActiveSubCategory('WASH & IRONING')}>WASH & IRONING</button>
                  )}
                  {activeCategory === 'FOOTWEAR' && (
                    <button className={`${styles.subCatBtn} ${activeSubCategory === 'Footware' ? styles.catActive : styles.catInactive}`} onClick={() => setActiveSubCategory('Footware')}>Footware</button>
                  )}
               </div>
               
               <div className={styles.itemsGrid}>
                  {activeCategory === 'WASH AND FOLD' && (
                     <>
                        <div className={styles.itemCard} onClick={handleWashFoldClick} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName}>Wash And Fold</div>
                              <div className={styles.itemPrice}>₹ 80.00</div>
                           </div>
                           <div style={{ width: 40, height: 56, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, textAlign: 'center', color: '#9ca3af', borderRadius: 4 }}>IMG</div>
                        </div>
                        <div className={styles.itemCard} onClick={() => handleCustomItemClick('WASH AND FOLD')} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName}>Custom Item</div>
                              <div className={styles.itemPrice}>₹ 0.00</div>
                           </div>
                        </div>
                     </>
                  )}
                  {activeCategory === 'DRY CLEAN' && (
                     <>
                        <div className={styles.itemCard} onClick={() => handleCustomItemClick('DRY CLEAN')} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName}>Custom Item</div>
                              <div className={styles.itemPrice}>₹ 0.00</div>
                           </div>
                        </div>
                     </>
                  )}
                  {activeCategory === 'WASH AND STEAM' && activeSubCategory === 'Mixed any (5 clothes approx)' && (
                     <>
                        <div className={styles.itemCard} onClick={handleWashSteamClick} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName}>Wash and Steam Iron</div>
                              <div className={styles.itemPrice}>₹ 110.00</div>
                           </div>
                           <div style={{ width: 40, height: 56, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, textAlign: 'center', color: '#9ca3af', borderRadius: 4 }}>IMG</div>
                        </div>
                        <div className={styles.itemCard} onClick={() => handleCustomItemClick('WASH AND STEAM')} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName}>Custom Item</div>
                              <div className={styles.itemPrice}>₹ 0.00</div>
                           </div>
                        </div>
                     </>
                  )}
                  {activeCategory === 'WASH AND STEAM' && activeSubCategory === 'WASH & IRONING' && (
                     <>
                        <div className={styles.itemCard} onClick={handleAllCategoriesClick} style={{cursor: 'pointer', position: 'relative'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName} style={{color: '#00b4d8'}}>All categories</div>
                              <div className={styles.itemPrice}>₹ 110.00</div>
                              <div style={{color: '#ef4444', fontSize: 10, marginTop: 12}}>Min Price :- ₹ 110.0</div>
                           </div>
                           <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                              <Shirt size={20} color="#9ca3af" strokeWidth={1} />
                              <Ban size={28} color="#9ca3af" strokeWidth={1} style={{position: 'absolute'}} />
                           </div>
                        </div>
                        <div className={styles.itemCard} onClick={() => handleCustomItemClick('WASH AND STEAM')} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName} style={{color: '#00b4d8'}}>Custom Item</div>
                              <div className={styles.itemPrice}>₹ 0.00</div>
                           </div>
                        </div>
                     </>
                  )}
                  {activeCategory === 'STEAM IRON' && (
                     <>
                        <div className={styles.itemCard} onClick={() => handleCustomItemClick('STEAM IRON')} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName}>Custom Item</div>
                              <div className={styles.itemPrice}>₹ 0.00</div>
                           </div>
                        </div>
                     </>
                  )}
                  {activeCategory === 'FOOTWEAR' && (
                     <>
                        <div className={styles.itemCard} onClick={() => handleFootwareClick("Sports Shoes", 300)} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName} style={{color: '#00b4d8'}}>Sports Shoes</div>
                              <div className={styles.itemPrice}>₹ 300.00</div>
                           </div>
                           <div style={{ width: 40, height: 56, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, textAlign: 'center', color: '#9ca3af', borderRadius: 4 }}>IMG</div>
                        </div>
                        <div className={styles.itemCard} onClick={() => handleFootwareClick("Leather Shoe Ankle", 400)} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName} style={{color: '#00b4d8'}}>Leather Shoe Ankle</div>
                              <div className={styles.itemPrice}>₹ 400.00</div>
                           </div>
                           <div style={{ width: 40, height: 56, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, textAlign: 'center', color: '#9ca3af', borderRadius: 4 }}>IMG</div>
                        </div>
                        <div className={styles.itemCard} onClick={() => handleFootwareClick("Leather Shoe", 500)} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName} style={{color: '#00b4d8'}}>Leather Shoe</div>
                              <div className={styles.itemPrice}>₹ 500.00</div>
                           </div>
                           <div style={{ width: 40, height: 56, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, textAlign: 'center', color: '#9ca3af', borderRadius: 4 }}>IMG</div>
                        </div>
                        <div className={styles.itemCard} onClick={() => handleCustomItemClick('FOOTWEAR')} style={{cursor: 'pointer'}}>
                           <div className={styles.itemInfo}>
                              <div className={styles.itemName} style={{color: '#00b4d8'}}>Custom Item</div>
                              <div className={styles.itemPrice}>₹ 0.00</div>
                           </div>
                        </div>
                     </>
                  )}
               </div>
             </>
           ) : (
             <>
               {/* Detail View */}
               {!selectedItem.isCustom && (
                 <div className={styles.productDetailCard}>
                 <div className={styles.productDetailLeft}>
                    <div className={styles.productDetailImgBox} style={selectedItem.isShirtBan ? {background: 'transparent', border: '1px solid #d1d5db', borderRadius: '50%'} : {}}>
                       {selectedItem.isShirtBan ? (
                          <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%'}}>
                             <Shirt size={28} color="#9ca3af" strokeWidth={1} />
                             <Ban size={40} color="#9ca3af" strokeWidth={1.5} style={{position: 'absolute'}} />
                          </div>
                       ) : (
                          <div style={{fontSize: 10, color: '#00b4d8', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'pre-line'}}>{selectedItem.imageText}</div>
                       )}
                    </div>
                    <div className={styles.productDetailInfo}>
                       <div className={styles.productDetailTitle}>{selectedItem.subType}</div>
                       <div className={styles.priceInputRow}>
                          {selectedItem.type === 'FOOTWARE' || selectedItem.type === 'FOOTWEAR' ? 'Price per Item' : 'Price per kg'} <input type="text" value={selectedItem.price.toFixed(1)} readOnly />
                       </div>
                       {selectedItem.minPrice && (
                          <div style={{color: '#ef4444', fontSize: 12, marginTop: 12}}>Minimum Item Price : ₹ {selectedItem.minPrice.toFixed(1)}</div>
                       )}
                    </div>
                 </div>
                 
                 <div className={styles.productDetailControls}>
                    <div className={styles.weightIcon}>
                       <div style={{width: 16, height: 16, borderRadius: '50%', background: '#ef4444', margin: 'auto', marginTop: 4}}></div>
                    </div>
                    <div className={styles.qtySelector}>
                       <button className={styles.qtyBtn} onClick={() => setSelectedItem({...selectedItem, quantity: Math.max(1, selectedItem.quantity - 1)})}><Minus size={18} strokeWidth={2.5}/></button>
                       <input type="text" className={styles.qtyInput} value={selectedItem.quantity} readOnly />
                       <button className={styles.qtyBtn} onClick={() => setSelectedItem({...selectedItem, quantity: selectedItem.quantity + 1})}><Plus size={18} strokeWidth={2.5}/></button>
                    </div>
                    <button className={styles.btnRack}>
                       <Plus size={18} color="#00b4d8" strokeWidth={3} /> Rack / Conveyor
                    </button>
                 </div>
               </div>
               )}
               
               <div className={styles.actionTabs}>
                  {selectedItem.isCustom && (
                    <button className={`${styles.actionTab} ${activeTab === 'Price' ? styles.actionTabActive : styles.actionTabInactive}`} onClick={() => setActiveTab('Price')}>Price</button>
                  )}
                  <button className={`${styles.actionTab} ${activeTab === 'Discount' ? styles.actionTabActive : styles.actionTabInactive}`} onClick={() => setActiveTab('Discount')}>Discount</button>
                  <button className={`${styles.actionTab} ${activeTab === 'Image' ? styles.actionTabActive : styles.actionTabInactive}`} onClick={() => setActiveTab('Image')}>Image</button>
                  <button className={`${styles.actionTab} ${activeTab === 'Item Note' ? styles.actionTabActive : styles.actionTabInactive}`} onClick={() => setActiveTab('Item Note')}>Item Note</button>
                  {selectedItem.type === 'FOOTWARE' || selectedItem.type === 'FOOTWEAR' ? (
                    <button className={`${styles.actionTab} ${activeTab === 'Color' ? styles.actionTabActive : styles.actionTabInactive}`} onClick={() => setActiveTab('Color')}>Color</button>
                  ) : (
                    <button className={`${styles.actionTab} ${activeTab === 'Product List' ? styles.actionTabActive : styles.actionTabInactive}`} onClick={() => setActiveTab('Product List')}>Product List</button>
                  )}
               </div>
               
               {activeTab === 'Price' && selectedItem.isCustom && (
                 <div className={styles.discountControls} style={{flexDirection: 'column', gap: '16px'}}>
                    <div style={{fontSize: 16, fontWeight: 600, color: '#4b5563'}}>Set Specific Product Price</div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                      <div className={styles.discountBtn} style={{background: '#f3f4f6', color: '#111827', cursor: 'default'}}>₹</div>
                      <input 
                        type="number" 
                        className={styles.discountInput} 
                        style={{width: '200px', fontSize: '20px', fontWeight: 'bold'}}
                        value={selectedItem.price || ''}
                        onChange={(e) => setSelectedItem({...selectedItem, price: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                 </div>
               )}

               {activeTab === 'Discount' && (
                 <div className={styles.discountControls}>
                    <button className={styles.discountBtn}>₹</button>
                    <input type="text" className={styles.discountInput} />
                    <button className={styles.discountBtn}>%</button>
                 </div>
               )}
               
               {activeTab === 'Image' && (
                 <div className={styles.imageTabContent}>
                    <div className={styles.imageTabHeader}>
                       <span>0/4 images selected</span>
                       <span>Max size: 3 MB</span>
                    </div>
                    <div className={styles.imageDropzone}>
                       <ImageIcon size={48} className={styles.imageDropzoneIcon} strokeWidth={1} />
                       <div className={styles.imageDropzoneTitle}>No image selected</div>
                       <div className={styles.imageDropzoneSubtitle}>Upload or capture an image of the item.</div>
                    </div>
                    <div className={styles.imageActionBtns}>
                       <button className={styles.btnUpload}><Upload size={18} /> Upload Image</button>
                       <button className={styles.btnCapture}><Camera size={18} /> Capture Image</button>
                    </div>
                 </div>
               )}
               
               {activeTab === 'Item Note' && (
                 <textarea 
                    className={styles.itemNoteTextarea} 
                    placeholder="Add a note for this item..." 
                    value={itemNoteText}
                    onChange={(e) => setItemNoteText(e.target.value)}
                 />
               )}
               
               {activeTab === 'Color' && (
                 <div style={{padding: '32px', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: '6px', marginTop: '24px'}}>
                    Color selection options will be available here.
                 </div>
               )}
               
               {activeTab === 'Product List' && (
                 <div className={styles.productListContainer}>
                    {productsList.length > 0 && (
                      <div className={styles.productListHeader}>
                        <div className={styles.productNameHeader}>Product Name :</div>
                        <div style={{width: '100px', textAlign: 'center'}}>Price (₹)</div>
                        <div className={styles.quantityHeader}>Quantity</div>
                      </div>
                    )}
                    
                    {productsList.map(product => (
                      <div key={product.id} className={styles.productListRow}>
                        <div className={styles.productSearchContainer}>
                          <input 
                            type="text" 
                            className={styles.productSearchInput} 
                            placeholder="Search product..." 
                            value={product.search}
                            onChange={(e) => handleUpdateProductSearch(product.id, e.target.value)}
                            onFocus={() => setProductsList(prev => prev.map(p => p.id === product.id ? { ...p, showSuggestions: true } : p))}
                            onBlur={() => setTimeout(() => setProductsList(prev => prev.map(p => p.id === product.id ? { ...p, showSuggestions: false } : p)), 200)}
                          />
                          {product.showSuggestions && product.search && (
                            <div className={styles.productSearchSuggestions}>
                               {AVAILABLE_PRODUCTS.filter(name => name.toLowerCase().includes(product.search.toLowerCase()))
                                 .sort((a, b) => {
                                    const query = product.search.toLowerCase();
                                    const aStarts = a.toLowerCase().startsWith(query);
                                    const bStarts = b.toLowerCase().startsWith(query);
                                    if (aStarts && !bStarts) return -1;
                                    if (!aStarts && bStarts) return 1;
                                    return a.localeCompare(b);
                                 })
                                 .map(name => (
                                  <div key={name} className={styles.productSearchSuggestionItem} onMouseDown={(e) => { e.preventDefault(); handleSelectProduct(product.id, name); }}>
                                     {name}
                                  </div>
                               ))}
                            </div>
                          )}
                        </div>
                        
                        <div style={{width: '100px', display: 'flex', alignItems: 'center'}}>
                           <input 
                             type="number" 
                             style={{width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none', textAlign: 'center'}}
                             placeholder="0.00" 
                             value={(product as any).price || ''}
                             onChange={(e) => {
                               const newPrice = e.target.value;
                               const newList = productsList.map(p => p.id === product.id ? { ...p, price: newPrice } : p);
                               setProductsList(newList as any);
                               
                               if (selectedItem?.isCustom) {
                                 const hasAnyPrice = newList.some(p => (p as any).price);
                                 if (hasAnyPrice) {
                                   const total = newList.reduce((acc, curr) => acc + (parseFloat((curr as any).price || '0') * curr.quantity), 0);
                                   setSelectedItem({...selectedItem, price: total});
                                 }
                               }
                             }}
                           />
                        </div>

                        <div className={styles.productQtyControls}>
                          <button className={styles.productQtyBtn} onClick={() => handleUpdateProductQty(product.id, -1)}><Minus size={18} /></button>
                          <div className={styles.productQtyValue}>{product.quantity}</div>
                          <button className={styles.productQtyBtn} onClick={() => handleUpdateProductQty(product.id, 1)}><Plus size={18} /></button>
                        </div>
                        
                        <button className={styles.productDeleteBtn} onClick={() => handleRemoveProduct(product.id)}><Trash2 size={18} /></button>
                      </div>
                    ))}
                    
                    <button className={styles.btnAddProduct} onClick={handleAddProduct}>
                       <Plus size={24} />
                    </button>
                 </div>
               )}
             </>
           )}
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
         <div className={styles.amountDue}>
            Amount Due : <span className={styles.amountValue}>₹ {amountDue}</span>
         </div>
         <div className={styles.bottomActions}>
            {!selectedItem ? (
               <>
                 <button className={styles.btnCancel} style={{marginRight: '12px'}} onClick={() => setOrderStep('search')}>Back</button>
                 <button className={styles.btnCancel} style={{marginRight: '12px'}} onClick={() => {}}>Cancel</button>
                 <button className={styles.btnCancel} style={{background: '#00ced1', color: '#111827'}} onClick={handleConfirmOrder}>Confirm Order</button>
               </>
            ) : (
               <>
                 <button className={styles.btnCancel} onClick={() => setSelectedItem(null)}>Back</button>
                 <button className={styles.btnCancel} style={{background: '#00ced1', color: '#111827'}} onClick={handleConfirmOrder}>Add to Order</button>
               </>
            )}
         </div>
      </div>
    </div>
  );
}
