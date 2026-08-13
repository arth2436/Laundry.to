import { create } from 'zustand';
import { Customer } from '@/types';
import { customerDB } from '@/lib/db';

interface CustomerState {
  customers: Customer[];
  load: () => void;
  addCustomer: (data: Omit<Customer, 'id' | 'customerId' | 'createdAt' | 'totalOrders'>) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];
}

export const useCustomerStore = create<CustomerState>()((set, get) => ({
  customers: [],
  load: () => set({ customers: customerDB.getAll() }),
  addCustomer: (data) => {
    const uuid = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    
    const customer: Customer = {
      id: uuid,
      customerId: customerDB.generateCustomerId(),
      ...data,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
    };
    customerDB.save(customer);
    set({ customers: customerDB.getAll() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
    return customer;
  },
  updateCustomer: (customer) => {
    customerDB.save(customer);
    set({ customers: customerDB.getAll() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  },
  deleteCustomer: (id) => {
    customerDB.delete(id);
    set({ customers: customerDB.getAll() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  },
  getCustomer: (id) => get().customers.find(c => c.id === id),
  searchCustomers: (query) => {
    const q = query.toLowerCase();
    return get().customers.filter(
      c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'lms_customers') {
      useCustomerStore.getState().load();
    }
  });
}
