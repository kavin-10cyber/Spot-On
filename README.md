# SpotOn — Smart Digital Parking Management System

[![React Native](https://img.shields.io/badge/React_Native-0.86.2-blue?logo=react&logoColor=white)](https://reactnative.dev)
[![Vite](https://img.shields.io/badge/Admin_Web-Vite_+_React-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Backend-Supabase_PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Platform](https://img.shields.io/badge/Platform-Android_|_iOS_|_Web-lightgrey.svg)]()

> **SpotOn** is an end-to-end, real-time smart parking ecosystem designed to streamline urban parking for drivers, optimize lot ground operations for parking staff, and provide live oversight for parking administrators.

---

## 📌 Problem Statement

Rapid urbanization and escalating vehicle ownership have turned finding parking in commercial hubs, hospitals, malls, and public transit terminals into a daily challenge. 
Key pain points include:
- **Traffic Congestion & Fuel Wastage:** Drivers cruise aimlessly looking for open spaces, contributing to up to 30% of downtown traffic.
- **Lack of Real-Time Visibility:** Drivers cannot verify whether slots are free before arriving at their destination.
- **Manual, Paper-Based Gate Bottlenecks:** Traditional parking tickets are prone to loss, fraud, slow validation, and manual cash handling disputes.
- **Fragmented Management:** Lot owners lack centralized metrics on occupancy trends, peak usage hours, and revenue collection.

**SpotOn solves these challenges** by integrating real-time PostgreSQL database synchronization, Leaflet/OpenStreetMap geospatial routing, instant QR-based pass verification, and automated slot status lifecycle management across three synchronized role-based workspaces.

---

## 🚀 Key Features by Role

### 1. 🚗 User / Driver Workspace
- **Interactive Geospatial Map:** Browse nearby parking locations with live distance calculation, hourly rates, and open capacity indicators.
- **Real-Time Slot Selection:** Visual parking layout grid displaying Live status (`AVAILABLE`, `OCCUPIED`, `RESERVED`).
- **Flexible Booking Flow:** Select in-time, out-time, vehicle details, and instant fee calculation with buffer allowances.
- **Secure Payments & SpotOn Wallet:** Mock payments via UPI, Credit/Debit Cards, Net Banking, or SpotOn Wallet.
- **Digital QR Parking Pass:** Dynamically generated QR code with booking code, vehicle number, and slot details.
- **Turn-by-Turn Navigation:** Live navigation directions embedded in an OpenStreetMap routing view.
- **Active & Past Bookings:** Real-time ticket history with countdown timers and status tracking.

### 2. 🛡️ Staff Operations Workspace
- **Fast QR Code & Plate Scanner:** Native camera integration (`react-native-camera-kit`) for instant entry/exit pass verification.
- **Time Window Validation:** Automated buffer verification ensuring vehicles only enter during valid booking windows.
- **One-Tap Check-In / Check-Out:** Updates slot status to `OCCUPIED` upon arrival and `AVAILABLE` upon departure in real time.
- **Walk-in Manual Registration:** Register walk-in drivers, automatically create guest reservations, and collect on-spot payments.
- **Slot Manual Override:** Visual slot reassignment for on-ground traffic management.

### 3. 📊 Administrator Workspace (Mobile & Web Portal)
- **Live Performance Dashboard:** Real-time metrics for Total Lots, Slots Configured, Current Occupancy %, Total Bookings, and Revenue collected.
- **Interactive Multi-Mode Bar Chart:** Visualizes weekly trends with instant switching between Occupancy %, Revenue, and Booking volume.
- **Slot Management Grid:** Filter and toggle individual slot states across facilities (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`).
- **Staff Directory & Shift Management:** View, register, and manage staff accounts and shift assignments.
- **Real-time Activity Audit Trail:** Live feed of entry/exit verification logs powered by Supabase Realtime subscriptions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Mobile App (Frontend)** | React Native 0.86.2, TypeScript, Vanilla Stylesheets, Vector Icons (Feather / Material) |
| **Admin Web (Frontend)** | React 18, Vite 5, React Router DOM, Lucide React, Modern CSS System |
| **Backend & Database** | Supabase (PostgreSQL), Row-Level Security (RLS), Supabase Auth |
| **Realtime Sync** | Supabase WebSockets (`postgres_changes` channel subscriptions) |
| **Maps & Geospatial** | Leaflet.js, OpenStreetMap (OSM) Tiles via `react-native-webview` |
| **Hardware / Native APIs** | Device GPS (`@react-native-community/geolocation`), Camera Kit (`react-native-camera-kit`), Async Storage |

---

## 📁 Project Architecture & Structure

```
SpotOn/
├── App.tsx                     # Main mobile orchestrator & workspace switcher
├── index.js                    # React Native entry point
├── app.json                    # Application metadata
├── package.json                # Mobile app dependencies
├── metro.config.js             # Metro bundler configuration
│
├── src/                        # React Native Source Code
│   ├── Component/              # Normalized PascalCase components
│   │   ├── Admin/              # Admin dashboard, slots, staff & tab bar
│   │   ├── Common/             # Shared components (WorkspaceSwitcher)
│   │   ├── Login/              # Role-based authentication screens
│   │   ├── Opening/            # Splash & onboarding presentation
│   │   ├── Staff/              # Staff scanner, manual booking, bookings list
│   │   └── User/               # Driver booking, search, pass, map & payment
│   ├── assets/                 # Consolidated images & illustrations
│   ├── config/                 # Supabase client configuration
│   └── services/               # Centralized services (auth, parking, staff, realtime, GPS)
│
├── admin-web/                  # Dedicated Web Portal for Administrators
│   ├── src/
│   │   ├── components/         # Sidebar, Topbar, Layout elements
│   │   ├── pages/              # Dashboard, Bookings, Slot & Staff Management
│   │   └── config/             # Supabase web configuration
│   ├── package.json            # Web app dependencies (Vite)
│   └── index.html              # Web entry HTML
│
└── android/ & ios/             # Native Android and iOS projects
```

---

## 💻 Setup & Installation Instructions

### Prerequisites
- **Node.js**: `>= 22.11.0`
- **JDK**: Java 17 (for Android builds)
- **Android Studio** & Android SDK (API 34/35) or physical Android device with USB Debugging enabled

---

### 1. Clone the Repository
```bash
git clone https://github.com/Mithun-rs/SpotOn.git
cd SpotOn
```

---

### 2. Run the Mobile Application (Android)

#### Step 2.1: Install Dependencies
```bash
npm install
```

#### Step 2.2: Start Metro Packager
```bash
npm start
```

#### Step 2.3: Build & Install on Android Device / Emulator
In a separate terminal:
```bash
npm run android
```

*Alternatively, compile a standalone production offline bundle:*
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output ./android/app/src/main/assets/index.android.bundle --assets-dest ./android/app/src/main/res/
```

---

### 3. Run the Admin Web Portal

#### Step 3.1: Navigate to Web Directory & Install Dependencies
```bash
cd admin-web
npm install
```

#### Step 3.2: Start the Vite Dev Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to access the Admin Web Console.

---

## 🔐 Credentials & Demo Logins

| Portal / Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin Portal** | `admin@spoton.in` | `admin123` | Full admin privileges (Locations, Slots, Staff, Analytics) |
| **Staff Portal** | `vikram@spoton.in` | `staff123` | Gate scanner, check-in/out, walk-in reservations |
| **Driver / User** | `aarav.sharma@spoton.in` | `user123` | Slot reservation, live pass, map navigation |

---

## 📄 License
This project is developed for educational and portfolio demonstration purposes.
