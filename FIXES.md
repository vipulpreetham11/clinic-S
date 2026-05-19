# ClinicOS Fix Log

All changes made during the audit + full-fix session.

---

## 1. Infinite Loading — AuthContext.tsx

**File:** `clinic-crm/src/context/AuthContext.tsx`

**Root cause:** Dual auth initialization (`getSession()` + `onAuthStateChange`) created a race condition where the loading state was sometimes never cleared — particularly on network errors or slow connections.

**Fix:**
- Removed the initial `getSession()` call entirely
- Switched to `onAuthStateChange`-only initialization (Supabase v2 fires `INITIAL_SESSION` automatically on subscribe)
- Added `useRef` mount guard (`activeRef`) to prevent state updates after component unmount
- Wrapped profile fetch in `try/finally` so `setIsLoading(false)` always fires even on error
- Added 8-second timeout safety net that clears loading and shows a toast if auth never resolves

```ts
// Before — race condition:
const { data: { session } } = await supabase.auth.getSession()
if (session) { ... }
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session) { await fetchProfileAndClinic(session.user.id) }
  setIsLoading(false) // ← not guaranteed on error
})

// After — single subscription, always resolves:
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event, session) => {
    if (!activeRef.current) return
    clearTimeout(timeoutId)
    if (session?.user) {
      try { await fetchProfileAndClinic(session.user.id) }
      finally { if (activeRef.current) setIsLoading(false) }
    } else {
      clearSession()
      setIsLoading(false)
    }
  }
)
```

---

## 2. Column Mismatch — specialty → specialization

**File:** `clinic-crm/src/types/consultation.ts`

**Root cause:** DB doctors table uses `specialization` column but TypeScript types referenced `specialty`.

**Fix (line 52):**
```ts
// Before:
doctor?: { name: string; specialty?: string }
// After:
doctor?: { name: string; specialization?: string }
```

**Fix (line 66):** Removed duplicate `specialty?: string` from local Doctor type; kept `specialization?: string`.

---

## 3. Routing Fixes

**File:** `clinic-crm/src/App.tsx`

**Changes:**
- Added missing `/doctor/leaves` route (redirects to `/doctor/schedule`)
- Fixed catch-all: `<Navigate to="/" replace />` → `<Navigate to="/login" replace />`
- Added `case 'clinic_admin':` alias in `RootRedirect` (maps to `/admin`)

```tsx
// Added:
<Route path="/doctor/leaves" element={<Navigate to="/doctor/schedule" replace />} />

// Changed:
<Route path="*" element={<Navigate to="/login" replace />} />

// Added alias in RootRedirect:
case 'clinic_admin':
  return <Navigate to="/admin" replace />
```

---

## 4. UI Overhaul

### 4a. Color Scheme — index.css

**File:** `clinic-crm/src/index.css`

Applied teal-600 as primary and dark slate for sidebar using OKLCH color space (Shadcn v2 convention):

```css
--primary: oklch(0.600 0.118 184);        /* teal-600 #0d9488 */
--primary-foreground: oklch(0.984 0 0);   /* white */
--background: oklch(0.984 0.003 247);     /* slate-50 */
--border: oklch(0.908 0.013 255);         /* slate-200 */
--ring: oklch(0.600 0.118 184);           /* teal-600 */
--sidebar: oklch(0.131 0.027 256);        /* #0f172a dark sidebar */
--sidebar-accent: oklch(0.213 0.027 256); /* slate-800 hover */
```

### 4b. Sidebar — Sidebar.tsx

**File:** `clinic-crm/src/components/layout/Sidebar.tsx`

- Outer bg: `bg-[#0f172a]` (dark navy)
- Fixed width: `w-60 flex-none min-h-screen`
- Logo: teal-600 icon container, white clinic name, slate-400 subtitle
- Active nav item: `bg-teal-600 text-white rounded-lg`
- Hover: `hover:bg-slate-800 hover:text-white`
- Added Doctor Dashboard link at `/doctor`
- Fixed super_admin nav links (were missing)
- Mobile bottom nav: dark bg `bg-[#0f172a]`, active `text-teal-400`

### 4c. Layout — Layout.tsx

**File:** `clinic-crm/src/components/layout/Layout.tsx`

Simplified to standard two-column flex layout:
```tsx
<div className="flex min-h-screen bg-slate-50">
  <Sidebar />
  <div className="flex-1 flex flex-col min-w-0 md:pb-0 pb-20">
    <Header />
    <main className="flex-1 p-6"><Outlet /></main>
  </div>
</div>
```

### 4d. Header — Header.tsx

**File:** `clinic-crm/src/components/layout/Header.tsx`

- Fixed height: `h-[60px]`
- White bg + `border-b border-slate-200`
- `getPageTitle(pathname)` — maps routes to human-readable page titles
- Bell notification button (right side)
- Avatar with teal-100/teal-700 fallback, supports AvatarImage
- Logout option styled `text-red-600` in dropdown

### 4e. Loading States

**File:** `clinic-crm/src/components/layout/ProtectedRoute.tsx`
- Removed `LoadingSpinner` dependency (was broken import)
- New loading screen: HeartPulse icon with `animate-pulse` in teal-600 container + "Loading ClinicOS…" text

**File:** `clinic-crm/src/pages/admin/Dashboard.tsx`
- Removed `Loader2` spinner
- Added `DashboardSkeleton` component with realistic skeleton layout for header, 4 stat cards, main panels, and activity feed

**File:** `clinic-crm/src/pages/ReceptionistDashboard.tsx`
- Removed `Loader2` spinner
- Added Skeleton blocks matching dashboard layout

---

## 5. TypeScript Errors Fixed

### InvoiceForm.tsx (line 172)

**File:** `clinic-crm/src/components/invoices/InvoiceForm.tsx`

`onValueChange` in this Shadcn version emits `string | null` but `setAppointmentId` expects `string`.

```tsx
// Before:
onValueChange={(value) => setAppointmentId(value === 'none' ? '' : value)}
// After:
onValueChange={(value) => setAppointmentId(value === 'none' ? '' : (value ?? ''))}
```

### Invoices.tsx (line 119)

**File:** `clinic-crm/src/pages/invoices/Invoices.tsx`

Same root cause — `setDoctorId` expects `string` but `value` is `string | null`.

```tsx
// Before:
onValueChange={(value) => { setDoctorId(value); setPage(1) }}
// After:
onValueChange={(value) => { setDoctorId(value ?? 'all'); setPage(1) }}
```

---

## 6. Hook Fix — useReminders.ts

**File:** `clinic-crm/src/hooks/useReminders.ts`

- **Line 17:** Supabase join queried non-existent `scheduled_at` column → `appointments(date, start_time, notes)`
- **Line 173:** `let convId` had implicit `any` type → `let convId: string | undefined`

---

## 7. SQL Consolidation — MASTER_SCHEMA.sql

**File:** `MASTER_SCHEMA.sql` (project root — new file)

Consolidated 13 separate SQL migration files (many with duplicate/conflicting definitions) into one authoritative schema file safe for a fresh Supabase setup.

**Issues fixed in SQL:**
- Added missing `doctor_leaves` table (queried by hooks but not in any migration)
- Added `services.category` column (referenced in frontend)
- Added extended `patients` columns: `blood_group`, `allergies`, `medical_history`
- Added extended `appointments` columns: `chief_complaint`, `vitals`, `consultation_notes`, `follow_up_date`
- Fixed `waitlist_triggers`: referenced non-existent columns (`appointment_date`, `time_slot`, `patient_id` in wrong table)
- Fixed WhatsApp RLS policies: referenced non-existent `profiles` table (correct table is `users`)
- Fixed trigger `scheduled_at` bug (column doesn't exist on appointments)
- Removed 7 duplicate table definitions across migration files
- Used `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` throughout
- `specialty` → `specialization` everywhere in SQL

---

## 8. Codebase Report — CODEBASE_REPORT.md

**File:** `CODEBASE_REPORT.md` (project root — new file)

Full audit report covering: file tree, module descriptions, all hooks/components, identified bugs, fixes applied, remaining known issues, and DB schema summary.

---

## Build Result

```
npm run build
✓ 4054 modules transformed.
✓ built in 2.64s
TypeScript errors: 0
```

Large chunk warnings are expected for a SaaS app with PDF rendering (`@react-pdf/renderer`) and are not errors.
