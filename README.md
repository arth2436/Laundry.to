# 🧺 Laundry & Dry Cleaning Management System

A modern, full-stack Laundry & Dry Cleaning Management Application built with **Next.js 16 (App Router)**, **React 19**, **Zustand**, **IndexedDB (Dexie.js)**, and a **Local Node.js + Express + WhatsApp Gateway Service**.

---

## 📋 Table of Contents
- [Architecture Overview](#architecture-overview)
- [System Workflow](#system-workflow)
- [Project Documentation](#project-documentation)
  - [Frontend Guide & Text Steps](README_FRONTEND.md)
  - [Backend & WhatsApp Gateway Guide & Text Steps](README_BACKEND.md)
- [Quick Start & Setup](#quick-start--setup)
- [Environment & Gateway Setup](#environment--gateway-setup)
- [Features Checklist](#features-checklist)

---

## 🏗️ Architecture Overview

The system is designed with a decoupled offline-first architecture:

```
                  ┌─────────────────────────────────────────┐
                  │          Next.js Frontend App           │
                  │   (App Router, React 19, Zustand)      │
                  └────────────────────┬────────────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  │                                         │
                  ▼                                         ▼
      ┌──────────────────────┐                  ┌──────────────────────┐
      │   Client Database    │                  │   WhatsApp Gateway   │
      │ (IndexedDB via db.ts)│                  │ (Express + wweb.js)  │
      └──────────────────────┘                  └──────────┬───────────┘
                                                           │
                                                ┌──────────┴───────────┐
                                                │   ngrok / Public     │
                                                │   Tunnel Endpoint    │
                                                └──────────────────────┘
```

1. **Frontend App (`laundry-app` / root)**:
   - Built with Next.js 16 App Router & TypeScript.
   - Client-side state managed via Zustand.
   - Offline-capable local data persistence using IndexedDB (`src/lib/db.ts`).
   - Dynamic invoice printing, barcode tag generation (`JsBarcode`), QR codes (`qrcode`), and PDF generation (`html2canvas` + `jspdf`).

2. **Backend & Microservices**:
   - **Local Storage Layer**: IndexedDB database for storing Customers, Orders, Invoices, Services, and Company Settings.
   - **WhatsApp Gateway (`whatsapp-gateway`)**: Node.js/Express service utilizing `whatsapp-web.js` with headless Chrome to automatically dispatch text messages and PDF invoices to customer WhatsApp numbers. Supports automatic ngrok tunneling for remote access.

---

## 🔄 System Workflow

### 1. Customer Management Workflow
1. Navigate to **Customers** (`/customers`).
2. Register new customer with Mobile Number, Name, Address, and preferences.
3. System assigns unique Customer IDs and tracks order history, total spent, and active balance.

### 2. Order Creation & Tagging Workflow
1. Open **New Order** interface from Dashboard (`/dashboard`) or Orders (`/orders`).
2. Select existing customer or quick-add a new customer.
3. Select garment items and services (e.g., Wash & Fold, Dry Clean, Steam Iron).
4. System automatically computes subtotal, discounts, tax, and total amount.
5. Save order -> System generates unique **Order Tag ID** and **QR Code**.
6. Print garment tags and receipt using built-in printer templates.

### 3. Order Processing & Status Tracking
1. Garments move through status stages: `Received` ➔ `In Progress` ➔ `Ready for Pickup` ➔ `Delivered`.
2. Updating status to **Ready for Pickup** automatically triggers optional WhatsApp notification with receipt URL.
3. Staff can use **Tag Lookup** (`/tag-lookup`) to scan or type a tag barcode for instant order status lookup.

### 4. Invoice & Payment Settlement Workflow
1. Access **Invoices** (`/invoices`).
2. View detailed billing breakdown, payment status (`Unpaid`, `Partial`, `Paid`), and payment methods (`Cash`, `UPI`, `Card`).
3. Click **Send WhatsApp** to attach and dispatch a auto-generated PDF invoice directly to the customer's phone.
4. Customers can track live status via public link (`/t/[orderId]`).

---

## 📖 Project Documentation

Detailed step-by-step guides for developers and operators:

- 🎨 **[Frontend Documentation & Text Steps](file:///c:/Users/vijay/Desktop/Laundry/README_FRONTEND.md)**
  - Page routes & structure
  - Zustand stores breakdown
  - Printing, PDF, and Tag Barcode rendering
  - UI components and responsive layout

- ⚙️ **[Backend & WhatsApp Gateway Documentation & Text Steps](file:///c:/Users/vijay/Desktop/Laundry/README_BACKEND.md)**
  - IndexedDB data models & schema
  - WhatsApp Gateway server configuration (`server.js`)
  - Running ngrok public tunnels
  - Direct API endpoint contracts (`/status`, `/messages/chat`, `/disconnect`)

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js v18 or higher
- Google Chrome browser (for WhatsApp Web automation)

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install WhatsApp Gateway dependencies
cd whatsapp-gateway
npm install
cd ..
```

### 2. Running the Frontend Development Server

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Running the WhatsApp Gateway

**Option A: Using the Windows Batch Script**
Double-click `start-whatsapp-gateway.bat` in the root folder.

**Option B: Manual Terminal Launch**
```bash
cd whatsapp-gateway
npm start
```
The gateway runs on `http://localhost:5000`. Scan the generated QR code in your terminal or browser to pair your WhatsApp device.

---

## 🛠️ Environment & Gateway Setup

To enable automated WhatsApp messaging from the app:

1. Launch the WhatsApp Gateway service.
2. Pair your WhatsApp number by scanning the QR code displayed on startup.
3. Open **Settings** (`/settings`) in the Laundry App.
4. Set **WhatsApp Gateway URL** to:
   - Local mode: `http://localhost:5000/messages/chat`
   - Public ngrok mode: `https://<your-ngrok-domain>.ngrok-free.app/messages/chat`
5. Test sending an invoice to confirm delivery.

---

## 📑 License & Notice

Private & Confidential - Laundry & Dry Cleaning Management System.
