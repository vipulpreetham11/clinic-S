-- 1. CLINICS (one per client)
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#2A8C78',
  address text,
  phone text,
  whatsapp text,
  email text,
  timezone text default 'Asia/Kolkata',
  working_days text[] default array['Mon','Tue','Wed','Thu','Fri','Sat'],
  opening_time text default '09:00',
  closing_time text default '18:00',
  status text default 'active',
  created_at timestamptz default now()
);

-- 2. USERS (all roles)
create table users (
  id uuid primary key references auth.users(id),
  clinic_id uuid references clinics(id),
  name text not null,
  email text unique not null,
  phone text,
  role text not null check (role in ('super_admin','admin','receptionist','doctor')),
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. DOCTORS
create table doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  user_id uuid references users(id),
  name text not null,
  specialization text,
  qualification text,
  phone text,
  photo_url text,
  working_days text[] default array['Mon','Tue','Wed','Thu','Fri','Sat'],
  arrival_time text default '09:00',
  departure_time text default '18:00',
  slot_duration int default 30,
  max_appointments_per_day int default 20,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. DOCTOR BREAKS
create table doctor_breaks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id),
  label text default 'Lunch',
  start_time text not null,
  end_time text not null
);

-- 5. SERVICES
create table services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  name text not null,
  description text,
  duration_minutes int not null,
  price decimal(10,2),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 6. DOCTOR SERVICES (which doctor does which service)
create table doctor_services (
  doctor_id uuid references doctors(id),
  service_id uuid references services(id),
  primary key (doctor_id, service_id)
);

-- 7. PATIENTS
create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  gender text,
  address text,
  notes text,
  is_vip boolean default false,
  created_at timestamptz default now(),
  unique(clinic_id, phone)
);

-- 8. APPOINTMENTS
create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  doctor_id uuid references doctors(id),
  patient_id uuid references patients(id),
  service_id uuid references services(id),
  date date not null,
  start_time text not null,
  end_time text not null,
  status text default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show','rescheduled')),
  source text default 'admin' check (source in ('admin','whatsapp','website','receptionist')),
  notes text,
  booked_by uuid references users(id),
  created_at timestamptz default now()
);

-- 9. REMINDERS
create table reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id),
  clinic_id uuid references clinics(id),
  type text check (type in ('24hr','1hr','custom')),
  channel text default 'whatsapp',
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text default 'pending' check (status in ('pending','sent','failed','cancelled')),
  created_at timestamptz default now()
);

-- 10. BLOCKED DATES
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  doctor_id uuid references doctors(id),
  date date not null,
  reason text,
  created_at timestamptz default now()
);

-- 11. WAITLIST
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  service_id uuid references services(id),
  doctor_id uuid references doctors(id),
  preferred_date date,
  preferred_time text,
  status text default 'waiting' check (status in ('waiting','notified','booked','expired','cancelled')),
  created_at timestamptz default now()
);

-- 12. CONVERSATIONS (WhatsApp)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  patient_phone text not null,
  patient_name text,
  messages jsonb default '[]',
  last_message text,
  last_message_at timestamptz,
  is_ai_active boolean default true,
  created_at timestamptz default now()
);

-- 13. INVOICES
create table invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  appointment_id uuid references appointments(id),
  amount decimal(10,2),
  status text default 'pending' check (status in ('pending','paid','cancelled')),
  pdf_url text,
  created_at timestamptz default now()
);

-- 14. AUDIT LOGS
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  user_id uuid references users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);

-- INDEXES for performance
create index on appointments(clinic_id, date);
create index on appointments(doctor_id, date);
create index on appointments(patient_id);
create index on patients(clinic_id, phone);
create index on conversations(clinic_id, patient_phone);

-- ROW LEVEL SECURITY
alter table clinics enable row level security;
alter table users enable row level security;
alter table doctors enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table patients enable row level security;
alter table reminders enable row level security;
alter table blocked_dates enable row level security;
alter table waitlist enable row level security;
alter table conversations enable row level security;
alter table invoices enable row level security;
alter table audit_logs enable row level security;

-- RLS POLICIES (clinic isolation)
-- Users can only see their own clinic's data
create policy "clinic_isolation" on appointments
  using (clinic_id = (select clinic_id from users where id = auth.uid()));

create policy "clinic_isolation" on patients
  using (clinic_id = (select clinic_id from users where id = auth.uid()));

create policy "clinic_isolation" on doctors
  using (clinic_id = (select clinic_id from users where id = auth.uid()));

create policy "clinic_isolation" on services
  using (clinic_id = (select clinic_id from users where id = auth.uid()));

create policy "clinic_isolation" on conversations
  using (clinic_id = (select clinic_id from users where id = auth.uid()));

-- Super admin can see everything
create policy "super_admin_all" on clinics
  using (
    (select role from users where id = auth.uid()) = 'super_admin'
    or id = (select clinic_id from users where id = auth.uid())
  );

-- Super admin clinic creation flow policies
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert
  with check (
    auth.uid() = id
    or (select role from public.users where id = auth.uid()) = 'super_admin'
  );

drop policy if exists "clinics_all_super_admin" on public.clinics;
drop policy if exists "clinics_super_admin_all" on public.clinics;
create policy "clinics_super_admin_all" on public.clinics
  for all
  using ((select role from public.users where id = auth.uid()) = 'super_admin');

drop policy if exists "notification_settings_all" on public.notification_settings;
drop policy if exists "notification_settings_insert" on public.notification_settings;
create policy "notification_settings_insert" on public.notification_settings
  for all
  using (true);
