export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  password: string;
}

export interface Customer {
  id: string;
  customerId: string; // Auto-generated e.g. CUS-001
  name: string;
  mobile: string;
  email: string;
  createdAt: string;
  totalOrders: number;
}

export type LaundryItemType =
  | 'Shirt'
  | 'Trouser'
  | 'Saree'
  | 'Kurta'
  | 'Jacket'
  | 'Bedsheet'
  | 'Blanket'
  | 'Towel'
  | 'Suit'
  | 'Dress'
  | 'Others';

export interface LaundryItem {
  id: string;
  type: LaundryItemType | string;
  quantity: number;
  weight: number; // in kg
  rate: number;   // per kg
  amount: number; // weight * rate
}

export type OrderStatus = 'Pending' | 'In-Progress' | 'Completed' | 'Delivered';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Online';

export interface Order {
  id: string;
  orderId: string;     // Auto-generated e.g. ORD-0001
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  items: LaundryItem[];
  totalWeight: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deliveryDate?: string;
}

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gst: string;
  logo?: string; // base64
  currency: string;
  upiId?: string;
  upiName?: string;
  whatsappGatewayUrl?: string;
}

export interface LaundryRate {
  type: string;
  rate: number; // per kg
}

export interface Service {
  id: string;
  label: string;
  sub: string;
  multiplier: number;
  defaultUnit: 'pc' | 'kg';
}

export interface ServiceItem {
  id: string;
  serviceId: string; // e.g. 'wash-fold', 'dry-clean', etc.
  name: string;      // e.g. 'Shirt'
  category: string;  // 'MEN' | 'Women' | 'Kids' | 'Footwear' | 'Household'
  price: number;     // Unified pricing rate
  unit: string;      // Unified pricing unit e.g. 'kg', 'pc', 'pair', 'set', etc.
  pricePc?: number;  // Price per piece (optional, kept for backward compatibility)
  priceKg?: number;  // Price per kg (optional, kept for backward compatibility)
  processingTime: string; // e.g. '24 hours'
  enabled: boolean;
  icon?: string;
  image?: string;    // Optional product image URL
  description?: string; // Optional product description
}

export interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
}
