# BUGS_FOUND.md — ClinicOS Full Codebase Audit

## BUG 1 — Wrong role string in getPlatformStats
**File:** `src/api/superAdmin.ts:150`  
**Status:** FIXED  
**Description:** `getPlatformStats()` queried `users.role = 'clinic_admin'` to count clinic admins, but the DB stores role as `'admin'`. This made `total_clinic_admins` always return 0.  
**Before:** `.eq('role', 'clinic_admin')`  
**After:** `.eq('role', 'admin')`

---

## BUG 2 — Invalid appointment status in useTodayQueue
**File:** `src/hooks/useTodayQueue.ts:36`  
**Status:** FIXED  
**Description:** Status filter included `'in_progress'` which is not a valid `AppointmentStatus` (types are `pending | confirmed | completed | cancelled | no_show | rescheduled`). This caused rescheduled appointments to be silently excluded from the doctor's today queue.  
**Before:** `.in('status', ['pending', 'confirmed', 'in_progress'])`  
**After:** `.in('status', ['pending', 'confirmed', 'rescheduled'])`

---

## BUG 3 — "Generate Invoice" button unwired
**File:** `src/pages/appointments/AppointmentDetail.tsx:427`  
**Status:** FIXED  
**Description:** The "Generate Invoice" button rendered with no `onClick` handler. Clicking it did nothing.  
**Before:** `<Button variant="outline" size="sm" className="gap-1.5">`  
**After:** Added `onClick={() => navigate('/invoices/new?appointmentId=' + appt.id)}`

---

## BUG 4 — handleViewHistory console.log in DoctorDashboard
**File:** `src/pages/doctor-portal/DoctorDashboard.tsx:28`  
**Status:** FIXED  
**Description:** `handleViewHistory` called `console.log` instead of navigating to the patient profile. Clicking "View History" from today's queue did nothing visible.  
**Before:** `console.log('View history for patient:', patientId)`  
**After:** `navigate('/patients/' + patientId)`

---

## BUG 5 — handleViewHistory console.log in MySchedule
**File:** `src/pages/doctor-portal/MySchedule.tsx:22`  
**Status:** FIXED  
**Description:** Same issue as BUG 4 — `handleViewHistory` was a no-op `console.log` instead of navigating.  
**Before:** `console.log('View history for patient:', patientId)`  
**After:** `navigate('/patients/' + patientId)`

---

## BUG 6 — View button in MyPatients has no onClick
**File:** `src/pages/doctor-portal/MyPatients.tsx:88`  
**Status:** FIXED  
**Description:** The "View" button in the patient table row had no `onClick` handler — clicking it did nothing.  
**Before:** `<button className="text-blue-600 ...">View</button>`  
**After:** Added `onClick={() => navigate('/patients/' + patient.id)}`

---

## BUG 7 — Wrong DB column name in activity feed invoice query
**File:** `src/api/receptionistDashboard.ts:271,343`  
**Status:** FIXED  
**Description:** The activity feed invoice query selected `amount` and used `inv.amount`, but the DB column is `total_amount`. All invoice amounts in the receptionist activity feed showed as 0.  
**Before:** `.select('id, amount, created_at, appointment_id')` / `inv.amount ?? 0`  
**After:** `.select('id, total_amount, created_at, appointment_id')` / `inv.total_amount ?? 0`

---

## BUG 8 — Base Invoice type uses wrong field name
**File:** `src/types/index.ts:222`  
**Status:** FIXED  
**Description:** The base `Invoice` interface declared `amount: number | null`, but the actual DB column and the rich invoice type (`src/types/invoice.ts`) both use `total_amount`. Any code using the base `Invoice` type would silently use the wrong field.  
**Before:** `amount: number | null`  
**After:** `total_amount: number | null`
