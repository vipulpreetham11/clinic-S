-- ClinicOS Waitlist Database Tables
-- Tables for managing patient waitlist entries and notification tracking

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  doctor_id uuid references doctors(id),
  service_id uuid references services(id),
  preferred_date date,
  preferred_time_start time,
  preferred_time_end time,
  notes text,
  priority int default 0,
  status text default 'waiting',
  notified_at timestamptz,
  notified_channel text,
  booked_appointment_id uuid references appointments(id),
  expires_at date,
  position int,
  created_at timestamptz default now()
);

create table waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid references waitlist(id),
  clinic_id uuid references clinics(id),
  available_appointment_slot timestamptz,
  doctor_id uuid references doctors(id),
  status text default 'pending',
  created_at timestamptz default now()
);

-- Indexes for optimized queries
create index idx_waitlist_clinic_status on waitlist(clinic_id, status);
create index idx_waitlist_clinic_patient on waitlist(clinic_id, patient_id);
create index idx_waitlist_expires_at on waitlist(expires_at) where expires_at >= current_date;
create index idx_waitlist_notifications_clinic_status on waitlist_notifications(clinic_id, status);
