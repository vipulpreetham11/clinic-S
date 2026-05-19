# CODEBASE_LOGIC.md — ClinicOS Full Codebase Documentation

> Generated: 2026-05-19. Reflects the state after all audit fixes applied.

---

## Stack Overview

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript + Vite |
| Routing | React Router v6 |
| Data Fetching | TanStack Query v5 |
| Backend / DB | Supabase (PostgreSQL + Realtime + Auth) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| PDF Generation | @react-pdf/renderer |
| Dates | date-fns |
| Toast | sonner |

---

## Roles & Access

| Role | DB value | Home route | Description |
|---|---|---|---|
| Super Admin | `super_admin` | `/super-admin` | Platform-level admin, sees all clinics |
| Clinic Admin | `admin` | `/dashboard` | Full admin for one clinic |
| Receptionist | `receptionist` | `/receptionist` | Books/manages appointments |
| Doctor | `doctor` | `/doctor` | Views own schedule & patients |

**Note:** `clinic_admin` is a legacy term. The DB only stores `admin`. The `isAdmin` computed flag equals `role === 'admin' || role === 'clinic_admin'` for backward compat, but `isRole('admin', 'clinic_admin')` is the correct check.

---

## Module 1 — Auth (`src/context/AuthContext.tsx`)

**What it does:** Central auth state for the entire app. Manages Supabase session, user profile from `users` table, clinic data, and role-based helpers.

**State managed:**
- `user` — Supabase auth user object
- `profile` — row from `users` table (name, email, role, is_active, etc.)
- `clinic` — row from `clinics` table for the user's clinic_id
- `role` — `users.role` string
- `isLoading` — true while session is being resolved on mount

**Key logic:**
- On mount: calls `supabase.auth.getSession()` → fetches profile → fetches clinic → sets state → `isLoading = false`
- 10-second safety timeout prevents infinite loading screen
- `INITIAL_SESSION` event from `onAuthStateChange` is ignored (handled by `getSession`)
- `TOKEN_REFRESHED` event ignored (session renews silently, profile already loaded)
- `login()` sets `activeProfileId.current` before SIGNED_IN fires to prevent duplicate profile fetch
- `logout()` calls `supabase.auth.signOut()` then hard-navigates to `/login` via `window.location.href`
- `refreshClinic()` re-fetches profile + clinic for the current user
- `applyClinicTheme(color)` converts clinic's primary hex color to HSL and sets CSS variable `--primary`
- `isRole(...roles)` returns `roles.includes(role)` — varargs, so `isRole('admin', 'receptionist')` works
- `isAdmin = role === 'admin' || role === 'clinic_admin'` (backward compat shim)
- Updates `users.last_login` on every successful login

**Files:** `src/context/AuthContext.tsx`

---

## Module 2 — Routing (`src/App.tsx`)

**What it does:** Defines all client-side routes, wraps them in React Query provider and BrowserRouter, guards routes by role.

**Route structure:**
- `/login` — public
- `/` → `RootRedirect` → redirects to role-specific home
- `/super-admin/**` — requires `super_admin`
- `/admin/**`, `/settings`, `/doctors/new`, `/doctors/:id`, `/services/**`, `/invoices/**` — requires `admin` or `clinic_admin`
- `/analytics` — requires `super_admin | admin | clinic_admin`
- `/dashboard`, `/receptionist`, `/appointments/**`, `/doctors`, `/doctors/:id/schedule`, `/patients/**`, `/reminders`, `/waitlist`, `/conversations`, `/whatsapp/settings` — requires `admin | clinic_admin | receptionist`
- `/doctor/**` — requires `doctor`

**Key components:**
- `ProtectedRoute` — checks `user && profile`, then role. Redirects unauthorized to `ROLE_HOME[role]`
- `RoleDashboard` — renders `AdminDashboard` if `isAdmin`, else `ReceptionistDashboard`
- `LoadingScreen` — shown while `isLoading` is true
- `ROLE_HOME` map: `{ super_admin: '/super-admin', admin: '/dashboard', clinic_admin: '/dashboard', doctor: '/doctor', receptionist: '/receptionist' }`

**React Query config:** `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false`, `refetchOnMount: false`, `retry: 1`

**Files:** `src/App.tsx`, `src/components/layout/ProtectedRoute.tsx`

---

## Module 3 — Layout (`src/components/layout/`)

**What it does:** Persistent shell wrapping all protected pages. Contains sidebar navigation and top header.

**Components:**
- `Layout` — Outlet wrapper; renders sidebar + header + `<Outlet />`
- `Sidebar` — role-aware nav links. Super admin sees clinic management; admin sees full menu; receptionist sees subset; doctor sees doctor portal only
- `Header` — clinic name, user avatar, logout button

**Files:** `src/components/layout/Layout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Header.tsx`

---

## Module 4 — Super Admin (`src/pages/super-admin/`, `src/api/superAdmin.ts`)

**What it does:** Platform-level management — view all clinics, create clinics, manage clinic status, view platform stats.

**Pages:**
- `Dashboard` — platform-wide KPI cards (total clinics, active clinics, appointments today/month, total patients/doctors/admins/receptionists, new clinics this month) + appointments trend chart (30 days)
- `Clinics` — searchable, filterable list of all clinics with per-clinic stats (appointments today, total patients, doctors, users, last activity)
- `CreateClinic` — form to create a new clinic (name, slug, color, address, hours, working days) + optionally create an admin user for it
- `ClinicDetail` — tabbed view of a single clinic: overview stats, users, doctors, patients, recent appointments + ability to change clinic status / toggle user active

**API functions (`src/api/superAdmin.ts`):**
- `getAllClinicsWithStats()` — fetches all clinics then for each clinic runs 5 parallel queries (total appointments, today's appointments, patients, active doctors, last user login)
- `getPlatformStats()` — 9 parallel count queries across all tables
- `createClinic(input)` — slug uniqueness check → insert clinic → insert notification_settings row (atomic rollback on failure)
- `createClinicAdmin(input)` — supabase.auth.signUp → insert users row
- `updateClinicStatus(clinicId, status, reason)` — updates clinic.status + logs to audit_logs
- `deleteClinic(clinicId)` — hard delete (cascades in DB)
- `getAppointmentsTrend(clinicId?)` — last 30 days appointments grouped by date
- `getClinicUsers/Doctors/Patients/RecentAppointments(clinicId)` — per-clinic data for ClinicDetail tabs
- `toggleUserActive(userId, isActive)` — enable/disable a user
- `updateClinicInfo(clinicId, data)` — partial update of clinic fields

**Files:** `src/pages/super-admin/Dashboard.tsx`, `src/pages/super-admin/Clinics.tsx`, `src/pages/super-admin/CreateClinic.tsx`, `src/pages/super-admin/ClinicDetail.tsx`, `src/api/superAdmin.ts`

---

## Module 5 — Appointments (`src/pages/appointments/`, `src/api/appointments.ts`, `src/hooks/useAppointments.ts`)

**What it does:** Core appointment CRUD — list, create, view detail, update status, reschedule, notes.

**Pages:**
- `AppointmentList` — paginated, filterable list (date range, doctor, status, source, search). Table + calendar view toggle. Each row links to `AppointmentDetail` sheet.
- `NewAppointment` — multi-step form: select patient (search or create) → select doctor → select service → pick date → pick time slot. Creates appointment in DB.
- `AppointmentDetail` — rendered as a `<Sheet>` (slide-in) on route `/appointments/:id`. Shows patient info, appointment details, status action buttons, notes editor, quick actions (WhatsApp reminder, Generate Invoice, Print).

**Status flow:** `pending` → `confirmed` → `completed` | `no_show` | `cancelled`. Any non-final → `rescheduled`. `rescheduled` → `confirmed` → `completed`.

**API functions (`src/api/appointments.ts`):**
- `getAppointments(filters)` — paginated query with joins: patients, doctors, services, booked_by_user. Normalizes joined arrays to objects (`item.patients → patient`)
- `getAppointmentById(id)` — single appointment with full joins including doctor breaks
- `createAppointment(input)` — insert + return with joins
- `updateAppointmentStatus(id, status, extra?)` — updates status + optional fields (cancellation_reason, follow_up_date, completed_at, etc.)
- `rescheduleAppointment(id, date, startTime, endTime)` — sets date/start_time/end_time + status = 'rescheduled'
- `updateAppointmentNotes(id, notes)` — updates notes field
- `getBookedSlots(clinicId, doctorId, date)` — returns time slots with status in `[pending, confirmed, rescheduled]` for slot conflict checking
- `deleteAppointment(id)` — hard delete

**Hooks (`src/hooks/useAppointments.ts`):** TanStack Query wrappers for all API functions. Mutations invalidate `['appointments']` cache. `useAppointment(id)` for single fetch.

**Files:** `src/pages/appointments/AppointmentList.tsx`, `src/pages/appointments/NewAppointment.tsx`, `src/pages/appointments/AppointmentDetail.tsx`, `src/api/appointments.ts`, `src/hooks/useAppointments.ts`

---

## Module 6 — Slot Generator (`src/lib/slotGenerator.ts`)

**What it does:** Pure function that generates available time slots for a doctor on a given date.

**Logic:** Takes `arrival_time`, `departure_time`, `slot_duration` (minutes), `breaks[]`, `existingAppointments[]`, `blockedDates[]`. Iterates from arrival to departure in slot_duration increments. Marks a slot unavailable if it overlaps a break or an existing appointment (pending/confirmed/rescheduled).

**Used by:** `SlotPicker` component in NewAppointment and AppointmentDetail reschedule flow.

**Files:** `src/lib/slotGenerator.ts`, `src/components/appointments/SlotPicker.tsx`

---

## Module 7 — Doctors (`src/pages/doctors/`, `src/api/doctors.ts`, `src/hooks/useDoctors.ts`)

**What it does:** Doctor management — list, create, edit, schedule/availability management.

**Pages:**
- `DoctorList` — list of all clinic doctors, search by name/specialization. Each row links to schedule or edit.
- `DoctorForm` — create/edit doctor. Fields: name, specialization, qualification, phone, photo, working days, arrival/departure time, slot duration, max appointments per day, breaks. Edit-only for admin/clinic_admin.
- `DoctorSchedule` — per-doctor schedule page. Tabs: Calendar (DoctorScheduleCalendar), Leaves (add/delete leave ranges), Breaks (add/delete time blocks).

**Components:**
- `DoctorScheduleCalendar` — Calendar with colored day modifiers (working/non-working/leave/blocked/hasAppointments). Right panel shows selected day's appointments + block/unblock controls. Admin-only block/unblock, but doctors can view.

**API functions (`src/api/doctors.ts`):** CRUD for doctors, doctor_breaks, doctor_leaves, blocked_dates. `getDoctorsByClinic`, `getDoctorWithServices`, `upsertDoctor`, `deleteDoctorBreak`, `addDoctorLeave`, `deleteDoctorLeave`, `addBlockedDate`, `deleteBlockedDate`, `getDoctorAppointmentsByMonth`, `getDoctorBlockedDates`, `getDoctorLeaves`.

**Files:** `src/pages/doctors/DoctorList.tsx`, `src/pages/doctors/DoctorForm.tsx`, `src/pages/doctors/DoctorSchedule.tsx`, `src/components/doctors/DoctorScheduleCalendar.tsx`, `src/api/doctors.ts`, `src/hooks/useDoctors.ts`

---

## Module 8 — Doctor Portal (`src/pages/doctor-portal/`, `src/hooks/useDoctorContext.ts`)

**What it does:** Separate view for logged-in doctors. Shows their own schedule, queue, and patients.

**Pages:**
- `DoctorDashboard` — KPI cards (total/completed/pending today), today's queue (TodayQueue component), next patient preview. "Start Consultation" opens ConsultationModal. "View History" navigates to `/patients/:id`.
- `MySchedule` — same TodayQueue view + ConsultationModal, without KPI cards.
- `MyPatients` — table of all patients seen by this doctor (via useMyPatients hook), searchable. "View" navigates to `/patients/:id`.
- `DoctorProfile` — read-only view of doctor's profile data.

**Key hooks:**
- `useDoctorContext` — fetches doctor row from `doctors` table by `user_id = auth.user.id`. Provides doctor profile to all doctor portal pages.
- `useTodayQueue` — fetches today's appointments for the doctor with statuses `[pending, confirmed, rescheduled]`. Includes Supabase realtime subscription for live updates.
- `useMyPatients` — fetches distinct patients seen by this doctor via completed appointments.

**Components:**
- `TodayQueue` — table of today's queued appointments with "Start Consultation" and "View History" buttons.
- `NextPatientPreview` — card showing next pending appointment.
- `ConsultationModal` — modal to record consultation notes and mark appointment complete.

**Files:** `src/pages/doctor-portal/DoctorDashboard.tsx`, `src/pages/doctor-portal/MySchedule.tsx`, `src/pages/doctor-portal/MyPatients.tsx`, `src/pages/doctor-portal/DoctorProfile.tsx`, `src/hooks/useDoctorContext.ts`, `src/hooks/useTodayQueue.ts`, `src/hooks/useMyPatients.ts`, `src/components/doctors/TodayQueue.tsx`, `src/components/doctors/ConsultationModal.tsx`

---

## Module 9 — Patients (`src/pages/patients/`, `src/api/patients.ts`)

**What it does:** Patient management — list, search, create, view detail.

**Pages:**
- `PatientList` — paginated searchable list of all clinic patients.
- `PatientDetail` — patient profile with history tabs: appointment history, invoices, notes.

**API:** `getPatients`, `getPatientById`, `createPatient`, `updatePatient`, `searchPatients`. All scoped by `clinic_id`.

**Files:** `src/pages/patients/PatientList.tsx`, `src/pages/patients/PatientDetail.tsx`, `src/api/patients.ts`, `src/hooks/usePatients.ts`

---

## Module 10 — Invoices (`src/pages/invoices/`, `src/api/invoices.ts`, `src/types/invoice.ts`)

**What it does:** Invoice generation, listing, editing, PDF download.

**Pages:**
- `Invoices` — list with filters (status, date range, patient search). Stats bar (total/paid/pending/draft amounts).
- `InvoiceFormPage` — create or edit invoice. Line items (service + qty + price), subtotal, discount (flat or percent), tax percent, payment method. Pre-fills from `appointmentId` query param if present.
- `InvoiceDetailPage` — read-only invoice view with PDF download (via @react-pdf/renderer).

**Types (`src/types/invoice.ts`):** `Invoice` (rich type with `total_amount`, `invoice_number`, `line_items`, `subtotal`, `discount_amount`, `discount_type`, `tax_percent`, `tax_amount`, `payment_method`). `InvoiceLineItem = { description, quantity, unit_price, total }`. Base `Invoice` in `types/index.ts` is a minimal stub — `RichInvoice` is the usable type.

**API:** `getInvoices`, `getInvoiceById`, `createInvoice`, `updateInvoice`, `deleteInvoice`. All scoped by `clinic_id`.

**Files:** `src/pages/invoices/Invoices.tsx`, `src/pages/invoices/InvoiceFormPage.tsx`, `src/pages/invoices/InvoiceDetailPage.tsx`, `src/api/invoices.ts`, `src/types/invoice.ts`, `src/hooks/useInvoices.ts`

---

## Module 11 — Services (`src/pages/services/`, `src/api/services.ts`)

**What it does:** Clinic service catalog — create, edit, delete services. Services are attached to doctors and used in appointments.

**Pages:**
- `ServiceList` — list of all services with name, category, duration, price, active status.
- `ServiceDetail` (src/pages/services/[id].tsx) — edit/create service form.

**Types:** `Service = { id, clinic_id, name, description, duration_minutes, price, category, is_active }`. Categories defined in `ServiceCategory` type.

**Files:** `src/pages/services/ServiceList.tsx`, `src/pages/services/[id].tsx`, `src/api/services.ts`, `src/hooks/useServices.ts`, `src/types/service.ts`

---

## Module 12 — Analytics (`src/pages/analytics/Analytics.tsx`)

**What it does:** Charts and KPIs for clinic performance. Admin + Super Admin only.

**Charts:**
- Appointments trend (line chart, 30 days)
- Status breakdown (pie chart — pending/confirmed/completed/cancelled)
- Top doctors by appointment count (bar chart)
- Revenue trend (bar chart, if invoices exist)

**Data source:** Supabase queries scoped to `clinic_id` (or all clinics for super admin).

**Files:** `src/pages/analytics/Analytics.tsx`, `src/hooks/useAnalytics.ts`

---

## Module 13 — Receptionist Dashboard (`src/pages/ReceptionistDashboard.tsx`, `src/api/receptionistDashboard.ts`)

**What it does:** Today's queue view for receptionists. KPI cards, today's appointment list by time slot, activity feed.

**Key API functions:**
- `getReceptionistDashboardData(clinicId)` — fetches today's appointments with joined patient/doctor/service
- `getActivityFeed(clinicId)` — last 30 days of events: appointment bookings, check-ins, completions, cancellations, no-shows, new patients, invoice generations. Returns sorted `ActivityFeedItem[]`.

**Files:** `src/pages/ReceptionistDashboard.tsx`, `src/api/receptionistDashboard.ts`, `src/hooks/useReceptionistDashboard.ts`

---

## Module 14 — Reminders (`src/pages/reminders/Reminders.tsx`)

**What it does:** Automated appointment reminder management. Shows pending/sent/failed reminders. Admin can configure reminder rules (24hr before, 1hr before, custom). Reminders sent via WhatsApp.

**Types:** `ReminderRule`, `ReminderQueue`, `ReminderLog` from `src/types/reminder.ts`.

**Files:** `src/pages/reminders/Reminders.tsx`, `src/api/reminders.ts`, `src/hooks/useReminders.ts`, `src/types/reminder.ts`

---

## Module 15 — Waitlist (`src/pages/waitlist/Waitlist.tsx`)

**What it does:** Manages patients waiting for a slot (e.g., cancelled appointment opens up). Patients can be notified when a slot becomes available.

**Types:** `WaitlistEntry`, `WaitlistNotification`, `WaitlistPriority`, `NotificationStatus` from `src/types/waitlist.ts`.

**Files:** `src/pages/waitlist/Waitlist.tsx`, `src/api/waitlist.ts`, `src/hooks/useWaitlist.ts`, `src/types/waitlist.ts`

---

## Module 16 — WhatsApp & Conversations (`src/pages/conversations/`, `src/pages/whatsapp/`)

**What it does:** WhatsApp integration — incoming messages, AI-assisted replies, conversation history, WhatsApp configuration.

**Pages:**
- `Conversations` — list of patient WhatsApp conversations with message thread view. Realtime updates via `useWhatsAppRealtime` hook.
- `WhatsAppSettings` — configure WhatsApp API credentials, AI settings, auto-reply templates.

**Key hook:** `useWhatsAppRealtime` — Supabase realtime subscription on `conversations` table for the clinic.

**Files:** `src/pages/conversations/Conversations.tsx`, `src/pages/whatsapp/WhatsAppSettings.tsx`, `src/hooks/useWhatsAppRealtime.ts`, `src/api/whatsapp.ts`

---

## Module 17 — Settings (`src/pages/settings/SettingsPage.tsx`, `src/api/settings.ts`)

**What it does:** Clinic-level settings management (admin only).

**Tabs:**
- General — clinic name, address, phone, email, working hours, working days, slot duration
- Notifications — WhatsApp reminder rules (24hr, 1hr, custom), enable/disable per channel
- Invoice — clinic GSTIN, invoice prefix, payment terms, footer text
- Branding — logo upload, primary color picker

**API:** `getClinicSettings`, `updateClinicSettings`, `updateNotificationSettings`, `updateInvoiceSettings`.

**Files:** `src/pages/settings/SettingsPage.tsx`, `src/pages/admin/Settings.tsx`, `src/api/settings.ts`, `src/hooks/useSettings.ts`, `src/types/settings.ts`

---

## Module 18 — Admin Setup Wizard (`src/pages/admin/SetupWizard.tsx`)

**What it does:** First-run wizard for new clinic admins. Steps: clinic info → working hours → add first doctor → add first service → done.

**Files:** `src/pages/admin/SetupWizard.tsx`

---

## DB Schema Summary (key tables)

| Table | Key columns |
|---|---|
| `clinics` | id, name, slug, logo_url, primary_color, address, phone, whatsapp, email, timezone, working_days, opening_time, closing_time, status |
| `users` | id, clinic_id, name, email, phone, role (`admin\|receptionist\|doctor\|super_admin`), is_active, last_login |
| `doctors` | id, clinic_id, user_id, name, specialization, qualification, phone, photo_url, working_days, arrival_time, departure_time, slot_duration, max_appointments_per_day, is_active |
| `doctor_breaks` | id, doctor_id, label, start_time, end_time |
| `doctor_leaves` | id, doctor_id, clinic_id, from_date, to_date, reason |
| `blocked_dates` | id, clinic_id, doctor_id, date, reason |
| `patients` | id, clinic_id, name, phone, email, date_of_birth, gender, address, notes, is_vip, allergies, blood_group, medical_history |
| `appointments` | id, clinic_id, doctor_id, patient_id, service_id, date, start_time, end_time, status, source, notes, booked_by, follow_up_date, cancellation_reason |
| `services` | id, clinic_id, name, description, duration_minutes, price, category, is_active |
| `invoices` | id, clinic_id, appointment_id, invoice_number, total_amount, subtotal, discount_amount, discount_type, tax_percent, tax_amount, payment_method, line_items, status, pdf_url |
| `reminders` | id, appointment_id, clinic_id, type, channel, scheduled_at, sent_at, status |
| `conversations` | id, clinic_id, patient_phone, patient_name, messages, last_message, last_message_at, is_ai_active |
| `waitlist` | id, clinic_id, patient_id, doctor_id, service_id, priority, status, notes |
| `audit_logs` | id, clinic_id, user_id, action, entity_type, entity_id, old_value, new_value |
| `notification_settings` | id, clinic_id, (reminder config columns) |

---

## Key Patterns

### Data fetching pattern
All data fetching goes through TanStack Query hooks. Direct `supabase` calls are in `src/api/*.ts` files. Hooks in `src/hooks/` wrap those with `useQuery` / `useMutation`. Cache is keyed by `[entityName, clinicId, ...filters]`.

### Clinic scoping
Every DB query includes `.eq('clinic_id', clinic.id)` — no cross-clinic data leakage. Super admin queries omit this filter.

### Realtime subscriptions
Used for: `appointments` (useTodayQueue, useAppointments), `conversations` (useWhatsAppRealtime). Pattern: `supabase.channel(name).on('postgres_changes', ..., callback).subscribe()`. Cleanup via `subscription.unsubscribe()` in useEffect return.

### Joined data normalization
Supabase returns joined tables as plural table names (e.g., `item.patients`). All API functions normalize these: `patient: item.patients ?? null`, `doctor: item.doctors ?? null`, `service: item.services ?? null`.

### Role-gating in components
`isRole('admin', 'clinic_admin')` for admin-only UI elements within shared pages. `isAdmin` for the simpler boolean check. Guards wrap sections of JSX, not entire components (except in App.tsx route guards).
