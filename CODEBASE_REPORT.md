# ClinicOS — Codebase Report
Generated: 2026-05-17

---

## How to Run the Project

```bash
cd clinic-crm
npm install        # if node_modules missing
npm run dev        # starts Vite dev server at http://localhost:5173
npm run build      # TypeScript compile + Vite production build
```

**Supabase setup:** paste `MASTER_SCHEMA.sql` (project root) into the Supabase SQL Editor and run it once on a fresh project. Then set your env vars in `clinic-crm/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Full File Tree (`src/` only)

```
src/
├── App.tsx                          — Root router, QueryClient setup, role-based redirects
├── App.css                          — Minimal global overrides
├── index.css                        — Tailwind directives + CSS variables
├── main.tsx                         — ReactDOM entry, wraps with AuthProvider
│
├── context/
│   └── AuthContext.tsx              — Auth state (user, profile, clinic, role), login/logout
│
├── lib/
│   ├── supabase.ts                  — Supabase JS client singleton
│   ├── utils.ts                     — cn() (clsx+twMerge), hexToHsl()
│   ├── businessHours.ts             — Business hours helpers
│   ├── csvExport.ts                 — CSV download utility
│   ├── formatTime.ts                — Time formatting helpers
│   ├── settingsSchemas.ts           — Zod schemas for settings forms
│   └── slotGenerator.ts             — Appointment slot generation logic
│
├── types/
│   ├── index.ts                     — All core types (Clinic, User, Doctor, Patient, Appointment…)
│   ├── consultation.ts              — Consultation, Prescription, Vitals types (local Appointment/Doctor/Patient stubs)
│   ├── invoice.ts                   — Rich Invoice type with line_items, tax, payment_method
│   ├── prescription.ts              — PrescriptionFrequency constants
│   ├── reminder.ts                  — ReminderRule, ReminderQueue, ReminderLog
│   ├── service.ts                   — Service, ServiceCategory, ServiceUpsertInput
│   ├── settings.ts                  — ClinicNotificationSettings, ClinicInvoiceSettings, BusinessHoursMap
│   ├── waitlist.ts                  — WaitlistEntry, WaitlistNotification
│   └── whatsapp.ts                  — WhatsAppConversation, WhatsAppMessage, WhatsAppAIConfig, WhatsAppTemplate
│
├── api/
│   ├── appointments.ts              — CRUD + filters for appointments, getBookedSlots, getDoctorLeaves
│   ├── clinics.ts                   — CRUD for clinics (super-admin ops)
│   ├── doctors.ts                   — CRUD for doctors, breaks, leaves, blocked dates, stats
│   ├── invoices.ts                  — Rich invoice CRUD, generate_invoice_number RPC, stats
│   ├── patients.ts                  — CRUD + search for patients
│   ├── services.ts                  — CRUD for services
│   ├── settings.ts                  — Clinic profile, users, notification/invoice settings
│   ├── superAdmin.ts                — Super-admin dashboard data
│   ├── adminDashboard.ts            — Admin dashboard stats
│   └── receptionistDashboard.ts     — Receptionist dashboard stats
│
├── hooks/
│   ├── useAppointments.ts           — useAppointments, useCreateAppointment, useUpdateStatus, etc.
│   ├── useAppointmentActions.ts     — Appointment action mutations (cancel, complete, reschedule)
│   ├── useRealtimeAppointments.ts   — Supabase realtime subscription for appointments
│   ├── useAuth.ts                   — Re-export / compatibility shim for useAuthContext
│   ├── useClinic.ts                 — Clinic data helpers
│   ├── useConsultation.ts           — Consultation CRUD
│   ├── useConversations.ts          — whatsapp_conversations queries + mutations
│   ├── useDoctorContext.ts          — Doctor-role context helpers
│   ├── useDoctorProfile.ts          — Doctor own profile data
│   ├── useDoctors.ts                — Doctor list/CRUD
│   ├── useInvoices.ts               — Invoice list/CRUD React Query wrappers
│   ├── useMessages.ts               — whatsapp_messages queries
│   ├── useMyPatients.ts             — Doctor's own patient list
│   ├── usePatients.ts               — Patient list/search/CRUD
│   ├── useReceptionistDashboard.ts  — Receptionist dashboard query
│   ├── useAdminDashboard.ts         — Admin dashboard query
│   ├── useReminderQueue.ts          — reminder_queue / reminder_rules / reminder_logs queries
│   ├── useReminders.ts              — Reminder rule CRUD + test rule mutation
│   ├── useReminderQueue.ts          — (see above, same file exports both)
│   ├── useSendMessage.ts            — Send WhatsApp message mutation
│   ├── useServices.ts               — Service list/CRUD
│   ├── useSettings.ts               — Settings page React Query wrappers
│   ├── useSuperAdmin.ts             — Super-admin data queries
│   ├── useTemplates.ts              — WhatsApp template CRUD
│   ├── useTodayQueue.ts             — Doctor's today queue
│   ├── useWaitlist.ts               — Waitlist CRUD
│   ├── useWhatsAppRealtime.ts       — Realtime subscription for WhatsApp messages
│   └── useWhatsAppSettings.ts       — WhatsApp AI config upsert
│
├── pages/
│   ├── auth/
│   │   └── Login.tsx                — Email/password login form
│   ├── super-admin/
│   │   ├── Dashboard.tsx            — Global stats, revenue chart, clinic list
│   │   ├── Clinics.tsx              — All clinics list
│   │   ├── CreateClinic.tsx         — New clinic form + seed data
│   │   └── ClinicDetail.tsx         — Single clinic detail/edit
│   ├── admin/
│   │   ├── Dashboard.tsx            — Admin KPIs, today schedule, weekly trend
│   │   ├── Settings.tsx             — Old settings page (legacy/redirect)
│   │   └── SetupWizard.tsx          — Onboarding wizard for new clinics
│   ├── settings/
│   │   └── SettingsPage.tsx         — Tabbed settings: profile, team, notifications, billing, danger
│   ├── appointments/
│   │   ├── AppointmentList.tsx      — List + timeline view, stats bar, filters, pagination
│   │   ├── NewAppointment.tsx       — Booking form: service→doctor→date→slot→patient
│   │   └── AppointmentDetail.tsx    — Detail sheet: cancel/complete/reschedule/notes
│   ├── doctors/
│   │   ├── DoctorList.tsx           — Doctor cards list
│   │   ├── DoctorForm.tsx           — Create/edit doctor form with service assignment
│   │   └── DoctorSchedule.tsx       — Doctor schedule management page
│   ├── patients/
│   │   ├── PatientList.tsx          — Patient search/list
│   │   └── PatientDetail.tsx        — Patient profile tabs (history, invoices, etc.)
│   ├── services/
│   │   ├── ServiceList.tsx          — Service list (imported by App.tsx as /services)
│   │   ├── index.tsx                — Duplicate ServiceList (not wired to router — dead code)
│   │   └── [id].tsx                 — Service detail/edit page (/services/:id)
│   ├── analytics/
│   │   └── Analytics.tsx            — Charts/stats for appointments and revenue
│   ├── reminders/
│   │   └── Reminders.tsx            — Reminder rules + queue + logs tabs
│   ├── waitlist/
│   │   └── Waitlist.tsx             — Waitlist table + add/notify modals
│   ├── conversations/
│   │   └── Conversations.tsx        — WhatsApp inbox: conversation list + message panel
│   ├── invoices/
│   │   ├── Invoices.tsx             — Invoice list with filters
│   │   ├── InvoiceFormPage.tsx      — Create/edit invoice with line items
│   │   └── InvoiceDetailPage.tsx    — Invoice detail + PDF download
│   ├── whatsapp/
│   │   └── WhatsAppSettings.tsx     — AI config + templates management
│   ├── doctor-portal/
│   │   ├── DoctorDashboard.tsx      — Doctor home: today queue + stats
│   │   ├── MySchedule.tsx           — Doctor's calendar with leave/block management
│   │   ├── MyPatients.tsx           — Doctor's patient list
│   │   └── DoctorProfile.tsx        — Doctor profile edit
│   ├── receptionist/
│   │   └── InvoicesStub.tsx         — Placeholder invoice page for receptionist role
│   └── ReceptionistDashboard.tsx    — Receptionist KPIs, today schedule, activity feed
│
├── components/
│   ├── layout/
│   │   ├── Layout.tsx               — App shell (sidebar + header + outlet)
│   │   ├── Sidebar.tsx              — Role-aware navigation sidebar
│   │   ├── Header.tsx               — Top bar with user menu
│   │   └── ProtectedRoute.tsx       — Role-gate wrapper for routes
│   ├── shared/
│   │   ├── ConfirmDialog.tsx        — Reusable destructive-action dialog
│   │   ├── EmptyState.tsx           — Empty state card with icon/action
│   │   ├── LoadingSpinner.tsx       — Centered spinner
│   │   └── PageHeader.tsx           — Page title + action slot
│   ├── appointments/
│   │   ├── AppointmentCard.tsx      — Card for timeline/list rendering
│   │   ├── AppointmentStatusBadge.tsx — Colored status badge
│   │   ├── PatientSearch.tsx        — Debounced patient search dropdown
│   │   ├── SlotPicker.tsx           — Slot grid grouped by morning/afternoon/evening
│   │   └── TimelineView.tsx         — CSS absolute-positioned timeline (7am–9pm)
│   ├── admin/
│   │   ├── DoctorStatusCard.tsx     — Doctor availability card for admin dashboard
│   │   ├── QuickStats.tsx           — KPI stat cards
│   │   ├── RecentActivity.tsx       — Audit/activity feed
│   │   ├── TodaySchedule.tsx        — Today's appointment table
│   │   └── WeeklyTrendChart.tsx     — Recharts bar/line chart
│   ├── doctors/
│   │   ├── BreakManager.tsx         — Add/remove lunch breaks
│   │   ├── ConsultationHistory.tsx  — Past consultation list
│   │   ├── ConsultationModal.tsx    — Consultation entry dialog
│   │   ├── DoctorAvatar.tsx         — Avatar with photo_url fallback
│   │   ├── DoctorCard.tsx           — Doctor summary card
│   │   ├── DoctorScheduleCalendar.tsx — Month calendar with appointment dots
│   │   ├── LeaveManager.tsx         — Leave request CRUD
│   │   ├── NextPatientPreview.tsx   — Next upcoming patient card
│   │   ├── PrescriptionBuilder.tsx  — Medicine prescription form
│   │   ├── PrintableSummary.tsx     — Printable consultation summary
│   │   ├── ServiceAssignment.tsx    — Checkbox list for doctor services
│   │   ├── TimeRangePicker.tsx      — Time range input pair
│   │   ├── TodayQueue.tsx           — Doctor's today queue list
│   │   ├── VitalsForm.tsx           — BP/temp/weight/SpO2 form
│   │   └── WorkingDaysSelector.tsx  — Day-of-week checkbox selector
│   ├── invoices/
│   │   ├── InvoiceForm.tsx          — Line items, discount, tax form
│   │   └── InvoicePDF.tsx           — @react-pdf/renderer PDF template
│   ├── patients/
│   │   ├── PatientCard.tsx          — Patient summary card
│   │   ├── PatientFormModal.tsx     — Add/edit patient dialog
│   │   └── PatientTabs.tsx          — Tabs: info, history, invoices, waitlist
│   ├── receptionist/
│   │   ├── ActivityFeed.tsx         — Recent activity list
│   │   ├── AppointmentDetailDrawer.tsx — Slide-out appointment detail
│   │   ├── AppointmentRowActions.tsx — Row action menu
│   │   ├── DoctorStatusCards.tsx    — Doctor availability cards
│   │   ├── KPIStrip.tsx             — Receptionist KPI bar
│   │   ├── QuickActionsBar.tsx      — Quick action buttons
│   │   ├── ReceptionistStatusBadge.tsx — Status badge
│   │   └── TodayScheduleTable.tsx   — Today's appointments table
│   ├── reminders/
│   │   ├── ReminderLogsTable.tsx    — Audit log table
│   │   ├── ReminderQueueTable.tsx   — Pending/sent queue table
│   │   ├── ReminderRulesTable.tsx   — Rule list with enable/disable
│   │   ├── RuleFormModal.tsx        — Create/edit reminder rule dialog
│   │   └── TestRuleModal.tsx        — Send test message dialog
│   ├── services/
│   │   ├── AddServiceModal.tsx      — Create/edit service dialog
│   │   ├── ServiceCard.tsx          — Mobile service card
│   │   └── ServiceForm.tsx          — Service form fields
│   ├── settings/
│   │   ├── BillingInvoiceTab.tsx    — Invoice prefix/tax/footer settings
│   │   ├── ClinicProfileTab.tsx     — Clinic name/address/hours/logo
│   │   ├── DangerZoneTab.tsx        — Export data / reset demo data
│   │   ├── InviteUserDialog.tsx     — Invite team member dialog
│   │   ├── NotificationsTab.tsx     — Notification preference toggles
│   │   ├── RemindersConfigTab.tsx   — Reminder rules management in settings
│   │   └── TeamUsersTab.tsx         — Team member list + invite
│   ├── super-admin/
│   │   ├── ClinicCard.tsx           — Clinic summary card
│   │   ├── ClinicStatusBadge.tsx    — Status badge (active/inactive/suspended)
│   │   ├── GlobalStatsCard.tsx      — Platform-wide stat card
│   │   └── RevenueChart.tsx         — Recharts revenue chart
│   ├── waitlist/
│   │   ├── AddWaitlistModal.tsx     — Add patient to waitlist
│   │   ├── NotifyWaitlistModal.tsx  — Notify a waitlist patient
│   │   ├── WaitlistNotificationBanner.tsx — Banner for pending notifications
│   │   ├── WaitlistStats.tsx        — Waitlist KPI strip
│   │   └── WaitlistTable.tsx        — Waitlist queue table
│   ├── whatsapp/
│   │   ├── AIConfigForm.tsx         — AI persona/system-prompt/handoff config
│   │   ├── AIToggle.tsx             — Toggle AI takeover per conversation
│   │   ├── ConnectionSetup.tsx      — WhatsApp Business API connection guide
│   │   ├── ConversationItem.tsx     — Single conversation row
│   │   ├── ConversationList.tsx     — Scrollable conversation list with filters
│   │   ├── ConversationPanel.tsx    — Right panel: messages + input
│   │   ├── MessageBubble.tsx        — Individual message bubble
│   │   ├── MessageInput.tsx         — Text input + template picker button
│   │   ├── TemplateManager.tsx      — CRUD for message templates
│   │   └── TemplatePickerModal.tsx  — Modal to pick a template when sending
│   └── ui/                          — Shadcn UI primitives (do not edit directly)
│       accordion, alert-dialog, alert, avatar, badge, button, calendar,
│       card, checkbox, dialog, drawer, dropdown-menu, form, input, label,
│       popover, progress, select, separator, sheet, skeleton, sonner,
│       switch, table, tabs, textarea
```

---

## What Each Module Does (1 line each)

| Module | What it does |
|---|---|
| **Auth** | Email/password login via Supabase Auth; role-based redirect on sign-in |
| **Super Admin** | Platform owner dashboard: manage all clinics, global revenue stats |
| **Clinics** | CRUD for clinic profiles, settings, logo upload |
| **Admin Dashboard** | KPI cards, today's schedule, weekly trend chart for clinic admin |
| **Setup Wizard** | Onboarding flow: create services, add doctors, configure hours |
| **Doctors** | Full doctor management: profile, working hours, breaks, leaves, service assignment |
| **Doctor Portal** | Doctor-role views: today queue, calendar, patients, consultation notes |
| **Services** | Clinic service catalog: name, category, duration, price, active/inactive |
| **Patients** | Patient profiles: demographics, history, invoices, waitlist |
| **Appointments** | Book/cancel/reschedule appointments; list + timeline views; stats |
| **Receptionist Dashboard** | Receptionist home: live queue, KPIs, quick actions |
| **Analytics** | Charts for appointment volume, revenue, cancellation rates |
| **WhatsApp + AI** | WhatsApp Business inbox; AI agent with handoff; message templates |
| **Reminders** | Rule-based reminder system (24hr/2hr before); queue + logs viewer |
| **Waitlist** | Patient waitlist with priority, auto-notify on cancellation slot |
| **Invoices + PDF** | Rich invoice creation (line items, tax, discount); PDF download |
| **Settings** | Clinic profile, team users, notification prefs, invoice defaults, danger zone |

---

## Fixes Made

### SQL (MASTER_SCHEMA.sql — new consolidated file)

1. **`doctor_leaves` table created** — was referenced in `api/doctors.ts` and `api/appointments.ts` but absent from all SQL files.

2. **`services.category` column added** — used throughout UI and API but missing from `schema.sql`.

3. **Extended `appointments` columns added** — `follow_up_date`, `follow_up_notes`, `completed_at`, `cancelled_at`, `cancellation_reason`, `whatsapp_message_id` were used in code but absent from schema.

4. **Extended `patients` columns added** — `allergies`, `blood_group`, `medical_history` used in appointment queries but absent from schema.

5. **`users.last_login` added** — updated on every login in `AuthContext.tsx` but absent from schema.

6. **Rich `invoices` table** — replaced the simple `schema.sql` version (just `amount`, `pdf_url`) with the full schema: `patient_id`, `invoice_number`, `line_items`, `subtotal`, `discount_amount`, `discount_type`, `tax_percent`, `tax_amount`, `total_amount`, `payment_method`, `paid_at`.

7. **`InvoiceStatus` corrected** — schema.sql had `pending|paid|cancelled`; code uses `draft|sent|paid|cancelled`. Master schema uses the code's values.

8. **Removed stale `conversations` table** — schema.sql had an old `conversations` table with `messages jsonb`/`is_ai_active` that conflicts with the `whatsapp_conversations` + `whatsapp_messages` split used by all code. Removed.

9. **Deduplicated tables** — `reminder_rules`, `reminder_queue`, `reminder_logs` were defined in both `reminder_tables.sql` and `20240518000000_reminders_waitlist.sql`. Merged into one authoritative definition.

10. **Deduplicated `waitlist` + `waitlist_notifications`** — defined in `schema.sql`, `waitlist_tables.sql`, and the migration. Merged.

11. **Deduplicated WhatsApp tables** — `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_ai_config`, `whatsapp_templates` were defined in both `whatsapp_migration.sql` (root) and `20240517000000_whatsapp_module.sql`. Root version used (matches TypeScript types).

12. **Fixed `whatsapp_migration.sql` RLS** — the migration file's policies referenced a `profiles` table (doesn't exist); all policies now use the correct `users` table.

13. **Fixed `queue_reminders_for_appointment` trigger** — the migration version checked `NEW.status != 'scheduled'` and used `NEW.scheduled_at`, neither of which exist in the real appointments schema. Fixed to check `pending|confirmed` status and use `(NEW.date::timestamptz + NEW.start_time::interval)`.

14. **Fixed `cancel_reminders_on_appointment_cancel` trigger** — checked `OLD.status = 'scheduled'`; fixed to `OLD.status in ('pending','confirmed')`.

15. **Fixed `check_waitlist_on_cancellation` trigger** — same `scheduled` status bug + the `waitlist_triggers.sql` (root) version referenced non-existent columns (`NEW.appointment_date`, `NEW.time_slot`, inserting `patient_id`/`appointment_date`/`time_slot` into `waitlist_notifications`). Fixed to use correct column names.

16. **Removed stale `notification_settings` RLS** — `schema.sql` had drop/create policies on `public.notification_settings` which doesn't exist. Replaced with `clinic_notification_settings`.

17. **Deferred FK from `users.doctor_id → doctors.id`** — these two tables reference each other; handled with a `DO $$ BEGIN ... END $$` block after both are created.

### TypeScript / Code

18. **`hooks/useReminders.ts` line 17** — Fixed broken Supabase join: `appointments(scheduled_at, notes)` → `appointments(date, start_time, notes)`. The `appointments` table has no `scheduled_at` column; this would return null data for every reminder queue item.

19. **`hooks/useReminders.ts` line 173** — Added explicit type `let convId: string | undefined` to remove TypeScript implicit-any hint.

---

## Things Still Broken / Needs Manual Attention

### High Priority

1. **`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars** must be set. Copy `clinic-crm/.env.example` to `.env` (or create `.env`) with your Supabase project values.

2. **`invoices` table — data migration needed if upgrading an existing project.** If you already have rows in `invoices` from the old simple schema, they won't have `invoice_number`, `line_items`, etc. For a fresh project this is fine; for an upgrade you need a migration script.

3. **`doctor_leaves` table missing from all existing Supabase projects** — if your Supabase project already ran `schema.sql`, you need to manually `CREATE TABLE doctor_leaves (...)` from `MASTER_SCHEMA.sql`. Otherwise the DoctorSchedule/leave management will return empty results silently (the API errors are caught and return `[]`).

4. **`services.category` column missing from existing Supabase projects** — if schema.sql was already applied, run: `ALTER TABLE services ADD COLUMN IF NOT EXISTS category text;`

5. **`appointments` extended columns missing** — run: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_date date, ADD COLUMN IF NOT EXISTS follow_up_notes text, ADD COLUMN IF NOT EXISTS completed_at timestamptz, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz, ADD COLUMN IF NOT EXISTS cancellation_reason text, ADD COLUMN IF NOT EXISTS whatsapp_message_id text;`

6. **`users.last_login` column missing** — run: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;`

7. **pg_cron reminder processor not wired** — reminders are queued in the DB but never actually sent until you: (a) enable pg_cron extension in Supabase dashboard, (b) deploy the `reminder-processor` Edge Function, (c) run the `cron.schedule(...)` call from the bottom of `MASTER_SCHEMA.sql` with your real project URL and service role key.

8. **WhatsApp Business API not connected** — the `whatsapp-send` Edge Function (invoked in `useReminders.ts`'s test-rule mutation) must be deployed to Supabase Functions. The frontend UI for WhatsApp is complete; the backend webhook + message-send function is missing.

### Medium Priority

9. **`pages/services/index.tsx` is dead code** — a full duplicate of `ServiceList.tsx` that's not imported by `App.tsx`. Either delete it or wire it to the router instead of `ServiceList.tsx`.

10. **Duplicate routes in `App.tsx`** — `/services` and `/services/:id` are defined in both the admin-only block and the admin+receptionist block. Receptionists will correctly hit the second block, but it's confusing. Consider moving services routes to the shared `admin|receptionist` block only.

11. **`types/consultation.ts` defines local `Appointment` type** with a `scheduled_at` field (wrong) that shadows the real `Appointment` type from `types/index.ts`. Any component importing from `consultation.ts` that also uses appointment data may get the wrong shape. Should be removed or converted to an alias.

12. **`api/settings.ts` — `inviteClinicUser` uses `supabase.auth.signUp` from the client.** This is fine for development but in production you should use the Admin API (service role) so users don't get a confirmation email before their profile exists.

13. **`src/pages/admin/Settings.tsx`** — appears to be a legacy settings page. `App.tsx` routes both `/settings` (SettingsPage) and `/admin/settings` (Settings). The old `Settings.tsx` may be stale.

14. **`Conversation` type in `types/index.ts`** maps to the removed old `conversations` table (with `messages jsonb`, `is_ai_active`, `last_message`). The type is exported but never used by any hook or component (all WhatsApp code uses `WhatsAppConversation` from `types/whatsapp.ts`). It's harmless but should be cleaned up.

15. **Realtime subscriptions** — the `alter publication supabase_realtime add table ...` lines at the bottom of MASTER_SCHEMA.sql are commented out. Run them manually to enable live message updates in the WhatsApp inbox.

### Low Priority

16. **`reminder_seed.sql` (root)** used single-brace `{patient_name}` placeholders; the master schema uses double-brace `{{patient_name}}`. If you ran the old seed, update your reminder rules' `message_template` values.

17. **`pgcron_reminder_setup.sql` (root)** still has placeholder `[YOUR_PROJECT]` and `[SERVICE_ROLE_KEY]` — it's a documentation file, not runnable as-is. Use the commented block at the bottom of `MASTER_SCHEMA.sql` instead.

18. **No TypeScript generated types from Supabase** — `types/consultation.ts` has a comment `// supabase.types not generated yet`. Run `supabase gen types typescript --project-id ...` to get auto-generated types and reduce manual type maintenance.

---

## SQL Files Summary (what each one was / what happened to it)

| File | Status |
|---|---|
| `schema.sql` | Base schema — superseded by MASTER_SCHEMA.sql |
| `consultations_table.sql` | Consultations table + RLS — merged into MASTER_SCHEMA.sql |
| `reminder_tables.sql` | Reminder tables only — merged into MASTER_SCHEMA.sql |
| `reminder_triggers.sql` | Reminder trigger functions — merged + fixed into MASTER_SCHEMA.sql |
| `reminder_seed.sql` | `seed_reminder_rules()` function — merged into MASTER_SCHEMA.sql |
| `pgcron_reminder_setup.sql` | Documentation for pg_cron setup — superseded by MASTER_SCHEMA.sql footer |
| `waitlist_tables.sql` | Waitlist tables — merged into MASTER_SCHEMA.sql |
| `waitlist_triggers.sql` | **Buggy** — referenced wrong column names; fixed version in MASTER_SCHEMA.sql |
| `whatsapp_migration.sql` | WhatsApp tables + RLS (had `profiles` bug) — fixed + merged |
| `clinic-crm/invoice_number_function.sql` | `generate_invoice_number()` — merged into MASTER_SCHEMA.sql |
| `supabase/migrations/20240517000000_whatsapp_module.sql` | Alternate WhatsApp schema (used `profiles` table, different template schema) — superseded |
| `supabase/migrations/20240518000000_reminders_waitlist.sql` | Reminders + waitlist (had `scheduled_at` bug) — fixed + merged |
| `supabase/migrations/20240519000000_clinic_settings.sql` | Clinic settings tables — merged into MASTER_SCHEMA.sql |
| **`MASTER_SCHEMA.sql`** | **NEW — single authoritative file, run this** |
