import { Customer, Order, CompanySettings, LaundryRate, User, Service, ServiceItem } from '@/types';

const KEYS = {
  customers: 'lms_customers',
  orders: 'lms_orders',
  settings: 'lms_settings',
  rates: 'lms_rates',
  users: 'lms_users',
  services: 'lms_services',
  serviceItems: 'lms_service_items',
};

function get<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function getSingle<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setSingle<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------- Customers ----------
export const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    customerId: 'CUS-0001',
    name: 'Mitul Patel',
    mobile: '9876543001',
    email: 'mitul.patel@laundryto.in',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    totalOrders: 2
  },
  {
    id: 'cust-2',
    customerId: 'CUS-0002',
    name: 'Aarav Sharma',
    mobile: '9876543002',
    email: 'aarav.sharma@example.com',
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    totalOrders: 1
  },
  {
    id: 'cust-3',
    customerId: 'CUS-0003',
    name: 'Priya Mehta',
    mobile: '9876543003',
    email: 'priya.mehta@example.com',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    totalOrders: 0
  }
];

export const customerDB = {
  getAll: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const item = localStorage.getItem(KEYS.customers);
    if (!item) {
      set(KEYS.customers, DEFAULT_CUSTOMERS);
      return DEFAULT_CUSTOMERS;
    }
    try {
      return JSON.parse(item);
    } catch {
      return [];
    }
  },
  getById: (id: string): Customer | undefined => customerDB.getAll().find(c => c.id === id),
  getByCustomerId: (cid: string): Customer | undefined => customerDB.getAll().find(c => c.customerId === cid),
  save: (customer: Customer): void => {
    const all = customerDB.getAll();
    const idx = all.findIndex(c => c.id === customer.id);
    if (idx >= 0) all[idx] = customer;
    else all.push(customer);
    set(KEYS.customers, all);
  },
  delete: (id: string): void => {
    set(KEYS.customers, customerDB.getAll().filter(c => c.id !== id));
  },
  generateCustomerId: (): string => {
    const all = customerDB.getAll();
    const num = (all.length + 1).toString().padStart(4, '0');
    return `CUS-${num}`;
  },
};

// ---------- Orders ----------
export const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderId: 'ORD-0001',
    customerId: 'cust-1',
    customerName: 'Mitul Patel',
    customerMobile: '9876543001',
    customerEmail: 'mitul.patel@laundryto.in',
    items: [
      { id: 'item-1', type: 'Shirt', quantity: 3, weight: 1.5, rate: 30, amount: 45 }
    ],
    totalWeight: 1.5,
    totalAmount: 45,
    discount: 0,
    finalAmount: 45,
    paymentStatus: 'Paid',
    paymentMethod: 'UPI',
    orderStatus: 'Completed',
    notes: 'Urgent service request',
    createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ord-2',
    orderId: 'ORD-0002',
    customerId: 'cust-1',
    customerName: 'Mitul Patel',
    customerMobile: '9876543001',
    customerEmail: 'mitul.patel@laundryto.in',
    items: [
      { id: 'item-2', type: 'Suit', quantity: 1, weight: 1.0, rate: 100, amount: 100 }
    ],
    totalWeight: 1.0,
    totalAmount: 100,
    discount: 10,
    finalAmount: 90,
    paymentStatus: 'Paid',
    paymentMethod: 'Cash',
    orderStatus: 'Delivered',
    notes: 'Premium fabric care',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ord-3',
    orderId: 'ORD-0003',
    customerId: 'cust-2',
    customerName: 'Aarav Sharma',
    customerMobile: '9876543002',
    customerEmail: 'aarav.sharma@example.com',
    items: [
      { id: 'item-3', type: 'Bedsheet', quantity: 2, weight: 2.0, rate: 50, amount: 100 }
    ],
    totalWeight: 2.0,
    totalAmount: 100,
    discount: 0,
    finalAmount: 100,
    paymentStatus: 'Unpaid',
    paymentMethod: 'Cash',
    orderStatus: 'In-Progress',
    notes: 'Handle with care',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  }
];

export const orderDB = {
  getAll: (): Order[] => {
    if (typeof window === 'undefined') return [];
    const item = localStorage.getItem(KEYS.orders);
    if (!item) {
      set(KEYS.orders, DEFAULT_ORDERS);
      return DEFAULT_ORDERS;
    }
    try {
      return JSON.parse(item);
    } catch {
      return [];
    }
  },
  getById: (id: string): Order | undefined => orderDB.getAll().find(o => o.id === id),
  getByOrderId: (oid: string): Order | undefined => orderDB.getAll().find(o => o.orderId === oid),
  getByCustomerId: (cid: string): Order[] => orderDB.getAll().filter(o => o.customerId === cid),
  save: (order: Order): void => {
    const all = orderDB.getAll();
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) all[idx] = order;
    else all.push(order);
    set(KEYS.orders, all);
  },
  delete: (id: string): void => {
    set(KEYS.orders, orderDB.getAll().filter(o => o.id !== id));
  },
  generateOrderId: (): string => {
    const all = orderDB.getAll();
    const num = (all.length + 1).toString().padStart(4, '0');
    return `ORD-${num}`;
  },
};

// ---------- Settings ----------
export const DEFAULT_SETTINGS: CompanySettings = {
  name: 'LaundryTO',
  tagline: 'LAUNDRY | DRY CLEAN',
  address: 'SHOP-G-15 SAHJANAND LUXURIA DAHEJ BYPASS ROAD',
  city: 'BHARUCH',
  state: 'Gujarat',
  pincode: '392012',
  phone: '+91 73834 30049',
  email: 'info@laundryto.in',
  gst: '24XXXXX1234X1Z5',
  currency: '₹',
  upiId: 'maaambika5108@fbl',
  upiName: 'MAA AMBICA SHINE AND STEAM',
  whatsappGatewayUrl: 'http://localhost:5000/messages/chat',
};

export const settingsDB = {
  get: (): CompanySettings => {
    const val = getSingle<CompanySettings>(KEYS.settings, DEFAULT_SETTINGS);
    if (
      val.name === 'FreshFold Laundry' ||
      val.name === 'FreshFold LMS' ||
      val.city === 'Vadodara' ||
      val.address === '123, Main Street, Near City Mall' ||
      val.upiId === '7383430049@okbizaxis'
    ) {
      const updated = {
        ...val,
        name: DEFAULT_SETTINGS.name,
        tagline: DEFAULT_SETTINGS.tagline,
        address: DEFAULT_SETTINGS.address,
        city: DEFAULT_SETTINGS.city,
        state: DEFAULT_SETTINGS.state,
        pincode: DEFAULT_SETTINGS.pincode,
        phone: DEFAULT_SETTINGS.phone,
        email: DEFAULT_SETTINGS.email,
        upiId: DEFAULT_SETTINGS.upiId,
        upiName: DEFAULT_SETTINGS.upiName,
      };
      setSingle(KEYS.settings, updated);
      return updated;
    }
    return val;
  },
  save: (settings: CompanySettings): void => setSingle(KEYS.settings, settings),
};

// ---------- Rates ----------
export const DEFAULT_RATES: LaundryRate[] = [
  { type: 'Shirt', rate: 30 },
  { type: 'Trouser', rate: 35 },
  { type: 'Saree', rate: 80 },
  { type: 'Kurta', rate: 35 },
  { type: 'Jacket', rate: 60 },
  { type: 'Bedsheet', rate: 50 },
  { type: 'Blanket', rate: 80 },
  { type: 'Towel', rate: 20 },
  { type: 'Suit', rate: 100 },
  { type: 'Dress', rate: 60 },
  { type: 'Others', rate: 40 },
];

export const ratesDB = {
  getAll: (): LaundryRate[] => {
    const stored = get<LaundryRate>(KEYS.rates);
    return stored.length > 0 ? stored : DEFAULT_RATES;
  },
  save: (rates: LaundryRate[]): void => set(KEYS.rates, rates),
};

// ---------- Users ----------
export const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Admin User', role: 'admin', username: 'admin', password: 'admin123' },
  { id: '2', name: 'Cashier', role: 'cashier', username: 'cashier', password: 'cashier123' },
];

export const usersDB = {
  getAll: (): User[] => {
    const stored = get<User>(KEYS.users);
    return stored.length > 0 ? stored : DEFAULT_USERS;
  },
  authenticate: (username: string, password: string): User | null => {
    const users = usersDB.getAll();
    return users.find(u => u.username === username && u.password === password) || null;
  },
  save: (users: User[]): void => set(KEYS.users, users),
};

// ---------- Services ----------
export const DEFAULT_SERVICES: Service[] = [
  { id: 'wash-fold', label: 'Wash & Fold', sub: 'Weight based laundry', multiplier: 1.5, defaultUnit: 'kg' },
  { id: 'dry-clean', label: 'Dry Cleaning', sub: 'Chemical wash care', multiplier: 3.5, defaultUnit: 'pc' },
  { id: 'steam-iron', label: 'Wash & Steam', sub: 'Steam & iron care', multiplier: 1.0, defaultUnit: 'kg' },
  { id: 'steam-ironing', label: 'Steam Ironing', sub: 'Steam ironing only', multiplier: 0.6, defaultUnit: 'pc' },
  { id: 'premium-wash', label: 'Premium Wash', sub: 'Gentle fabric care', multiplier: 2.5, defaultUnit: 'pc' },
  { id: 'express-laundry', label: 'Express Laundry', sub: 'Same day delivery', multiplier: 3.0, defaultUnit: 'pc' },
  { id: 'stain-removal', label: 'Stain Removal', sub: 'Tough spot treatment', multiplier: 2.0, defaultUnit: 'pc' },
  { id: 'shoe-clean', label: 'Shoe Cleaning', sub: 'Footwear restoration', multiplier: 4.0, defaultUnit: 'pc' },
  { id: 'household-clean', label: 'Household Cleaning', sub: 'Blanket, curtains & rugs', multiplier: 2.5, defaultUnit: 'pc' },
];

export const servicesDB = {
  getAll: (): Service[] => {
    const stored = get<Service>(KEYS.services);
    if (stored.length > 0) {
      const hasIroning = stored.some(s => s.id === 'steam-ironing');
      if (!hasIroning) {
        const newService = DEFAULT_SERVICES.find(s => s.id === 'steam-ironing');
        if (newService) {
          stored.push(newService);
          // Insert after wash-steam (index 2) for consistent ordering
          const index = stored.findIndex(s => s.id === 'steam-iron');
          if (index >= 0) {
            // Remove the newly pushed service from end and splice it in
            stored.pop();
            stored.splice(index + 1, 0, newService);
          }
          set(KEYS.services, stored);
        }
      }
      return stored;
    }
    return DEFAULT_SERVICES;
  },
  save: (services: Service[]): void => set(KEYS.services, services),
};

// ---------- Service Items ----------
export const DEFAULT_SERVICE_ITEMS: ServiceItem[] = [
  // Wash & Fold
  { id: 'wf-1', serviceId: 'wash-fold', name: 'Shirt', category: 'MEN', price: 30, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👔' },
  { id: 'wf-2', serviceId: 'wash-fold', name: 'T-Shirt', category: 'MEN', price: 25, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👕' },
  { id: 'wf-3', serviceId: 'wash-fold', name: 'Jeans', category: 'MEN', price: 40, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👖' },
  { id: 'wf-4', serviceId: 'wash-fold', name: 'Trouser', category: 'MEN', price: 30, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👖' },
  { id: 'wf-5', serviceId: 'wash-fold', name: 'Saree', category: 'Women', price: 100, unit: 'kg', processingTime: '36 hours', enabled: true, icon: '🥻' },
  { id: 'wf-6', serviceId: 'wash-fold', name: 'Kurti', category: 'Women', price: 50, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👘' },
  { id: 'wf-7', serviceId: 'wash-fold', name: 'Bedsheet', category: 'Household', price: 80, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '🛌' },
  { id: 'wf-8', serviceId: 'wash-fold', name: 'Towel', category: 'Household', price: 40, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '🧼' },
  { id: 'wf-9', serviceId: 'wash-fold', name: 'School Uniform', category: 'Kids', price: 40, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '🏫' },

  // Dry Cleaning
  { id: 'dc-1', serviceId: 'dry-clean', name: 'Blazer', category: 'MEN', price: 150, unit: 'pc', processingTime: '3 days', enabled: true, icon: '🧥' },
  { id: 'dc-2', serviceId: 'dry-clean', name: 'Suit', category: 'MEN', price: 250, unit: 'pc', processingTime: '3 days', enabled: true, icon: '🧥' },
  { id: 'dc-3', serviceId: 'dry-clean', name: 'Saree', category: 'Women', price: 180, unit: 'pc', processingTime: '3 days', enabled: true, icon: '🥻' },
  { id: 'dc-4', serviceId: 'dry-clean', name: 'Lehenga', category: 'Women', price: 450, unit: 'pc', processingTime: '4 days', enabled: true, icon: '👗' },
  { id: 'dc-5', serviceId: 'dry-clean', name: 'Gown', category: 'Women', price: 300, unit: 'pc', processingTime: '3 days', enabled: true, icon: '👗' },
  { id: 'dc-6', serviceId: 'dry-clean', name: 'Sherwani', category: 'MEN', price: 350, unit: 'pc', processingTime: '4 days', enabled: true, icon: '👘' },
  { id: 'dc-7', serviceId: 'dry-clean', name: 'Leather Jacket', category: 'MEN', price: 400, unit: 'pc', processingTime: '4 days', enabled: true, icon: '🧥' },
  { id: 'dc-8', serviceId: 'dry-clean', name: 'Silk Dress', category: 'Women', price: 150, unit: 'pc', processingTime: '3 days', enabled: true, icon: '👗' },

  // Steam Ironing (Wash & Steam)
  { id: 'si-1', serviceId: 'steam-iron', name: 'Shirt', category: 'MEN', price: 30, unit: 'kg', processingTime: '12 hours', enabled: true, icon: '👔' },
  { id: 'si-2', serviceId: 'steam-iron', name: 'T-Shirt', category: 'MEN', price: 25, unit: 'kg', processingTime: '12 hours', enabled: true, icon: '👕' },
  { id: 'si-3', serviceId: 'steam-iron', name: 'Trouser', category: 'MEN', price: 30, unit: 'kg', processingTime: '12 hours', enabled: true, icon: '👖' },
  { id: 'si-4', serviceId: 'steam-iron', name: 'Saree', category: 'Women', price: 80, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '🥻' },
  { id: 'si-5', serviceId: 'steam-iron', name: 'Kurti', category: 'Women', price: 40, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👘' },
  { id: 'si-6', serviceId: 'steam-iron', name: 'Kurta', category: 'MEN', price: 40, unit: 'kg', processingTime: '24 hours', enabled: true, icon: '👘' },
  { id: 'si-7', serviceId: 'steam-iron', name: 'School Uniform', category: 'Kids', price: 30, unit: 'kg', processingTime: '12 hours', enabled: true, icon: '🏫' },

  // Steam Ironing Only
  { id: 'sio-1', serviceId: 'steam-ironing', name: 'Shirt', category: 'MEN', price: 15, unit: 'pc', processingTime: '12 hours', enabled: true, icon: '👔' },
  { id: 'sio-2', serviceId: 'steam-ironing', name: 'T-Shirt', category: 'MEN', price: 12, unit: 'pc', processingTime: '12 hours', enabled: true, icon: '👕' },
  { id: 'sio-3', serviceId: 'steam-ironing', name: 'Trouser', category: 'MEN', price: 15, unit: 'pc', processingTime: '12 hours', enabled: true, icon: '👖' },
  { id: 'sio-4', serviceId: 'steam-ironing', name: 'Saree', category: 'Women', price: 40, unit: 'pc', processingTime: '24 hours', enabled: true, icon: '🥻' },
  { id: 'sio-5', serviceId: 'steam-ironing', name: 'Kurti', category: 'Women', price: 20, unit: 'pc', processingTime: '24 hours', enabled: true, icon: '👘' },
  { id: 'sio-6', serviceId: 'steam-ironing', name: 'Kurta', category: 'MEN', price: 20, unit: 'pc', processingTime: '24 hours', enabled: true, icon: '👘' },
  { id: 'sio-7', serviceId: 'steam-ironing', name: 'School Uniform', category: 'Kids', price: 15, unit: 'pc', processingTime: '12 hours', enabled: true, icon: '🏫' },

  // Premium Wash
  { id: 'pw-1', serviceId: 'premium-wash', name: 'Silk Saree', category: 'Women', price: 220, unit: 'pc', processingTime: '2 days', enabled: true, icon: '🥻' },
  { id: 'pw-2', serviceId: 'premium-wash', name: 'Designer Suit', category: 'MEN', price: 350, unit: 'pc', processingTime: '3 days', enabled: true, icon: '🧥' },
  { id: 'pw-3', serviceId: 'premium-wash', name: 'Premium Jacket', category: 'MEN', price: 200, unit: 'pc', processingTime: '2 days', enabled: true, icon: '🧥' },
  { id: 'pw-4', serviceId: 'premium-wash', name: 'Wedding Dress', category: 'Women', price: 900, unit: 'pc', processingTime: '5 days', enabled: true, icon: '👗' },

  // Express Laundry
  { id: 'el-1', serviceId: 'express-laundry', name: 'Shirt', category: 'MEN', price: 50, unit: 'pc', processingTime: '6 hours', enabled: true, icon: '👔' },
  { id: 'el-2', serviceId: 'express-laundry', name: 'Jeans', category: 'MEN', price: 60, unit: 'pc', processingTime: '6 hours', enabled: true, icon: '👖' },
  { id: 'el-3', serviceId: 'express-laundry', name: 'Trouser', category: 'MEN', price: 50, unit: 'pc', processingTime: '6 hours', enabled: true, icon: '👖' },

  // Stain Removal
  { id: 'sr-1', serviceId: 'stain-removal', name: 'Shirt Stain Treatment', category: 'MEN', price: 80, unit: 'pc', processingTime: '24 hours', enabled: true, icon: '👔' },
  { id: 'sr-2', serviceId: 'stain-removal', name: 'Saree Stain Treatment', category: 'Women', price: 150, unit: 'pc', processingTime: '36 hours', enabled: true, icon: '🥻' },
  { id: 'sr-3', serviceId: 'stain-removal', name: 'Carpet Stain Treatment', category: 'Household', price: 300, unit: 'pc', processingTime: '2 days', enabled: true, icon: '🪵' },

  // Shoe Cleaning
  { id: 'sc-1', serviceId: 'shoe-clean', name: 'Sneakers', category: 'Footwear', price: 120, unit: 'pair', processingTime: '2 days', enabled: true, icon: '👟' },
  { id: 'sc-2', serviceId: 'shoe-clean', name: 'Sports Shoes', category: 'Footwear', price: 120, unit: 'pair', processingTime: '2 days', enabled: true, icon: '👟' },
  { id: 'sc-3', serviceId: 'shoe-clean', name: 'Leather Shoes', category: 'Footwear', price: 180, unit: 'pair', processingTime: '3 days', enabled: true, icon: '👞' },
  { id: 'sc-4', serviceId: 'shoe-clean', name: 'Boots', category: 'Footwear', price: 220, unit: 'pair', processingTime: '3 days', enabled: true, icon: '🥾' },
  { id: 'sc-5', serviceId: 'shoe-clean', name: 'Heels', category: 'Footwear', price: 140, unit: 'pair', processingTime: '2 days', enabled: true, icon: '👠' },
  { id: 'sc-6', serviceId: 'shoe-clean', name: 'Sandals', category: 'Footwear', price: 90, unit: 'pair', processingTime: '2 days', enabled: true, icon: '👡' },

  // Household Cleaning
  { id: 'hc-1', serviceId: 'household-clean', name: 'Curtains', category: 'Household', price: 100, unit: 'pc', processingTime: '3 days', enabled: true, icon: '🪟' },
  { id: 'hc-2', serviceId: 'household-clean', name: 'Blanket', category: 'Household', price: 150, unit: 'pc', processingTime: '2 days', enabled: true, icon: '🛌' },
  { id: 'hc-3', serviceId: 'household-clean', name: 'Carpet', category: 'Household', price: 400, unit: 'pc', processingTime: '4 days', enabled: true, icon: '🪵' },
  { id: 'hc-4', serviceId: 'household-clean', name: 'Comforter', category: 'Household', price: 200, unit: 'pc', processingTime: '2 days', enabled: true, icon: '🛌' },
  { id: 'hc-5', serviceId: 'household-clean', name: 'Sofa Cover', category: 'Household', price: 120, unit: 'pc', processingTime: '3 days', enabled: true, icon: '🛋️' },
  { id: 'hc-6', serviceId: 'household-clean', name: 'Bedsheet', category: 'Household', price: 80, unit: 'pc', processingTime: '24 hours', enabled: true, icon: '🛌' },
  { id: 'hc-7', serviceId: 'household-clean', name: 'Pillow Cover', category: 'Household', price: 25, unit: 'pc', processingTime: '24 hours', enabled: true, icon: '🛏️' },
];

export const serviceItemsDB = {
  getAll: (): ServiceItem[] => {
    const stored = get<ServiceItem>(KEYS.serviceItems);
    if (stored.length > 0) {
      const hasIroningItems = stored.some(i => i.serviceId === 'steam-ironing');
      if (!hasIroningItems) {
        const newItems = DEFAULT_SERVICE_ITEMS.filter(i => i.serviceId === 'steam-ironing');
        stored.push(...newItems);
        set(KEYS.serviceItems, stored);
      }
    }
    const items = stored.length > 0 ? stored : DEFAULT_SERVICE_ITEMS;
    let migrated = false;

    const mapped = items.map(item => {
      if (item.price === undefined || item.unit === undefined) {
        migrated = true;
        const services = servicesDB.getAll();
        const service = services.find(s => s.id === item.serviceId);
        const defaultUnit = service?.defaultUnit || 'pc';

        let unit = defaultUnit;
        let price = 0;

        if (item.priceKg !== undefined && defaultUnit === 'kg') {
          unit = 'kg';
          price = item.priceKg;
        } else if (item.pricePc !== undefined) {
          unit = 'pc';
          price = item.pricePc;
        } else if (item.priceKg !== undefined) {
          unit = 'kg';
          price = item.priceKg;
        }

        return {
          ...item,
          price,
          unit,
        };
      }
      return item;
    });

    if (migrated && stored.length > 0) {
      serviceItemsDB.save(mapped);
    }
    return mapped;
  },
  save: (items: ServiceItem[]): void => set(KEYS.serviceItems, items),
};
