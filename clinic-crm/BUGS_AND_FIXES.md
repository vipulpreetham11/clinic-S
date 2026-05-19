# BUGS AND FIXES

All bugs found during codebase audit and handbook generation. Bugs are ordered by severity (Auth → Data → Routing → UI → Code Quality).

| # | Bug | File | Line | Wrong | Fixed |
|---|-----|------|------|-------|-------|
| 1 | Platform stats always showed 0 clinic admins | `src/api/superAdmin.ts` | 150 | `.eq('role', 'clinic_admin')` | `.eq('role', 'admin')` |
| 2 | Doctor queue silently dropped rescheduled appointments | `src/hooks/useTodayQueue.ts` | 36 | `.in('status', ['pending', 'confirmed', 'in_progress'])` | `.in('status', ['pending', 'confirmed', 'rescheduled'])` |
| 3 | Receptionist activity feed always showed ₹0 for invoices | `src/api/receptionistDashboard.ts` | 271 | `.select('id, amount, created_at, appointment_id')` | `.select('id, total_amount, created_at, appointment_id')` |
| 4 | Receptionist activity feed used wrong field for amount | `src/api/receptionistDashboard.ts` | 343 | `inv.amount ?? 0` | `inv.total_amount ?? 0` |
| 5 | Base Invoice type had wrong column name | `src/types/index.ts` | 222 | `amount: number \| null` | `total_amount: number \| null` |
| 6 | CSV invoice export had wrong column name | `src/lib/csvExport.ts` | 62 | `'id', 'appointment_id', 'amount', 'status', 'created_at'` | `'id', 'appointment_id', 'total_amount', 'status', 'created_at'` |
| 7 | "Generate Invoice" button on appointment detail did nothing | `src/pages/appointments/AppointmentDetail.tsx` | 427 | `<Button variant="outline" size="sm" className="gap-1.5">` | Added `onClick={() => navigate('/invoices/new?appointmentId=${appt.id}')}` |
| 8 | Doctor dashboard "View History" link did nothing | `src/pages/doctor-portal/DoctorDashboard.tsx` | 28 | `console.log('View history for patient:', patientId)` | `navigate('/patients/${patientId}')` + added `useNavigate` import |
| 9 | My Schedule "View History" link did nothing | `src/pages/doctor-portal/MySchedule.tsx` | 22 | `console.log('View history for patient:', patientId)` | `navigate('/patients/${patientId}')` + added `useNavigate` import |
| 10 | My Patients "View" button had no onClick handler | `src/pages/doctor-portal/MyPatients.tsx` | 88 | `<button className="text-blue-600 ...">` (no onClick) | Added `onClick={() => navigate('/patients/${patient.id}')}` + `useNavigate` import |
| 11 | Debug console.log left in production data hook | `src/hooks/useDoctors.ts` | 11 | `console.log('[useDoctors] clinic_id:', clinicId, ...)` | Removed entirely |

## Root Causes

| Root Cause | Bugs |
|------------|------|
| DB column is `total_amount`, code used `amount` | #3, #4, #5, #6 |
| Invalid appointment status `'in_progress'` (not in DB enum) | #2 |
| Legacy `'clinic_admin'` role string never stored in DB | #1 |
| Unwired UI buttons (onClick never attached) | #7, #8, #9, #10 |
| Debug log not removed before commit | #11 |

## Build Status

After all fixes: `npm run build` → **✓ 0 TypeScript errors** (`built in ~2.5s`).
