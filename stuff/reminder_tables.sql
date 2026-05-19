-- Reminder system tables for ClinicOS

create table reminder_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  name text not null,
  trigger_type text not null,
  offset_hours int not null,
  channel text[] default '{whatsapp}',
  message_template text not null,
  is_active boolean default true,
  days_of_week int[] default '{0,1,2,3,4,5,6}',
  created_at timestamptz default now()
);

create table reminder_queue (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  appointment_id uuid references appointments(id),
  patient_id uuid references patients(id),
  rule_id uuid references reminder_rules(id),
  channel text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text default 'pending',
  error_message text,
  message_content text,
  whatsapp_message_id text,
  created_at timestamptz default now()
);

create table reminder_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_queue_id uuid references reminder_queue(id),
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  channel text,
  message_content text,
  status text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_reminder_rules_clinic_active on reminder_rules(clinic_id, is_active);
create index idx_reminder_queue_clinic_status_scheduled on reminder_queue(clinic_id, status, scheduled_at);
create index idx_reminder_queue_appointment on reminder_queue(appointment_id);
create index idx_reminder_logs_clinic_created on reminder_logs(clinic_id, created_at desc);
