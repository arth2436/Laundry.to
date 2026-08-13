import { create } from 'zustand';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { orderDB, customerDB } from '@/lib/db';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';

interface OrderState {
  orders: Order[];
  load: () => void;
  addOrder: (order: Omit<Order, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>) => Order;
  updateOrder: (order: Order) => void;
  updateStatus: (id: string, status: OrderStatus) => void;
  updatePayment: (id: string, paymentStatus: PaymentStatus) => void;
  deleteOrder: (id: string) => void;
  getOrder: (id: string) => Order | undefined;
  getOrdersByCustomer: (customerId: string) => Order[];
  searchOrders: (query: string) => Order[];
  // Revenue
  getTodayRevenue: () => number;
  getWeekRevenue: () => number;
  getMonthRevenue: () => number;
  getTotalRevenue: () => number;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  orders: [],
  load: () => set({ orders: orderDB.getAll() }),

  addOrder: (data) => {
    const uuid = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

    const order: Order = {
      id: uuid,
      orderId: orderDB.generateOrderId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orderDB.save(order);
    // Update customer totalOrders
    const customer = customerDB.getById(order.customerId);
    if (customer) {
      customer.totalOrders += 1;
      customerDB.save(customer);
    }
    set({ orders: orderDB.getAll() });
    return order;
  },

  updateOrder: (order) => {
    order.updatedAt = new Date().toISOString();
    orderDB.save(order);
    set({ orders: orderDB.getAll() });
  },

  updateStatus: (id, status) => {
    const order = orderDB.getById(id);
    if (order) {
      order.orderStatus = status;
      order.updatedAt = new Date().toISOString();
      orderDB.save(order);
      set({ orders: orderDB.getAll() });
    }
  },

  updatePayment: (id, paymentStatus) => {
    const order = orderDB.getById(id);
    if (order) {
      order.paymentStatus = paymentStatus;
      order.updatedAt = new Date().toISOString();
      orderDB.save(order);
      set({ orders: orderDB.getAll() });
    }
  },

  deleteOrder: (id) => {
    orderDB.delete(id);
    set({ orders: orderDB.getAll() });
  },

  getOrder: (id) => get().orders.find(o => o.id === id),
  getOrdersByCustomer: (customerId) => get().orders.filter(o => o.customerId === customerId),

  searchOrders: (query) => {
    const q = query.toLowerCase();
    return get().orders.filter(
      o =>
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerMobile.includes(q)
    );
  },

  getTodayRevenue: () => {
    const today = startOfDay(new Date());
    return get()
      .orders.filter(o => o.paymentStatus === 'Paid' && isAfter(new Date(o.createdAt), today))
      .reduce((sum, o) => sum + o.finalAmount, 0);
  },

  getWeekRevenue: () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return get()
      .orders.filter(o => o.paymentStatus === 'Paid' && isAfter(new Date(o.createdAt), weekStart))
      .reduce((sum, o) => sum + o.finalAmount, 0);
  },

  getMonthRevenue: () => {
    const monthStart = startOfMonth(new Date());
    return get()
      .orders.filter(o => o.paymentStatus === 'Paid' && isAfter(new Date(o.createdAt), monthStart))
      .reduce((sum, o) => sum + o.finalAmount, 0);
  },

  getTotalRevenue: () => {
    return get()
      .orders.filter(o => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.finalAmount, 0);
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'lms_orders') {
      useOrderStore.getState().load();
    }
  });
}
