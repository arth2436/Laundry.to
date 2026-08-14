# ⚙️ Backend & Services Documentation & Text Steps

This document details the **Backend Architecture**, local database layer (`src/lib/db.ts`), and the **WhatsApp Gateway Microservice** (`whatsapp-gateway/server.js`).

---

## 🏗️ Architecture Overview

The backend consists of two complementary layers:

1. **Client Data Storage Layer (`IndexedDB`)**:
   - High-performance, offline-first client database managed by `src/lib/db.ts`.
   - Stores all application entities: Customers, Orders, Invoices, Services, Store Settings, and User Credentials.
2. **WhatsApp Gateway Microservice (`Node.js + Express + whatsapp-web.js`)**:
   - Autonomous local HTTP server running on port `5000`.
   - Controls a headless Google Chrome instance via `whatsapp-web.js` to manage authentications, QR pairings, and message/PDF dispatches.
   - Optional auto-tunneling via `@ngrok/ngrok` to make the gateway accessible over the public internet.

---

## 🗄️ Database Layer (`src/lib/db.ts`)

### Data Collections & Schema Definitions

```typescript
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  name: string;          // e.g. "Shirt", "Suit", "Blanket"
  category: string;      // e.g. "Men", "Women", "Household"
  serviceType: string;   // e.g. "Wash & Iron", "Dry Clean"
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'Pending' | 'In Progress' | 'Ready for Pickup' | 'Delivered';
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  dueDate: string;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  whatsappGatewayUrl?: string; // e.g. http://localhost:5000/messages/chat
}
```

### IndexedDB Utility Methods (`src/lib/db.ts`)

- **`getOrders()`**: Fetches all cached orders.
- **`saveOrder(order)`**: Inserts or updates an order record.
- **`getCustomers()`**: Retrieves customer list sorted by creation date.
- **`saveCustomer(customer)`**: Adds or edits customer records.
- **`getSettings()` / `saveSettings(settings)`**: Persists company configuration and gateway endpoint URLs.

---

## 📲 WhatsApp Gateway Microservice (`whatsapp-gateway`)

### Components
- `server.js`: Express web server and `whatsapp-web.js` client listener.
- `ngrok-config.json`: Configuration for public internet tunneling.
- `start-public.bat` & `start-whatsapp-gateway.bat`: One-click startup scripts.

---

## 📝 Backend Step-by-Step Text Steps

### Step 1: Initializing the Express Gateway Server
1. When `node server.js` is executed:
   - Express server binds to port `5000`.
   - Body parsers with `50mb` limit are initialized to accept Base64 PDF payloads.
   - CORS is enabled for cross-origin requests from Next.js.

### Step 2: Auto-Tunnel Setup (Optional Remote Access)
1. Server checks for `ngrok-config.json`.
2. If `authToken` is present:
   - Initializes `@ngrok/ngrok` listener forwarding port `5000`.
   - Generates a public HTTPS URL (e.g. `https://xyz.ngrok-free.app`).
   - Saves the public endpoint to `current-public-url.txt` for easy reference.
3. If no token is configured, falls back silently to `http://localhost:5000`.

### Step 3: Launching Headless Chrome & WhatsApp Web Client
1. Initializes `whatsapp-web.js` `Client` using `LocalAuth` strategy (`whatsapp_sessions/` directory).
2. Spawns Chrome executable at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
3. Handles event hooks:
   - `qr`: Emits QR code as Base64 Data URL for pairing.
   - `ready`: Marks status as `Connected` and logs the logged-in mobile number.
   - `authenticated`: Confirms active session lock.
   - `disconnected`: Automatically attempts session cleanup and re-initialization after 5 seconds.

---

## 📡 API Endpoint Reference

### 1. `GET /status`
Check gateway connectivity status and retrieve active QR code.

- **Response `200 OK`**:
```json
{
  "status": "Scanning" | "Connected" | "Initializing" | "Disconnected",
  "qr": "data:image/png;base64,...",
  "number": "919876543210",
  "publicUrl": "https://xyz.ngrok-free.app/messages/chat"
}
```

---

### 2. `POST /messages/chat`
Send text messages and/or PDF invoices directly to a WhatsApp number.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "to": "9876543210",
  "body": "Hello! Your laundry order #ORD-20260813-001 is Ready for Pickup.",
  "pdf": "JVBERi0xLj... (Base64 string optional)",
  "pdfName": "Invoice-ORD-20260813-001.pdf"
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Message sent successfully."
}
```

- **Error Responses**:
  - `400 Bad Request`: Missing mandatory parameters (`to` or content).
  - `503 Service Unavailable`: WhatsApp client not connected (QR scan needed).
  - `500 Internal Server Error`: Puppeteer / WhatsApp Web sending failure.

---

### 3. `POST /disconnect`
Log out active WhatsApp session.

- **Response `200 OK`**:
```json
{
  "success": true
}
```

---

## 🔒 Process Safety & Resilience

- **Unhandled Exception Catching**:
  `process.on('uncaughtException')` and `process.on('unhandledRejection')` prevent gateway crashes during network drops or Chrome reloads.
- **Lock File Cleanup**:
  If Puppeteer terminates unexpectedly, the gateway clears `SingletonLock` inside `whatsapp_sessions/` before retrying connection automatically.
