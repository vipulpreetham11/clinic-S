-- CONSULTATIONS TABLE
create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  chief_complaint text,
  examination_notes text,
  diagnosis text,
  prescription jsonb,
  vitals jsonb,
  follow_up_date date,
  follow_up_notes text,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES for performance
create index if not exists consultations_appointment_id on consultations(appointment_id);
create index if not exists consultations_doctor_id on consultations(doctor_id, created_at desc);
create index if not exists consultations_patient_id on consultations(patient_id, created_at desc);
create index if not exists consultations_clinic_id on consultations(clinic_id);

-- ROW LEVEL SECURITY
alter table consultations enable row level security;

-- RLS POLICY: Doctor can only see their own consultations
create policy "doctor_own_consultations" on consultations
  for select
  using (
    doctor_id = (
      select id from doctors 
      where user_id = auth.uid() 
      and clinic_id = consultations.clinic_id
    )
  );

-- RLS POLICY: Doctor can only insert/update own consultations
create policy "doctor_insert_own_consultations" on consultations
  for insert
  with check (
    doctor_id = (
      select id from doctors 
      where user_id = auth.uid() 
      and clinic_id = consultations.clinic_id
    )
  );

create policy "doctor_update_own_consultations" on consultations
  for update
  using (
    doctor_id = (
      select id from doctors 
      where user_id = auth.uid() 
      and clinic_id = consultations.clinic_id
    )
  )
  with check (
    doctor_id = (
      select id from doctors 
      where user_id = auth.uid() 
      and clinic_id = consultations.clinic_id
    )
  );

-- ADMIN/SUPER_ADMIN can see all consultations in their clinic
create policy "admin_view_clinic_consultations" on consultations
  for select
  using (
    clinic_id = (select clinic_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('admin', 'super_admin')
  );
