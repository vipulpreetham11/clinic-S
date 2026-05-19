# FIXES_APPLIED.md — ClinicOS Full Codebase Audit

All fixes verified with `npm run build` → ✓ 0 TypeScript errors, 0 build errors.

---

## FIX 1 — superAdmin.ts: wrong role string
**File:** `src/api/superAdmin.ts:150`
```diff
- supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'clinic_admin').eq('is_active', true),
+ supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true),
```

---

## FIX 2 — useTodayQueue.ts: invalid status value
**File:** `src/hooks/useTodayQueue.ts:36`
```diff
- .in('status', ['pending', 'confirmed', 'in_progress'])
+ .in('status', ['pending', 'confirmed', 'rescheduled'])
```

---

## FIX 3 — AppointmentDetail.tsx: wire Generate Invoice button
**File:** `src/pages/appointments/AppointmentDetail.tsx:427`
```diff
- <Button variant="outline" size="sm" className="gap-1.5">
+ <Button variant="outline" size="sm" className="gap-1.5"
+   onClick={() => navigate(`/invoices/new?appointmentId=${appt.id}`)}>
```

---

## FIX 4 — DoctorDashboard.tsx: fix handleViewHistory
**File:** `src/pages/doctor-portal/DoctorDashboard.tsx`
```diff
+ import { useNavigate } from 'react-router-dom';
...
+ const navigate = useNavigate();
...
  const handleViewHistory = (patientId: string) => {
-   console.log('View history for patient:', patientId);
+   navigate(`/patients/${patientId}`);
  };
```

---

## FIX 5 — MySchedule.tsx: fix handleViewHistory
**File:** `src/pages/doctor-portal/MySchedule.tsx`
```diff
+ import { useNavigate } from 'react-router-dom';
...
+ const navigate = useNavigate();
...
  const handleViewHistory = (patientId: string) => {
-   console.log('View history for patient:', patientId);
+   navigate(`/patients/${patientId}`);
  };
```

---

## FIX 6 — MyPatients.tsx: wire View button
**File:** `src/pages/doctor-portal/MyPatients.tsx`
```diff
+ import { useNavigate } from 'react-router-dom';
...
+ const navigate = useNavigate();
...
- <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
+ <button
+   className="text-blue-600 hover:text-blue-800 text-sm font-medium"
+   onClick={() => navigate(`/patients/${patient.id}`)}
+ >
```

---

## FIX 7 — receptionistDashboard.ts: correct DB column name
**File:** `src/api/receptionistDashboard.ts:271,343`
```diff
- .select('id, amount, created_at, appointment_id')
+ .select('id, total_amount, created_at, appointment_id')
...
- message: `Invoice generated — ₹${inv.amount ?? 0}${aptRef ? ` — ${aptRef}` : ''}`,
+ message: `Invoice generated — ₹${inv.total_amount ?? 0}${aptRef ? ` — ${aptRef}` : ''}`,
```

---

## FIX 8 — types/index.ts: base Invoice type field name
**File:** `src/types/index.ts:222`
```diff
  export interface Invoice {
    id: string
    clinic_id: string | null
    appointment_id: string | null
-   amount: number | null
+   total_amount: number | null
    status: InvoiceStatus
    pdf_url: string | null
    created_at: string
  }
```

---

## Previously fixed (prior sessions)

- **App.tsx ROLE_HOME:** `admin: '/admin'` → `admin: '/dashboard'`, `clinic_admin: '/admin'` → `clinic_admin: '/dashboard'`
- **ProtectedRoute.tsx:** Role-based redirect now correctly sends `admin` and `clinic_admin` to `/dashboard`
- **DoctorForm.tsx:** `isRole('admin')` → `isRole('admin', 'clinic_admin')`
- **DoctorSchedule.tsx:** All 7 `isRole('admin')` → `isRole('admin', 'clinic_admin')`
- **DoctorScheduleCalendar.tsx:** All 3 `isRole('admin')` → `isRole('admin', 'clinic_admin')`
