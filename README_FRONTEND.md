# 🎨 Frontend Documentation & Text Steps

This document provides a comprehensive step-by-step guide to the **Frontend Architecture**, page flows, UI components, state management, and asset rendering in the Laundry & Dry Cleaning Management System.

---

## 🛠️ Tech Stack & Overview

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **State Management**: Zustand
- **Styling**: Vanilla CSS (`src/app/globals.css`, `page.module.css`) + Tailwind / Utility variables
- **Icons**: `lucide-react`
- **PDF & Barcode Tools**: `jsbarcode`, `qrcode`, `jspdf`, `html2canvas`, `react-to-print`

---

## 📂 Directory Structure & Page Routes

```
src/
├── app/
│   ├── layout.tsx              # Root Layout with Sidebar & TopBar
│   ├── page.tsx                # Redirect / Landing Page
│   ├── login/                  # User Authentication Page
│   │   └── page.tsx
│   ├── dashboard/              # Analytics, Recent Orders, Quick Actions
│   │   └── page.tsx
│   ├── orders/                 # Order Management & New Order Modal/Form
│   │   └── page.tsx
│   ├── invoices/               # Billing, PDF Generation & WhatsApp Dispatch
│   │   └── page.tsx
│   ├── customers/              # Customer Directory & Profile History
│   │   └── page.tsx
│   ├── tag-lookup/             # Garment Tag / Barcode Scanner & Lookup
│   │   └── page.tsx
│   ├── settings/               # Business Settings, Taxes & Gateway Config
│   │   └── page.tsx
│   └── t/                      # Public Order Tracking Portal
│       └── [id]/
│           └── page.tsx
├── components/
│   └── layout/
│       ├── Sidebar.tsx         # Desktop Navigation Panel
│       ├── MobileNav.tsx       # Responsive Bottom/Drawer Navigation
│       ├── TopBar.tsx          # Store Selector, Quick Notifications, Profile
│       └── RouteGuard.tsx      # Auth Protection Wrapper
├── lib/
│   ├── db.ts                   # Client IndexedDB Data Access Layer
│   └── notifications.ts        # Direct & Fallback WhatsApp API Handlers
├── store/
│   ├── authStore.ts            # Current Logged-in User & Store Context
│   ├── customerStore.ts        # Customer State & Actions
│   ├── orderStore.ts           # Order List & Filter State
│   └── settingsStore.ts        # Company Details & Gateway Configuration
└── types/
    └── index.ts                # TypeScript Interfaces & Models
```

---

## 📝 Frontend Step-by-Step Text Steps

### Step 1: Initial Application Load & Authentication
1. **Root Layout Navigation**:
   - `src/app/layout.tsx` wraps all pages inside `<RouteGuard>`.
   - `<RouteGuard>` checks `authStore.ts` for an authenticated session.
   - If not authenticated, redirects automatically to `/login`.
2. **Login Process**:
   - User inputs Username & Password on `/login`.
   - On submission, `authStore` stores login state locally and redirects to `/dashboard`.

---

### Step 2: Dashboard Overview (`/dashboard`)
1. **Metrics Summary**:
   - Displays real-time KPIs: Today's Orders, Pending Collections, Revenue Today, Ready for Pickup count.
2. **Quick Actions**:
   - One-click buttons to create a new order, lookup a garment tag, or view pending invoices.
3. **Recent Activity Table**:
   - Lists recent orders with status badges (`Pending`, `In Progress`, `Ready`, `Delivered`).

---

### Step 3: Customer Management (`/customers`)
1. **Add/Edit Customer**:
   - Form fields: Name, Phone Number, Email, Address, GST/Tax ID, Notes.
   - Calls `customerStore` actions (`addCustomer`, `updateCustomer`).
2. **Search & Filter**:
   - Instant search by Customer Name or Mobile Number.
3. **Customer Details & Order History**:
   - Clicking a customer expands their profile, showing total orders, total expenditure, and outstanding balance.

---

### Step 4: Order Creation & Garment Tagging (`/orders`)
1. **Customer Selection**:
   - Select existing customer from quick search dropdown or add a new customer inline.
2. **Garment & Service Selection**:
   - Add items (e.g., Shirt, Trousers, Suit, Blanket, Curtain).
   - Select service type per item:
     - Wash & Fold
     - Wash & Iron
     - Dry Clean
     - Premium Steam Iron
3. **Automatic Price & Tax Calculation**:
   - Dynamic formula:
     $$\text{Subtotal} = \sum (\text{Qty} \times \text{Item Price})$$
     $$\text{Total Tax} = \text{Subtotal} \times \left(\frac{\text{GST Rate}}{100}\right)$$
     $$\text{Grand Total} = \text{Subtotal} + \text{Tax} - \text{Discount}$$
4. **Order Finalization**:
   - Submit order -> Automatically saved into IndexedDB via `db.ts`.
5. **Garment Tag & Receipt Generation**:
   - `JsBarcode` renders barcode on garment tags with format `ORD-YYYYMMDD-XXX`.
   - `qrcode` generates a scannable URL pointing to `/t/[orderId]`.

---

### Step 5: Invoicing & WhatsApp Messaging (`/invoices`)
1. **Invoice Listing**:
   - View all invoices filtered by status (`Paid`, `Unpaid`, `Overdue`).
2. **Receipt & PDF Generation**:
   - Uses `html2canvas` and `jspdf` to convert the invoice DOM element into a crisp PDF binary.
3. **Sending WhatsApp Notifications**:
   - Clicking **Send WhatsApp** triggers `sendWhatsAppDirect` in `src/lib/notifications.ts`.
   - Checks if `whatsappGatewayUrl` is configured in `settingsStore`.
   - If gateway exists, sends JSON payload containing recipient number, message body, and Base64 PDF attachment.

---

### Step 6: Tag Scanner & Quick Lookup (`/tag-lookup`)
1. **Barcode / Manual Search**:
   - Input barcode number or scan directly via webcam/handheld scanner.
2. **Instant Status Action**:
   - Displays garment breakdown and current status.
   - Staff can change status directly (e.g., mark as `Ready for Pickup` or `Delivered`).

---

### Step 7: Public Tracking Portal (`/t/[id]`)
1. **Customer Experience**:
   - Lightweight, mobile-friendly landing page accessible via QR code or direct link.
2. **Live Status Pipeline**:
   - Shows step-by-step progress visualizer:
     `Order Received` ➔ `Washing/Processing` ➔ `Ready for Pickup` ➔ `Delivered`
3. **Invoice Download**:
   - Customer can view breakdown and download receipt without requiring login.

---

## 🏬 State Management (Zustand Stores)

- **`authStore.ts`**: Holds active user, user role (`admin`, `staff`), and active branch/store location.
- **`orderStore.ts`**: Holds list of active orders, selected filters, search terms, and current active order state.
- **`customerStore.ts`**: Customer registry, recent orders by customer, and customer balance info.
- **`settingsStore.ts`**: Business details (Store Name, Phone, Address, GSTIN, WhatsApp Gateway URL).

---

## 🎨 UI & Styling Customization

- Custom themes defined in `src/app/globals.css`.
- Uses modern CSS variables for primary accent colors, card glassmorphism, table borders, and responsive breakpoints.
- Supports dark mode and high-contrast thermal printer styling for receipts.
