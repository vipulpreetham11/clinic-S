# ClinicOS Developer Handbook

> Complete reference for every developer working on this codebase. Written for a junior developer on day 1.

---

## 1. Project Overview

**ClinicOS** is a white-label, multi-tenant Clinic Management SaaS platform. A single deployment serves multiple clinics. Each clinic has its own isolated data silo.

**Who uses it:**
- **Super Admin** — the platform owner (you/Vipul). Manages all clinics globally.
- **Clinic Admin (`admin`)** — the owner/manager of a specific clinic. Full control over their clinic.
- **Receptionist** — books appointments, checks in patients, manages waitlist.
- **Doctor** — views their own schedule, records consultations, sees their patients.

**What it solves:** Replaces paper registers and Excel sheets for small-to-medium clinics. Provides appointment booking, patient history, invoicing, WhatsApp automation, and analytics in one place.

---

## 2. Tech Stack

| Library | Version | Why |
|---|---|---|
| React | 19 | UI framework — component-based, fast |
| TypeScript | ~6.0 | Type safety — catches bugs at compile time, not runtime |
| Vite | 8 | Build tool — instant dev server, fast HMR, 2.5s prod build |
| Tailwind CSS | 3.4 | Utility-first styling — no CSS files to maintain |
| shadcn/ui + @base-ui/react | latest | Pre-built accessible components (dialogs, dropdowns, calendar, etc.) |
| Supabase JS | 2.105 | Database + auth + storage + realtime + edge functions in one client |
| @tanstack/react-query | 5.100 | Data fetching, caching, background refetch, optimistic updates |
| React Router | 7.15 | Client-side routing, protected routes |
| Recharts | 3.8 | Chart components — bar charts, line charts for analytics |
| @react-pdf/renderer | 4.5 | PDF generation (invoices) — runs entirely in the browser |
| react-hook-form | 7.76 | Form state management — uncontrolled inputs for performance |
| zod | 4.4 | Schema validation — used with react-hook-form via @hookform/resolvers |
| @hookform/resolvers | 5.2 | Bridges zod schemas to react-hook-form |
| sonner | 2.0 | Toast notifications |
| date-fns | 4.1 | Date utility functions (formatting, arithmetic, parsing) |
| react-day-picker | 10 | Calendar UI component (used by shadcn Calendar) |
| lucide-react | 1.16 | Icon set — 1000+ SVG icons as React components |
| jspdf | 4.2 | PDF fallback (not the primary method — @react-pdf/renderer is primary) |
| class-variance-authority | 0.7 | Variant-based className builder for component variants |
| clsx + tailwind-merge | latest | Safely merge Tailwind class strings without conflicts |
| vaul | 1.1 | Drawer/sheet component (used by shadcn Sheet) |
| next-themes | 0.4 | Theme (dark/light) support |

---

## 3. Environment Variables

Create `.env` in the project root (same level as `package.json`):

```env
VITE_SUPABASE_URL=https://mnnpuxznejnsubcrfvor.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
```

**Rules:**
- Never commit `.env` to git — it's in `.gitignore`
- Never use the `service_role` key in frontend code — it bypasses all RLS
- The `anon` key is safe to expose — Supabase RLS policies protect the data

---

## 4. How to Run

```bash
cd clinic-crm
npm install
npm run dev          # http://localhost:5173
npm run build        # Production build — must output 0 errors
npm run preview      # Preview the production build locally
```

---

## 5. Folder Structure

```
clinic-crm/src/
│
├── main.tsx                  # Entry point — renders <AuthProvider><App /></AuthProvider>
├── App.tsx                   # All routes defined here, React Query setup
├── index.css                 # Global CSS — Tailwind imports, CSS variables, custom animations
│
├── context/
│   └── AuthContext.tsx       # Central auth state: user, profile, clinic, role, isLoading
│                             # Functions: login(), logout(), refreshClinic(), isRole()
│                             # Computed: isSuperAdmin, isAdmin, isReceptionist, isDoctor
│
├── lib/
│   ├── supabase.ts           # Supabase client — one instance for the whole app
│   ├── utils.ts              # cn() for merging Tailwind classes, hexToHsl() for theme
│   ├── slotGenerator.ts      # generateAvailableSlots() — pure fn, no DB calls
│   ├── businessHours.ts      # Parse/build clinic business hours config
│   ├── formatTime.ts         # formatTime12h(), getDurationMinutes(), getInitials(), getPatientAge()
│   ├── csvExport.ts          # patientsToCsv(), appointmentsToCsv(), invoicesToCsv()
│   ├── createUserSchemas.ts  # Zod schemas: addDoctorSchema, addTeamUserSchema
│   └── settingsSchemas.ts    # Zod schemas: clinicProfileSchema, invoiceSettingsSchema
│
├── types/
│   ├── index.ts              # All core types: UserRole, AppointmentStatus, Clinic, User,
│   │                         # Doctor, Patient, Appointment, Invoice (stub), etc.
│   ├── invoice.ts            # Full Invoice type with line_items, total_amount, etc.
│   ├── consultation.ts       # Doctor-portal local types (Appointment, Doctor, Patient, Consultation)
│   ├── prescription.ts       # Prescription frequencies: OD, BD, TDS, QID, SOS
│   ├── reminder.ts           # ReminderRule, ReminderQueue, ReminderLog types
│   ├── service.ts            # Service, ServiceUpsertInput, ServiceCategories types
│   ├── settings.ts           # ClinicNotificationSettings, ClinicInvoiceSettings types
│   ├── waitlist.ts           # WaitlistEntry, WaitlistNotification types
│   └── whatsapp.ts           # WhatsAppConversation, WhatsAppMessage, WhatsAppAIConfig types
│
├── api/                      # Pure async functions — only Supabase calls, no React state
│   ├── adminDashboard.ts     # getTodayStats(), getTodayAppointments(), getWeeklyTrend(), etc.
│   ├── appointments.ts       # getAppointments(), createAppointment(), updateAppointmentStatus(), etc.
│   ├── clinics.ts            # getClinic(), updateClinic(), getAllClinics(), createClinic()
│   ├── createUser.ts         # invokeCreateUser() — calls Supabase Edge Function 'create-user'
│   ├── doctors.ts            # getDoctors(), createDoctor(), addDoctorBreak(), addDoctorLeave(), etc.
│   ├── invoices.ts           # getInvoices(), createInvoice(), markInvoicePaid(), etc.
│   ├── patients.ts           # getPatients(), createPatient(), updatePatient(), getPatientHistory()
│   ├── receptionistDashboard.ts  # getReceptionistTodayStats(), getReceptionistActivityFeed(), etc.
│   ├── services.ts           # getServices(), upsertService(), toggleService(), deleteService()
│   ├── settings.ts           # updateClinicProfile(), getClinicUsers(), inviteClinicUser(), etc.
│   └── superAdmin.ts         # getAllClinicsWithStats(), getPlatformStats(), createClinic(), etc.
│
├── hooks/                    # React hooks — wrap API functions with TanStack Query
│   ├── useAdminDashboard.ts      # useTodayStats(), useTodayAppointments(), useWeeklyTrend()
│   ├── useAppointmentActions.ts  # useAppointmentActions() — receptionist check-in/complete/cancel
│   ├── useAppointments.ts        # useAppointments(), useCreateAppointment(), useUpdateAppointmentStatus()
│   ├── useAuth.ts                # Re-exports useAuthContext as useAuth (backward compat alias)
│   ├── useClinic.ts              # (alias/wrapper for clinic queries)
│   ├── useConsultation.ts        # useConsultation() — doctor portal: fetch/save consultation
│   ├── useConversations.ts       # useConversations(), useToggleAI(), useMarkResolved()
│   ├── useCreateUser.ts          # useCreateUser() — calls create-user Edge Function
│   ├── useDoctorContext.ts        # useDoctorContext() — doctor portal: fetch doctor by user_id
│   ├── useDoctorProfile.ts       # (alias for doctor profile in admin context)
│   ├── useDoctors.ts             # useDoctors(), useDoctor(), useAddDoctorBreak(), useDoctorLeaves()
│   ├── useInvoices.ts            # useInvoices(), useCreateInvoice(), useMarkInvoicePaid()
│   ├── useMessages.ts            # useMessages(conversationId) — WhatsApp message thread
│   ├── useMyPatients.ts          # useMyPatients() — doctor portal: patients seen by this doctor
│   ├── usePatients.ts            # usePatients(), useCreatePatient(), useUpdatePatient()
│   ├── useRealtimeAppointments.ts # Realtime subscription for appointments
│   ├── useReceptionistDashboard.ts # useReceptionistDashboard() — combines 4 queries + realtime
│   ├── useReminderQueue.ts       # useReminderQueue(), useRetryReminder(), useCancelReminder()
│   ├── useReminders.ts           # useReminderRules(), useReminderLogs(), useUpsertRule()
│   ├── useSendMessage.ts         # Send WhatsApp message
│   ├── useServices.ts            # useServices(), useUpsertService(), useDeleteService()
│   ├── useSettings.ts            # useClinicProfile(), useClinicUsers(), useNotificationSettings()
│   ├── useSuperAdmin.ts          # usePlatformStats(), useAllClinics(), useCreateClinic()
│   ├── useTemplates.ts           # WhatsApp template CRUD
│   ├── useTodayQueue.ts          # Doctor portal: today's appointments with realtime
│   ├── useWaitlist.ts            # useWaitlist(), useAddToWaitlist(), useUpdateWaitlistStatus()
│   ├── useWhatsAppRealtime.ts    # Supabase realtime for WhatsApp messages + browser notifications
│   └── useWhatsAppSettings.ts   # useWhatsAppSettings(), useSaveWhatsAppSettings()
│
├── components/
│   ├── ui/                   # shadcn/ui components — DON'T edit these manually
│   │                         # Includes: Button, Input, Dialog, Sheet, Select, Badge, Calendar,
│   │                         # Popover, Tabs, Table, Card, Avatar, Skeleton, etc.
│   │
│   ├── layout/               # App shell
│   │   ├── Layout.tsx        # Outer wrapper — renders Sidebar + Header + <Outlet />
│   │   ├── Sidebar.tsx       # Left nav. Role-aware: shows different links per role.
│   │   │                     # Desktop: fixed sidebar. Mobile: bottom tab bar (first 5 links)
│   │   ├── Header.tsx        # Top bar — clinic name, user avatar, notifications
│   │   └── ProtectedRoute.tsx # Guards routes — redirects unauthorized users to their home
│   │
│   ├── admin/                # Admin dashboard components
│   │   ├── QuickStats.tsx    # KPI cards strip (total, confirmed, completed, etc.)
│   │   ├── TodaySchedule.tsx # Today's appointment list with status badges
│   │   ├── DoctorStatusCard.tsx # Doctor-by-doctor card showing today's load
│   │   ├── WeeklyTrendChart.tsx # 7-day bar chart using Recharts
│   │   └── RecentActivity.tsx # Recent activity feed list
│   │
│   ├── appointments/
│   │   ├── AppointmentCard.tsx      # Single appointment card (used in timeline view)
│   │   ├── AppointmentStatusBadge.tsx # Colored badge per status (pending=yellow, confirmed=blue, etc.)
│   │   ├── PatientSearch.tsx        # Debounced patient search with create-new option
│   │   ├── SlotPicker.tsx           # Time slot grid. Fetches booked slots + generates available
│   │   └── TimelineView.tsx         # Visual horizontal timeline for today's schedule
│   │
│   ├── doctors/
│   │   ├── AddDoctorModal.tsx       # Modal to create a new doctor (calls create-user Edge Function)
│   │   ├── BreakManager.tsx         # UI to add/edit/delete doctor breaks
│   │   ├── ConsultationHistory.tsx  # List of past consultations for a patient
│   │   ├── ConsultationModal.tsx    # Doctor portal — form to record a consultation
│   │   ├── DoctorAvatar.tsx         # Doctor photo with fallback initials
│   │   ├── DoctorCard.tsx           # Doctor summary card
│   │   ├── DoctorScheduleCalendar.tsx # Calendar view with leave/blocked/appointment modifiers
│   │   ├── LeaveManager.tsx         # UI to add/delete doctor leaves (date ranges)
│   │   ├── NextPatientPreview.tsx   # Card showing the next patient in queue
│   │   ├── PrescriptionBuilder.tsx  # Drug prescription form rows (doctor portal)
│   │   ├── PrintableSummary.tsx     # Print-friendly consultation summary
│   │   ├── ServiceAssignment.tsx    # Assign services to a doctor
│   │   ├── TimeRangePicker.tsx      # Start/end time pair picker
│   │   ├── TodayQueue.tsx           # Table of today's patients with Start/View buttons
│   │   ├── VitalsForm.tsx           # BP, temp, weight, SpO2, pulse inputs
│   │   └── WorkingDaysSelector.tsx  # Mon-Sun checkbox grid
│   │
│   ├── invoices/
│   │   ├── InvoiceForm.tsx    # Full invoice form with line items, discount, tax
│   │   └── InvoicePDF.tsx     # @react-pdf/renderer PDF template for printing
│   │
│   ├── patients/
│   │   ├── AddPatientModal.tsx    # Quick-add patient modal
│   │   ├── PatientCard.tsx        # Patient summary card
│   │   ├── PatientFormModal.tsx   # Full patient edit form modal
│   │   └── PatientTabs.tsx        # Patient detail tabs: Overview, Appointments, Invoices
│   │
│   ├── receptionist/
│   │   ├── ActivityFeed.tsx            # Live activity feed (new bookings, check-ins, etc.)
│   │   ├── AppointmentDetailDrawer.tsx # Slide-out panel for appointment details
│   │   ├── AppointmentRowActions.tsx   # Action buttons for each appointment row
│   │   ├── DoctorStatusCards.tsx       # Cards per doctor showing today's load
│   │   ├── KPIStrip.tsx                # Quick stat cards (total, confirmed, completed, etc.)
│   │   ├── QuickActionsBar.tsx         # "New Booking" and other quick action buttons
│   │   ├── ReceptionistStatusBadge.tsx # Status badge variant for receptionist view
│   │   └── TodayScheduleTable.tsx      # Sortable today's appointments table
│   │
│   ├── reminders/
│   │   ├── ReminderLogsTable.tsx   # Table of sent reminder history
│   │   ├── ReminderQueueTable.tsx  # Table of pending/failed reminders
│   │   ├── ReminderRulesTable.tsx  # Reminder rule configuration list
│   │   ├── RuleFormModal.tsx       # Create/edit reminder rule form
│   │   └── TestRuleModal.tsx       # Send a test reminder via WhatsApp
│   │
│   ├── services/
│   │   ├── AddServiceModal.tsx  # Quick add service modal
│   │   ├── ServiceCard.tsx      # Service card with name, duration, price
│   │   └── ServiceForm.tsx      # Full service edit form
│   │
│   ├── settings/
│   │   ├── AddUserModal.tsx        # Invite a new team member (calls create-user Edge Function)
│   │   ├── BillingInvoiceTab.tsx   # Invoice settings (prefix, tax, footer)
│   │   ├── ClinicProfileTab.tsx    # Clinic name, address, logo, hours
│   │   ├── DangerZoneTab.tsx       # Export data, reset demo data
│   │   ├── NotificationsTab.tsx    # Toggle notification preferences
│   │   ├── RemindersConfigTab.tsx  # Reminder rules configuration
│   │   └── TeamUsersTab.tsx        # List/manage team members
│   │
│   ├── shared/
│   │   ├── ConfirmDialog.tsx   # Generic "Are you sure?" dialog
│   │   ├── EmptyState.tsx      # Empty list placeholder with icon + message
│   │   ├── LoadingSpinner.tsx  # Spinner component
│   │   └── PageHeader.tsx      # Page title + description + optional action button
│   │
│   ├── super-admin/
│   │   ├── AddUserModal.tsx      # Super admin version of adding a clinic admin
│   │   ├── ClinicCard.tsx        # Clinic summary card for the clinics list
│   │   ├── ClinicStatusBadge.tsx # active/inactive/suspended badge
│   │   ├── GlobalStatsCard.tsx   # Platform-wide KPI card
│   │   └── RevenueChart.tsx      # Revenue trend chart (super admin)
│   │
│   ├── waitlist/
│   │   ├── AddWaitlistModal.tsx        # Add patient to waitlist form
│   │   ├── NotifyWaitlistModal.tsx     # Send notification to waitlisted patient
│   │   ├── WaitlistNotificationBanner.tsx # Banner for pending waitlist notifications
│   │   ├── WaitlistStats.tsx           # Waitlist count stats
│   │   └── WaitlistTable.tsx           # Sortable, filterable waitlist table
│   │
│   └── whatsapp/
│       ├── AIConfigForm.tsx      # Configure AI persona, system prompt, handoff keywords
│       ├── AIToggle.tsx          # Toggle AI auto-reply on/off for a conversation
│       ├── ConnectionSetup.tsx   # WhatsApp phone number connection setup
│       ├── ConversationItem.tsx  # Single conversation row in the list
│       ├── ConversationList.tsx  # Left panel — list of all conversations with filter tabs
│       ├── ConversationPanel.tsx # Right panel — message thread + reply input
│       ├── MessageBubble.tsx     # Individual message bubble (inbound=left, outbound=right)
│       ├── MessageInput.tsx      # Text input + send button + template picker
│       ├── TemplateManager.tsx   # CRUD for WhatsApp message templates
│       └── TemplatePickerModal.tsx # Pick a template when composing a message
│
└── pages/
    ├── auth/
    │   └── Login.tsx           # Login form with email + password. Validates with zod.
    │                           # On success: calls login() from AuthContext, then navigate to role home.
    │
    ├── super-admin/
    │   ├── Dashboard.tsx       # Platform KPIs + appointments trend chart (30 days)
    │   ├── Clinics.tsx         # Searchable list of all clinics with per-clinic stats
    │   ├── CreateClinic.tsx    # Form to create a new clinic + optional admin user
    │   └── ClinicDetail.tsx    # Tabbed view: Overview, Users, Doctors, Patients, Appointments
    │
    ├── admin/
    │   ├── Dashboard.tsx       # Greeting + KPI strip + today's schedule + doctor status + charts
    │   ├── Settings.tsx        # Alias/redirect to settings (deprecated, use /settings)
    │   └── SetupWizard.tsx     # First-run wizard: clinic info → hours → doctor → service
    │
    ├── appointments/
    │   ├── AppointmentList.tsx  # Paginated, filterable list + calendar toggle. Row → AppointmentDetail sheet
    │   ├── NewAppointment.tsx   # Multi-section form: patient → service → doctor → date → slot → submit
    │   └── AppointmentDetail.tsx # Sheet (slide-in) at /appointments/:id. Shows full appointment details.
    │
    ├── doctors/
    │   ├── DoctorList.tsx      # Grid of doctor cards with search
    │   ├── DoctorForm.tsx      # Create/edit doctor form (admin only)
    │   └── DoctorSchedule.tsx  # Tabs: Calendar | Leaves | Breaks — per-doctor schedule management
    │
    ├── doctor-portal/          # Routes only for users with role='doctor'
    │   ├── DoctorDashboard.tsx # KPI cards + today's queue + next patient preview
    │   ├── MySchedule.tsx      # Today's queue with consultation modal
    │   ├── MyPatients.tsx      # All patients seen by this doctor, searchable
    │   └── DoctorProfile.tsx   # Read-only doctor profile view
    │
    ├── patients/
    │   ├── PatientList.tsx     # Paginated list with search, gender/blood_group filters
    │   └── PatientDetail.tsx   # Patient profile with tabs: details, appointment history, invoices
    │
    ├── services/
    │   ├── ServiceList.tsx     # Grid of service cards with search, status filter
    │   ├── [id].tsx            # Create/edit service form (named [id].tsx — Next.js-style convention)
    │   └── index.tsx           # Redirect to /services
    │
    ├── invoices/
    │   ├── Invoices.tsx        # List with filters + stats bar (total/paid/pending/draft)
    │   ├── InvoiceFormPage.tsx # Create/edit invoice. Pre-fills from ?appointmentId= query param.
    │   └── InvoiceDetailPage.tsx # Read-only view with PDF download button
    │
    ├── analytics/
    │   └── Analytics.tsx       # KPI cards (today stats) + weekly bar chart + doctor status table
    │
    ├── reminders/
    │   └── Reminders.tsx       # Three tabs: Queue | Rules | Logs
    │
    ├── waitlist/
    │   └── Waitlist.tsx        # Waitlist table with notification banner + add/notify actions
    │
    ├── conversations/
    │   └── Conversations.tsx   # Split layout: ConversationList (left) + ConversationPanel (right)
    │
    ├── whatsapp/
    │   └── WhatsAppSettings.tsx # Tabs: Connection Setup | AI Config | Templates
    │
    ├── settings/
    │   └── SettingsPage.tsx    # Tabs: Profile | Team | Notifications | Billing | Danger Zone
    │
    └── receptionist/
        └── InvoicesStub.tsx    # Placeholder shown to receptionists for invoices (read-only)

    ReceptionistDashboard.tsx   # (in /pages, not /pages/receptionist) — KPI strip + schedule table
                                # + doctor status cards + activity feed. Uses useReceptionistDashboard().
```

---

## 6. Database Schema

### `clinics`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Display name |
| slug | text UNIQUE | URL-friendly identifier |
| logo_url | text | Public URL to clinic logo in Supabase Storage |
| primary_color | text | Hex color (#2A8C78) applied as CSS variable --primary |
| address | text | |
| phone | text | |
| whatsapp | text | WhatsApp number for outbound messages |
| email | text | |
| website | text | |
| gstin | text | Indian GST number (15-char format validated) |
| timezone | text | Default: 'Asia/Kolkata' |
| working_days | text[] | Array of day abbreviations: ['Mon','Tue','Wed','Thu','Fri','Sat'] |
| opening_time | text | HH:MM format e.g. '09:00' |
| closing_time | text | HH:MM format e.g. '18:00' |
| business_hours | jsonb | Per-day hours map `{Mon: {enabled, open, close}, ...}` |
| default_slot_duration | int | Minutes per slot (default: 30) |
| currency | text | Default: 'INR' |
| status | text | 'active' \| 'inactive' \| 'suspended' |
| created_at | timestamptz | |

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | MUST match `auth.users.id` exactly — same UUID |
| clinic_id | uuid FK | NULL for super_admin only |
| name | text | Display name |
| email | text | Login email |
| phone | text | Optional |
| role | text | **ONLY: 'super_admin' \| 'admin' \| 'doctor' \| 'receptionist'** |
| is_active | bool | Inactive users are blocked from logging in |
| avatar_url | text | Optional profile photo |
| doctor_id | uuid FK | Set only when role='doctor', links to doctors.id |
| last_login | timestamptz | Updated on every successful login |
| created_at | timestamptz | |

### `doctors`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| user_id | uuid FK | Links to users.id — set when doctor has a login account |
| name | text | Display name (no "Dr." prefix stored) |
| specialization | text | **Column is `specialization`, NOT `specialty`** |
| qualification | text | e.g. 'MBBS, MD' |
| phone | text | |
| photo_url | text | |
| working_days | text[] | ['Mon','Tue','Wed','Thu','Fri'] |
| arrival_time | text | HH:MM e.g. '09:00' |
| departure_time | text | HH:MM e.g. '18:00' |
| slot_duration | int | Minutes: 15, 20, 30, 45, or 60 |
| max_appointments_per_day | int | Soft limit |
| is_active | bool | |
| created_at | timestamptz | |

### `doctor_breaks`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| doctor_id | uuid FK | |
| label | text | e.g. 'Lunch break' |
| start_time | text | HH:MM |
| end_time | text | HH:MM |

### `doctor_leaves`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| doctor_id | uuid FK | |
| clinic_id | uuid FK | |
| from_date | text | YYYY-MM-DD |
| to_date | text | YYYY-MM-DD |
| reason | text | Optional |
| created_at | timestamptz | |

### `doctor_services` (junction)
| Column | Type | Notes |
|---|---|---|
| doctor_id | uuid FK | |
| service_id | uuid FK | |

### `blocked_dates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| doctor_id | uuid FK | |
| date | text | YYYY-MM-DD |
| reason | text | Optional |
| created_at | timestamptz | |

### `patients`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| name | text | |
| phone | text | Primary identifier for WhatsApp |
| email | text | Optional |
| date_of_birth | text | YYYY-MM-DD |
| gender | text | 'male' \| 'female' \| 'other' |
| address | text | Optional |
| notes | text | General notes |
| is_vip | bool | Shows crown icon in UI |
| allergies | text | Free text |
| blood_group | text | e.g. 'O+', 'A-' |
| medical_history | text | Free text |
| created_at | timestamptz | |

### `services`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| name | text | |
| category | text | 'General' \| 'Consultation' \| 'Procedure' \| 'Lab Test' \| 'Package' \| 'Other' |
| description | text | Optional |
| duration_minutes | int | Used for slot generation |
| price | numeric | In INR |
| is_active | bool | Inactive services don't appear in booking |
| created_at | timestamptz | |

### `appointments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| doctor_id | uuid FK | |
| patient_id | uuid FK | |
| service_id | uuid FK | |
| date | text | **YYYY-MM-DD. NOT `scheduled_at`, NOT `appointment_date`** |
| start_time | text | HH:MM e.g. '09:00' |
| end_time | text | HH:MM e.g. '09:30' |
| status | text | **'pending' \| 'confirmed' \| 'completed' \| 'cancelled' \| 'no_show' \| 'rescheduled'** |
| source | text | **'admin' \| 'receptionist' \| 'whatsapp' \| 'website'** |
| notes | text | Optional |
| booked_by | uuid FK | users.id of who booked it |
| follow_up_date | text | YYYY-MM-DD |
| follow_up_notes | text | |
| cancellation_reason | text | |
| completed_at | timestamptz | |
| cancelled_at | timestamptz | |
| whatsapp_message_id | text | If booked via WhatsApp |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `invoices`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| appointment_id | uuid FK | Optional — invoice can exist without appointment |
| patient_id | uuid FK | |
| invoice_number | text | Auto-generated e.g. 'INV-2025-001' |
| total_amount | numeric | **`total_amount`, NOT `amount`** |
| subtotal | numeric | Before discount |
| discount_amount | numeric | Amount discounted |
| discount_type | text | 'flat' \| 'percent' |
| tax_percent | numeric | e.g. 18 for 18% GST |
| tax_amount | numeric | Computed: subtotal × tax_percent / 100 |
| line_items | jsonb | Array: [{description, quantity, unit_price, total}] |
| status | text | 'draft' \| 'sent' \| 'paid' \| 'cancelled' |
| payment_method | text | 'cash' \| 'card' \| 'upi' \| 'bank_transfer' |
| paid_at | timestamptz | |
| notes | text | Optional footer notes |
| pdf_url | text | If PDF was saved to storage |
| created_at | timestamptz | |

### `consultations`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| appointment_id | uuid FK | |
| clinic_id | uuid FK | |
| doctor_id | uuid FK | |
| patient_id | uuid FK | |
| chief_complaint | text | Patient's reported symptoms |
| examination_notes | text | Doctor's examination findings |
| diagnosis | text | |
| prescription | jsonb | Array of {medicine, dosage, frequency, duration, instructions} |
| vitals | jsonb | {bp_sys, bp_dia, temp, weight, spo2, pulse} |
| follow_up_date | text | YYYY-MM-DD |
| follow_up_notes | text | |
| internal_notes | text | Not shown to patients |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `waitlist`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| patient_id | uuid FK | |
| doctor_id | uuid FK | Optional preference |
| service_id | uuid FK | Optional preference |
| preferred_date | text | YYYY-MM-DD |
| preferred_time_start | text | HH:MM |
| preferred_time_end | text | HH:MM |
| notes | text | |
| priority | int | 0=normal, 1=urgent, 2=critical |
| status | text | 'waiting' \| 'notified' \| 'booked' \| 'expired' \| 'cancelled' |
| position | int | Sort order in queue |
| notified_at | timestamptz | When patient was notified |
| notified_channel | text | 'whatsapp' \| 'sms' \| 'email' |
| booked_appointment_id | uuid FK | Set when patient books |
| expires_at | timestamptz | Auto-expire date |
| created_at | timestamptz | |

### `waitlist_notifications`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| waitlist_id | uuid FK | |
| clinic_id | uuid FK | |
| available_appointment_slot | text | Description of available slot |
| doctor_id | uuid FK | |
| status | text | 'pending' \| 'sent' \| 'expired' |
| created_at | timestamptz | |

### `reminder_rules`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| name | text | e.g. '24hr Reminder' |
| trigger_type | text | 'appointment_upcoming' \| 'appointment_followup' \| 'custom' |
| offset_hours | int | Hours before appointment to send |
| channel | text[] | ['whatsapp'] or ['whatsapp', 'sms'] |
| message_template | text | Message with placeholders |
| is_active | bool | |
| days_of_week | int[] | [0=Sun, 1=Mon, ..., 6=Sat] |
| created_at | timestamptz | |

### `reminder_queue`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| appointment_id | uuid FK | |
| patient_id | uuid FK | |
| rule_id | uuid FK | Which rule triggered this |
| channel | text | 'whatsapp' \| 'sms' \| 'email' |
| scheduled_at | timestamptz | When to send |
| sent_at | timestamptz | When actually sent |
| status | text | 'pending' \| 'sent' \| 'failed' \| 'skipped' \| 'cancelled' |
| error_message | text | If failed |
| message_content | text | Rendered message (placeholders filled) |
| whatsapp_message_id | text | WhatsApp delivery ID |
| created_at | timestamptz | |

### `reminder_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reminder_queue_id | uuid FK | |
| clinic_id | uuid FK | |
| patient_id | uuid FK | |
| channel | text | |
| message_content | text | |
| status | text | |
| sent_at | timestamptz | |
| created_at | timestamptz | |

### `whatsapp_conversations`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| patient_phone | text | The patient's WhatsApp number |
| patient_name | text | Auto-populated from patients table if found |
| patient_id | uuid FK | Optional — linked if patient found in DB |
| status | text | 'open' \| 'bot_handling' \| 'resolved' |
| ai_takeover_enabled | bool | True when AI is auto-replying |
| last_message_at | timestamptz | For sorting |
| last_message_preview | text | First ~100 chars of last message |
| unread_count | int | Incremented by webhook, reset by useResetUnread() |
| assigned_to | uuid FK | users.id — which staff member handles this |
| created_at | timestamptz | |

### `whatsapp_messages`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid FK | |
| clinic_id | uuid FK | |
| direction | text | 'inbound' (patient → clinic) \| 'outbound' (clinic → patient) |
| sender | text | 'patient' or staff user name |
| message_type | text | 'text' \| 'image' \| 'audio' \| 'document' \| 'template' |
| content | text | Message text |
| media_url | text | For non-text messages |
| media_mime_type | text | |
| whatsapp_message_id | text | Meta's message ID |
| status | text | 'sent' \| 'delivered' \| 'read' \| 'failed' |
| ai_generated | bool | True if AI wrote this message |
| created_at | timestamptz | |

### `whatsapp_ai_config`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid UNIQUE FK | One config per clinic |
| ai_enabled | bool | |
| ai_persona_name | text | e.g. 'Priya' |
| system_prompt | text | Instructions for the AI model |
| handoff_keywords | text[] | Words that trigger human takeover |
| business_hours_only | bool | Only AI-reply during business hours |
| business_hours_start | text | HH:MM |
| business_hours_end | text | HH:MM |
| max_ai_turns | int | Max AI exchanges before forced handoff |
| created_at | timestamptz | |

### `whatsapp_templates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| name | text | Template name |
| content | text | Message template text |
| category | text | 'appointment' \| 'reminder' \| 'followup' \| 'general' |
| created_at | timestamptz | |

### `clinic_notification_settings`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid UNIQUE FK | |
| settings | jsonb | `{new_appointment_notify_receptionist, appointment_cancelled_notify_doctor, ...}` |
| updated_at | timestamptz | |

### `clinic_invoice_settings`
| Column | Type | Notes |
|---|---|---|
| clinic_id | uuid UNIQUE PK | |
| prefix | text | Invoice number prefix e.g. 'INV' |
| default_tax | numeric | Default tax % e.g. 18 |
| footer_text | text | Printed on invoice footer |
| show_gstin | bool | Show clinic's GSTIN on invoice |
| payment_terms | text | Free text payment terms |
| updated_at | timestamptz | |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| clinic_id | uuid FK | |
| user_id | uuid FK | Who performed the action |
| action | text | e.g. 'clinic_status_changed_to_suspended' |
| entity_type | text | e.g. 'clinic', 'appointment' |
| entity_id | uuid | The affected record's ID |
| old_value | jsonb | State before change |
| new_value | jsonb | State after change |
| created_at | timestamptz | |

---

## 7. Roles & Permissions

### super_admin
- `clinic_id = NULL` — not tied to any clinic
- Can see ALL clinics
- Home route: `/super-admin`
- Routes: `/super-admin`, `/super-admin/clinics`, `/super-admin/clinics/new`, `/super-admin/clinics/:id`, `/analytics`
- Can: create clinics, create clinic admins, view global platform stats, suspend/activate clinics
- Cannot: manage day-to-day operations (appointments, patients) of any individual clinic

### admin (Clinic Admin)
- `clinic_id = their clinic's UUID`
- `role = 'admin'` — this is the only value stored in DB (NOT 'clinic_admin')
- Home route: `/dashboard`
- Routes: all of receptionist routes PLUS `/doctors/new`, `/doctors/:id`, `/services`, `/invoices`, `/analytics`, `/settings`, `/reminders`, `/waitlist`, `/whatsapp/*`
- Can: everything within their clinic — full CRUD on all entities
- Cannot: see other clinics' data, create new clinics

### receptionist
- `clinic_id = their clinic's UUID`
- `role = 'receptionist'`
- Home route: `/receptionist` (but after login, goes to `/appointments` per Login.tsx ROLE_REDIRECT)
- Routes: `/receptionist`, `/appointments`, `/patients`, `/waitlist`, limited invoices view
- Can: book appointments, check in patients, manage waitlist, see patient list
- Cannot: manage doctors, services, invoices (full), analytics, settings, whatsapp config

### doctor
- `clinic_id = their clinic's UUID`
- `role = 'doctor'`
- `doctor_id = their doctors table row ID` (stored in users.doctor_id)
- Home route: `/doctor`
- Routes: `/doctor`, `/doctor/schedule`, `/doctor/patients`, `/doctor/profile`, `/doctor/leaves` (redirects to /doctor/schedule)
- Can: view their own appointments, record consultations, view their own patient list
- Cannot: see other doctors' data, access admin pages, change appointments from other doctors

---

## 8. Routing Logic

### App.tsx structure
```
<QueryClientProvider>
  <Router>
    <Routes>
      <Route path="/login" />           <!-- Public -->
      
      <Route element={<Layout />}>      <!-- Sidebar + Header wrapper -->
        <Route path="/" element={<RootRedirect />} />
        
        <!-- Role-gated groups -->
        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route path="/super-admin" .../>
        </Route>
        
        <Route element={<ProtectedRoute allowedRoles={['admin', 'clinic_admin']} />}>
          <Route path="/dashboard" .../>
          <Route path="/doctors/new" .../>
          ...
        </Route>
        
        <Route element={<ProtectedRoute allowedRoles={['admin', 'clinic_admin', 'receptionist']} />}>
          <Route path="/appointments" .../>
          <Route path="/patients" .../>
          ...
        </Route>
        
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route path="/doctor" .../>
        </Route>
      </Route>
    </Routes>
  </Router>
</QueryClientProvider>
```

### ProtectedRoute logic (App.tsx inline version)
```tsx
function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, profile, role, isLoading, isRole } = useAuthContext()
  
  if (isLoading) return <LoadingScreen />             // 1. Wait for auth
  if (!user || !profile) return <Navigate to="/login" />  // 2. Not logged in
  if (allowedRoles && !isRole(...allowedRoles))       // 3. Wrong role
    return <Navigate to={ROLE_HOME[role] ?? '/login'} />  // → send to their home
  return <Outlet />                                   // 4. Authorized ✓
}
```

### Route → Component map
| URL | Allowed Roles | Component |
|---|---|---|
| /login | Public | Login.tsx |
| / | Any authenticated | RootRedirect → ROLE_HOME |
| /super-admin | super_admin | SuperAdminDashboard |
| /super-admin/clinics | super_admin | SuperAdminClinics |
| /super-admin/clinics/new | super_admin | CreateClinic |
| /super-admin/clinics/:id | super_admin | ClinicDetail |
| /dashboard | admin, clinic_admin | RoleDashboard (AdminDashboard or ReceptionistDashboard) |
| /admin/setup | admin, clinic_admin | AdminSetupWizard |
| /settings | admin, clinic_admin | SettingsPage |
| /doctors/new | admin, clinic_admin | DoctorForm |
| /doctors/:id | admin, clinic_admin | DoctorForm (edit mode) |
| /services | admin, clinic_admin | ServiceList |
| /services/:id | admin, clinic_admin | ServiceDetail |
| /invoices | admin, clinic_admin | Invoices |
| /invoices/new | admin, clinic_admin | InvoiceFormPage |
| /invoices/:id | admin, clinic_admin | InvoiceDetailPage |
| /invoices/:id/edit | admin, clinic_admin | InvoiceFormPage (edit mode) |
| /analytics | super_admin, admin, clinic_admin | Analytics |
| /receptionist | admin, clinic_admin, receptionist | ReceptionistDashboard |
| /appointments | admin, clinic_admin, receptionist | AppointmentList |
| /appointments/new | admin, clinic_admin, receptionist | NewAppointment |
| /appointments/:id | admin, clinic_admin, receptionist | AppointmentDetail (Sheet) |
| /doctors | admin, clinic_admin, receptionist | DoctorList |
| /doctors/:id/schedule | admin, clinic_admin, receptionist | DoctorSchedule |
| /patients | admin, clinic_admin, receptionist | PatientList |
| /patients/:id | admin, clinic_admin, receptionist | PatientDetail |
| /reminders | admin, clinic_admin, receptionist | Reminders |
| /waitlist | admin, clinic_admin, receptionist | Waitlist |
| /conversations | admin, clinic_admin, receptionist | Conversations |
| /whatsapp/settings | admin, clinic_admin, receptionist | WhatsAppSettings |
| /doctor | doctor | DoctorDashboard |
| /doctor/schedule | doctor | MySchedule |
| /doctor/patients | doctor | MyPatients |
| /doctor/profile | doctor | DoctorProfile |
| /doctor/leaves | doctor | Redirect to /doctor/schedule |

### What happens on unauthorized access
If role='receptionist' tries to visit `/settings`:
1. `ProtectedRoute` checks `isRole('admin', 'clinic_admin')` → false
2. Looks up `ROLE_HOME['receptionist']` → '/receptionist'
3. Returns `<Navigate to="/receptionist" replace />`

If not logged in (no session) tries any protected route → redirected to `/login`

---

## 9. Auth Flow

### Login sequence (step by step)
```
1. User enters email + password → Login.tsx form submits
2. login() in AuthContext is called
3. supabase.auth.signInWithPassword({ email, password }) → Supabase returns JWT session
4. We immediately fetch profile:
   supabase.from('users').select('*').eq('id', data.user.id).single()
5. Check profile.is_active — if false → signOut() → return error 'account_deactivated'
6. setUser(data.user), setProfile(userProfile), setRole(userProfile.role)
7. Set activeProfileId.current = data.user.id  ← prevents SIGNED_IN event duplicate fetch
8. Fetch clinic:
   supabase.from('clinics').select('*').eq('id', userProfile.clinic_id).single()
9. Apply clinic theme: hexToHsl(clinic.primary_color) → CSS --primary variable
10. Update users.last_login = NOW()
11. Return { error: null, role: 'admin' }
12. Login.tsx: navigate(ROLE_REDIRECT[role]) → '/dashboard'
```

### Session persistence
- Session stored in `localStorage` under key `'clinicos-auth'` (set in `supabase.ts` `storageKey`)
- On page refresh:
  1. `supabase.auth.getSession()` reads the stored JWT
  2. If valid → `fetchProfileAndClinic(user.id)` → restore all state
  3. If invalid/expired → `clearSession()` → user sees login page
- `TOKEN_REFRESHED` event is ignored — session is silently renewed, profile is already loaded
- `SIGNED_OUT` event → `clearSession()`, `setIsLoading(false)` → redirect happens naturally
- Safety timeout: if `isLoading` is still true after 10 seconds → force `setIsLoading(false)` to prevent infinite spinner

### How to access auth in any component
```tsx
import { useAuthContext } from '@/context/AuthContext'

function MyComponent() {
  const { 
    user,        // Supabase auth user (has user.id, user.email)
    profile,     // Row from users table (has profile.name, profile.role, etc.)
    clinic,      // Row from clinics table (has clinic.id for all queries!)
    role,        // 'admin' | 'receptionist' | 'doctor' | 'super_admin'
    isLoading,   // True while resolving session on mount
    
    login,       // async (email, password) => { error, role }
    logout,      // async () => void
    refreshClinic, // async () => void — re-fetch clinic data
    
    isRole,      // (...roles: string[]) => boolean — varargs
    isSuperAdmin, // boolean shorthand
    isAdmin,     // boolean — true for 'admin' OR 'clinic_admin'
    isReceptionist,
    isDoctor,
  } = useAuthContext()
  
  // Example: check if user is admin
  if (isRole('admin', 'clinic_admin')) { /* show admin UI */ }
  
  // Example: scope a query to this clinic
  const { data } = useQuery({
    queryFn: () => getPatients(clinic!.id)  // Always use clinic.id
  })
}
```

---

## 10. Data Fetching Pattern

### Standard hook pattern
Every data-fetching hook follows this structure:
```tsx
export function usePatients({ search, page = 1 }: UsePatientsParams = {}) {
  const { clinic } = useAuthContext()
  
  return useQuery({
    // 1. Query key — array that uniquely identifies this query
    queryKey: ['patients', clinic?.id, search, page],
    
    // 2. Query function — must return a promise
    queryFn: () => getPatients(clinic!.id, search),  // Note: clinic!.id (non-null assertion)
    
    // 3. Only fetch when clinic is available
    enabled: !!clinic?.id,
    
    // 4. Cache duration (optional — global default is 5min)
    staleTime: 1000 * 60,  // 1 minute
  })
}
```

### Standard mutation pattern
```tsx
export function useCreateAppointment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: appointmentsApi.createAppointment,
    onSuccess: () => {
      // Invalidate related queries → triggers refetch
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment booked')
    },
    onError: (error: Error) => {
      toast.error('Booking failed', { description: error.message })
    },
  })
}
```

### Query key conventions
| Data | Key pattern |
|---|---|
| Appointments list | `['appointments', filters]` |
| Single appointment | `['appointment', id]` |
| Patients | `['patients', clinicId, search, page, filters]` |
| Doctors | `['doctors', clinicId]` |
| Invoices | `['invoices', clinicId, filters]` |
| Services | `['services', clinicId, search, status]` |
| Today's stats | `['today-stats', clinicId]` |
| WhatsApp conversations | `['whatsapp-conversations', clinicId, filter]` |
| Platform stats | `['platform-stats']` |

### ⚠️ clinic_id scoping — CRITICAL
**Every query that touches clinic data MUST include `.eq('clinic_id', clinic.id)`**

```tsx
// ✅ CORRECT — scoped to this clinic
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('clinic_id', clinic.id)  // ← THIS IS MANDATORY

// ❌ WRONG — returns ALL patients from ALL clinics (data leak!)
const { data } = await supabase
  .from('patients')
  .select('*')
```

Only super_admin queries intentionally omit the clinic_id filter.

### Appointment join pattern
Every appointment query must include joins or you'll get "Unknown patient" / "Unknown doctor" in the UI:
```tsx
supabase.from('appointments').select(`
  *,
  patients(id, name, phone, is_vip, allergies, blood_group),
  doctors(id, name, specialization, photo_url),
  services(id, name, duration_minutes, price),
  booked_by_user:users!booked_by(id, name, role)
`)
```

After fetching, normalize the joined arrays to objects:
```tsx
const normalized = data.map((item) => ({
  ...item,
  patient: item.patients ?? null,   // Supabase returns 'patients' (plural), normalize to 'patient'
  doctor: item.doctors ?? null,
  service: item.services ?? null,
}))
```

---

## 11. Slot Booking Logic

Slots are **NOT stored in the database**. They are calculated on the fly every time a date is selected.

### Complete flow
```
1. User opens NewAppointment
2. Selects a service → service.duration_minutes is needed for slot size
3. Selects a doctor
4. Selects a date (calendar picker)

5. SlotPicker component fetches two things in parallel:
   a) Doctor config: arrival_time='09:00', departure_time='18:00', 
                      slot_duration=30, working_days=['Mon','Tue',...]
                      breaks=[{start_time:'13:00', end_time:'14:00'}]
   b) Booked slots: getBookedSlots(doctorId, date)
      → SELECT start_time, end_time FROM appointments
        WHERE doctor_id=X AND date=Y 
        AND status IN ('pending','confirmed','rescheduled')

6. generateAvailableSlots() is called with this data
   → Iterates from arrival_time to departure_time in slot_duration steps
   → Removes slots in the past (if today's date)
   → Removes slots that overlap with any break
   → Removes slots that overlap with any existing appointment
   → Returns array of available start times: ['09:00','09:30','10:00',...]

7. SlotPicker renders the available times as clickable buttons
8. User clicks a slot → start_time='09:30'
   end_time = addMinutes(start_time, service.duration_minutes) = '10:00'

9. Form submits with: {doctor_id, patient_id, service_id, date, start_time, end_time, ...}
10. createAppointment() INSERTs into appointments table
```

---

## 12. Key Business Flows

### Flow 1: Book Appointment
1. Navigate to `/appointments/new`
2. **Patient section** — `PatientSearch` component: search existing patients by name/phone. If not found, fill in new patient fields (name, phone, DOB, gender). On submit, `createPatient()` is called first, then the patient ID is used.
3. **Service section** — Select from `useServices()` dropdown. Service determines slot duration.
4. **Doctor section** — `getDoctorsForService(clinicId, serviceId)` fetches only doctors who offer this service. Select a doctor.
5. **Date section** — Calendar picker. Only future dates are selectable.
6. **Time slot section** — `SlotPicker` shows available slots (see slot logic above).
7. **Submit** → `createAppointment()` → React Query invalidates `['appointments']` → success toast.

### Flow 2: Doctor Consultation (Doctor Portal)
1. Doctor logs in → directed to `/doctor` (DoctorDashboard)
2. `useDoctorContext()` fetches doctor profile: `doctors.where(user_id = auth.user.id).single()`
3. `useTodayQueue()` fetches today's appointments for this doctor (status: pending/confirmed/rescheduled)
4. Realtime subscription auto-updates the queue when any appointment changes
5. Doctor clicks "Start Consultation" → `ConsultationModal` opens
6. `useConsultation(appointmentId)` checks if consultation record already exists
7. Doctor fills: chief_complaint, examination_notes, diagnosis, prescription (drug rows), vitals
8. Auto-save runs every 30 seconds via `autosaveDraft()`
9. Doctor clicks "Complete" → `saveConsultation(draft, isComplete=true)` → updates `consultations` table + sets appointment.status='completed'

### Flow 3: Add Doctor Account
1. Admin goes to Settings → Team tab OR Doctors → Add Doctor
2. `AddDoctorModal` / `AddUserModal` collects: name, email, password, specialization, working hours, slot duration
3. Form validates via `addDoctorSchema` (zod)
4. `invokeCreateUser()` calls Supabase Edge Function `create-user`:
   - Edge Function uses `service_role` key (safe — runs server-side)
   - Creates auth user in `auth.users` table
   - Inserts row in `users` table with role='doctor'
   - Inserts row in `doctors` table
   - Links them: `users.doctor_id = doctors.id`, `doctors.user_id = users.id`
5. Doctor can now log in at `/login` and is directed to `/doctor`

### Flow 4: Generate Invoice
1. Admin opens AppointmentDetail → clicks "Generate Invoice" button
2. Navigates to `/invoices/new?appointmentId=UUID`
3. `InvoiceFormPage` reads `?appointmentId` from URL → pre-fills patient and appointment
4. Admin adds line items, sets discount (flat/percent), sets tax %
5. `generateInvoiceNumber()` tries Supabase RPC `generate_invoice_number()` first, falls back to counting existing invoices with same prefix
6. `createInvoice()` INSERTs into `invoices` table
7. Invoice can be viewed at `/invoices/:id` — PDF button renders via `@react-pdf/renderer`
8. Admin marks as paid: `markInvoicePaid()` sets status='paid', records payment_method and paid_at

### Flow 5: WhatsApp AI Bot
1. Patient sends WhatsApp message to clinic's number
2. Meta webhook → Supabase Edge Function `whatsapp-webhook` processes the message
3. Message is stored in `whatsapp_messages` table
4. If `whatsapp_conversations.ai_takeover_enabled = true`:
   - AI generates a reply using the clinic's `whatsapp_ai_config.system_prompt`
   - Reply stored as outbound message
5. `useWhatsAppRealtime()` in the Conversations page subscribes to `whatsapp_messages` inserts
6. On new inbound message: plays notification chime, shows browser notification (if tab is hidden)
7. Staff can reply manually via `MessageInput` → `useSendMessage()` → Edge Function `whatsapp-send`
8. Staff can toggle AI off → `useToggleAI()` sets `ai_takeover_enabled=false, status='open'`

---

## 13. Edge Functions

Edge Functions run on Deno/TypeScript server-side in Supabase. They have access to `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS — this is why user creation must happen in an Edge Function, not the frontend.

### `create-user`
- **Called from:** `api/createUser.ts` → `invokeCreateUser()`
- **Input:** `{ email, password, name, role, clinic_id, phone?, specialization?, qualification?, working_days?, arrival_time?, departure_time?, slot_duration?, max_appointments_per_day? }`
- **What it does:**
  1. Creates Supabase auth user with `admin.auth.createUser()`
  2. Inserts row in `users` table: `{ id: user.id, clinic_id, name, email, phone, role }`
  3. If role='doctor': also inserts row in `doctors` table with schedule fields
- **Output:** `{ user_id, doctor_id }`
- **Why Edge Function:** Frontend only has `anon` key → can't create auth users. Service role key must stay server-side.

### `whatsapp-webhook`
- **Called from:** Meta's WhatsApp Business API webhook
- **What it does:** Processes incoming messages → stores in `whatsapp_messages` → triggers AI reply if enabled
- Verifies webhook signature with `WHATSAPP_VERIFY_TOKEN`

### `whatsapp-send`
- **Called from:** `useSendMessage` hook and `useTestRule` when testing reminders
- **Input:** `{ conversation_id, content, clinic_id }`
- **What it does:** Sends a WhatsApp message via Meta API → stores as outbound message in DB

### `reminder-processor`
- **Triggered by:** pg_cron on a schedule (e.g., every 5 minutes)
- **What it does:** Finds `reminder_queue` rows with `status='pending'` and `scheduled_at <= now()` → sends via WhatsApp/SMS → updates status

---

## 14. Realtime Subscriptions

Three parts of the app use Supabase Postgres Changes (realtime):

| Hook | Table | Event | Effect |
|---|---|---|---|
| `useAppointments` | appointments | `*` | Invalidates `['appointments']` query |
| `useAdminDashboard` (useTodayAppointments) | appointments | `*` | Invalidates today's data |
| `useReceptionistDashboard` | appointments + patients | `*` + INSERT | Invalidates receptionist data |
| `useTodayQueue` | appointments | `*` | Re-fetches doctor's queue |
| `useReminderQueue` | reminder_queue | `*` | Invalidates reminder queue |
| `useWhatsAppRealtime` | whatsapp_messages + whatsapp_conversations | INSERT + UPDATE | Invalidates conversations; plays sound; shows browser notification |

Pattern:
```tsx
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` },
      () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
    )
    .subscribe()
  return () => supabase.removeChannel(channel)  // ALWAYS clean up
}, [clinic?.id, queryClient])
```

---

## 15. Common Mistakes to Avoid

### 1. Using 'clinic_admin' as a role value
**WRONG:** `if (role === 'clinic_admin')` or `.eq('role', 'clinic_admin')`
**RIGHT:** The DB only stores `'admin'`. Use `isRole('admin', 'clinic_admin')` for checks that need to be future-proof, or just `isRole('admin')` to match what's in the DB.

### 2. Using wrong column name: specialty vs specialization
**WRONG:** `doctor.specialty`, `.eq('specialty', value)`
**RIGHT:** `doctor.specialization` — that's the actual DB column name

### 3. Using wrong column name: amount vs total_amount
**WRONG:** `invoice.amount`, `.select('amount')`, `inv.amount`
**RIGHT:** `invoice.total_amount` — the DB column is `total_amount`

### 4. Using 'in_progress' as appointment status
**WRONG:** `.in('status', ['pending', 'confirmed', 'in_progress'])`
**RIGHT:** Valid statuses are `'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'`

### 5. Fetching appointments without joins
**WRONG:** `supabase.from('appointments').select('*')` → shows "Unknown patient" in UI
**RIGHT:** Always join patients, doctors, services (see Section 10)

### 6. Missing clinic_id in queries
**WRONG:** `supabase.from('patients').select('*')` → returns ALL clinics' patients
**RIGHT:** Always add `.eq('clinic_id', clinic.id)` — this is the multi-tenancy boundary

### 7. Querying `conversations` instead of `whatsapp_conversations`
The app has two tables: `conversations` (old/simple format used in `adminDashboard.ts` stats) and `whatsapp_conversations` (full format used in Conversations page). Use `whatsapp_conversations` for all messaging features.

### 8. Using 'manual' or other invalid appointment source
**Valid sources:** `'admin' | 'receptionist' | 'whatsapp' | 'website'`
**WRONG:** `source: 'manual'`, `source: 'phone'`

### 9. Forgetting to normalize joined Supabase data
Supabase returns joins as the table name (plural): `item.patients`, `item.doctors`, `item.services`
You must normalize: `patient: item.patients ?? null` before returning from API functions

### 10. Using service_role key in frontend
Never paste the service_role key in `.env` or any frontend file. It bypasses all Row Level Security. Use Edge Functions for any operation that requires service_role.

### 11. Debug console.log in production hooks
Hooks like `useDoctors` had a `console.log` debug statement. Always remove debug logs before committing.

### 12. Adding loading=true in onAuthStateChange
Adding `setIsLoading(true)` in the auth state change handler causes infinite loading. The SIGNED_IN event can fire when loading is already complete. The current auth setup carefully avoids this.

---

## 16. TypeScript Type Guide

### Where types live
| What | File | Export |
|---|---|---|
| `UserRole` | `types/index.ts` | `'super_admin' \| 'admin' \| 'receptionist' \| 'doctor'` |
| `AppointmentStatus` | `types/index.ts` | `'pending' \| 'confirmed' \| 'completed' \| 'cancelled' \| 'no_show' \| 'rescheduled'` |
| `AppointmentSource` | `types/index.ts` | `'admin' \| 'whatsapp' \| 'website' \| 'receptionist'` |
| `InvoiceStatus` | `types/index.ts` | `'draft' \| 'sent' \| 'paid' \| 'cancelled'` |
| `ClinicStatus` | `types/index.ts` | `'active' \| 'inactive' \| 'suspended'` |
| Full `Invoice` | `types/invoice.ts` | Exported as `RichInvoice` from index.ts |
| `Consultation`, `Vitals`, `Prescription` | `types/consultation.ts` | Also `Prescription` type |
| `WhatsAppConversation` | `types/whatsapp.ts` | |
| `ReminderRule`, `ReminderQueue` | `types/reminder.ts` | |
| `WaitlistEntry` | `types/waitlist.ts` | |
| `Service`, `ServiceCategory` | `types/service.ts` | |
| `ClinicNotificationSettings` | `types/settings.ts` | |

### Warning: consultation.ts has a legacy `Appointment` type
`src/types/consultation.ts` defines its own `Appointment` type (used in doctor portal) that has `scheduled_at` instead of `date`. The actual DB uses `date`. When data from the DB is mapped into these types in the doctor portal, the `date` field is used correctly — but be aware this local type is inconsistent with the main `Appointment` type in `types/index.ts`.

---

## 17. Deployment Checklist

Before deploying to production:

```
[ ] npm run build passes with 0 TypeScript errors and 0 build errors
[ ] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in Vercel/hosting env
[ ] Supabase Edge Functions deployed:
    supabase functions deploy create-user
    supabase functions deploy whatsapp-webhook
    supabase functions deploy whatsapp-send
    supabase functions deploy reminder-processor
[ ] Edge Function secrets set in Supabase dashboard:
    SUPABASE_SERVICE_ROLE_KEY
    WHATSAPP_VERIFY_TOKEN
    WHATSAPP_ACCESS_TOKEN
    OPENAI_API_KEY (for AI bot)
[ ] Row Level Security (RLS) policies enabled on all tables
[ ] pg_cron extension enabled (for reminder-processor scheduling)
[ ] WhatsApp webhook URL updated in Meta Business dashboard
[ ] generate_invoice_number() RPC function deployed (for sequential invoice numbers)
[ ] Supabase Realtime enabled for required tables
```
