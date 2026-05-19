-- ============================================================================
-- CLINICOS — MASTER SCHEMA
-- Generated: 2026-05-17
-- Safe to run on a fresh Supabase project.
-- All statements use CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE FUNCTION.
-- Run the entire file in Supabase SQL Editor.
-- ============================================================================
-- ORDER: Extensions → Tables (dependency order) → Indexes → RLS → Functions
--        → Triggers → Seed functions → pg_cron (manual step, see bottom)
-- ============================================================================

-- ============================================================================
-- SECTION: Extensions
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_net";     -- net.http_post() for cron HTTP calls
-- NOTE: pg_cron must be enabled in Supabase Dashboard → Extensions before
-- running the cron.schedule() call at the bottom of this file.

-- ============================================================================
-- SECTION: Clinics
-- ============================================================================

create table if not exists clinics (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text unique not null,
  logo_url             text,
  primary_color        text default '#2A8C78',
  address              text,
  phone                text,
  whatsapp             text,
  email                text,
  website              text,
  gstin                text,
  timezone             text default 'Asia/Kolkata',
  working_days         text[] default array['Mon','Tue','Wed','Thu','Fri','Sat'],
  opening_time         text default '09:00',
  closing_time         text default '18:00',
  default_slot_duration int default 30,
  currency             text default 'INR',
  business_hours       jsonb default '{}'::jsonb,
  status               text default 'active'
                         check (status in ('active','inactive','suspended')),
  created_at           timestamptz default now()
);

-- ============================================================================
-- SECTION: Users (all roles — mirrors auth.users)
-- ============================================================================

create table if not exists users (
  id          uuid primary key references auth.users(id) on delete cascade,
  clinic_id   uuid references clinics(id) on delete set null,
  name        text not null,
  email       text unique not null,
  phone       text,
  role        text not null
                check (role in ('super_admin','admin','receptionist','doctor')),
  avatar_url  text,
  doctor_id   uuid,                          -- filled in after doctors row created
  is_active   boolean default true,
  last_login  timestamptz,
  created_at  timestamptz default now()
);

-- ============================================================================
-- SECTION: Doctors
-- ============================================================================

create table if not exists doctors (
  id                       uuid primary key default gen_random_uuid(),
  clinic_id                uuid references clinics(id) on delete cascade,
  user_id                  uuid references users(id) on delete set null,
  name                     text not null,
  specialization           text,
  qualification            text,
  phone                    text,
  photo_url                text,
  working_days             text[] default array['Mon','Tue','Wed','Thu','Fri','Sat'],
  arrival_time             text default '09:00',
  departure_time           text default '18:00',
  slot_duration            int default 30,
  max_appointments_per_day int default 20,
  is_active                boolean default true,
  created_at               timestamptz default now()
);

-- Add FK from users.doctor_id → doctors.id (deferred because users created first)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'users_doctor_id_fkey'
  ) then
    alter table users
      add constraint users_doctor_id_fkey
      foreign key (doctor_id) references doctors(id) on delete set null;
  end if;
end $$;

-- ============================================================================
-- SECTION: Doctor Breaks & Leaves
-- ============================================================================

create table if not exists doctor_breaks (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid references doctors(id) on delete cascade,
  label      text default 'Lunch',
  start_time text not null,
  end_time   text not null
);

create table if not exists doctor_leaves (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references doctors(id) on delete cascade,
  clinic_id   uuid references clinics(id) on delete cascade,
  from_date   date not null,
  to_date     date not null,
  reason      text,
  created_at  timestamptz default now()
);

-- ============================================================================
-- SECTION: Services
-- ============================================================================

create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid references clinics(id) on delete cascade,
  name             text not null,
  category         text,                          -- General | Consultation | Procedure | Lab Test | Package | Other
  description      text,
  duration_minutes int not null,
  price            decimal(10,2),
  is_active        boolean default true,
  created_at       timestamptz default now()
);

-- Doctor ↔ Service junction
create table if not exists doctor_services (
  doctor_id  uuid references doctors(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (doctor_id, service_id)
);

-- ============================================================================
-- SECTION: Patients
-- ============================================================================

create table if not exists patients (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid references clinics(id) on delete cascade,
  name            text not null,
  phone           text not null,
  email           text,
  date_of_birth   date,
  gender          text,
  address         text,
  notes           text,
  is_vip          boolean default false,
  allergies       text,
  blood_group     text,
  medical_history text,
  created_at      timestamptz default now(),
  unique(clinic_id, phone)
);

-- ============================================================================
-- SECTION: Blocked Dates
-- ============================================================================

create table if not exists blocked_dates (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid references clinics(id) on delete cascade,
  doctor_id  uuid references doctors(id) on delete cascade,
  date       date not null,
  reason     text,
  created_at timestamptz default now()
);

-- ============================================================================
-- SECTION: Appointments
-- ============================================================================

create table if not exists appointments (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid references clinics(id) on delete cascade,
  doctor_id           uuid references doctors(id) on delete set null,
  patient_id          uuid references patients(id) on delete set null,
  service_id          uuid references services(id) on delete set null,
  date                date not null,
  start_time          text not null,
  end_time            text not null,
  status              text default 'pending'
                        check (status in ('pending','confirmed','completed',
                                          'cancelled','no_show','rescheduled')),
  source              text default 'admin'
                        check (source in ('admin','whatsapp','website','receptionist')),
  notes               text,
  booked_by           uuid references users(id) on delete set null,
  -- Extended fields (added via migrations)
  follow_up_date      date,
  follow_up_notes     text,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancellation_reason text,
  whatsapp_message_id text,
  created_at          timestamptz default now()
);

-- ============================================================================
-- SECTION: Consultations (doctor notes per appointment)
-- ============================================================================

create table if not exists consultations (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references appointments(id) on delete cascade,
  clinic_id         uuid not null references clinics(id) on delete cascade,
  doctor_id         uuid not null references doctors(id) on delete cascade,
  patient_id        uuid not null references patients(id) on delete cascade,
  chief_complaint   text,
  examination_notes text,
  diagnosis         text,
  prescription      jsonb,                   -- array of { medicine, dosage, frequency, duration, instructions }
  vitals            jsonb,                   -- { bp_sys, bp_dia, temp, weight, spo2, pulse }
  follow_up_date    date,
  follow_up_notes   text,
  internal_notes    text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================================
-- SECTION: Reminders
-- ============================================================================

create table if not exists reminder_rules (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid references clinics(id) on delete cascade,
  name             text not null,
  trigger_type     text not null,     -- appointment_upcoming | appointment_followup | custom
  offset_hours     int not null,      -- -24 = 24 hrs before, 48 = 48 hrs after
  channel          text[] default '{whatsapp}',
  message_template text not null,     -- uses {{patient_name}}, {{doctor}}, {{date}}, {{time}}, {{clinic_name}}
  is_active        boolean default true,
  days_of_week     int[] default '{0,1,2,3,4,5,6}',
  created_at       timestamptz default now()
);

create table if not exists reminder_queue (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid references clinics(id) on delete cascade,
  appointment_id      uuid references appointments(id) on delete cascade,
  patient_id          uuid references patients(id) on delete cascade,
  rule_id             uuid references reminder_rules(id) on delete cascade,
  channel             text not null,
  scheduled_at        timestamptz not null,
  sent_at             timestamptz,
  status              text default 'pending',   -- pending | sent | failed | skipped | cancelled
  error_message       text,
  message_content     text,
  whatsapp_message_id text,
  created_at          timestamptz default now()
);

create table if not exists reminder_logs (
  id                uuid primary key default gen_random_uuid(),
  reminder_queue_id uuid references reminder_queue(id) on delete set null,
  clinic_id         uuid references clinics(id) on delete cascade,
  patient_id        uuid references patients(id) on delete cascade,
  channel           text,
  message_content   text,
  status            text,
  sent_at           timestamptz,
  created_at        timestamptz default now()
);

-- ============================================================================
-- SECTION: Waitlist
-- ============================================================================

create table if not exists waitlist (
  id                    uuid primary key default gen_random_uuid(),
  clinic_id             uuid references clinics(id) on delete cascade,
  patient_id            uuid references patients(id) on delete cascade,
  doctor_id             uuid references doctors(id) on delete set null,
  service_id            uuid references services(id) on delete set null,
  preferred_date        date,
  preferred_time_start  time,
  preferred_time_end    time,
  notes                 text,
  priority              int default 0,        -- 0=normal, 1=high, 2=urgent
  status                text default 'waiting'
                          check (status in ('waiting','notified','booked','expired','cancelled')),
  notified_at           timestamptz,
  notified_channel      text,
  booked_appointment_id uuid references appointments(id) on delete set null,
  expires_at            date,
  position              int,
  created_at            timestamptz default now()
);

create table if not exists waitlist_notifications (
  id                       uuid primary key default gen_random_uuid(),
  waitlist_id              uuid references waitlist(id) on delete cascade,
  clinic_id                uuid references clinics(id) on delete cascade,
  available_appointment_slot timestamptz,
  doctor_id                uuid references doctors(id) on delete set null,
  status                   text default 'pending',  -- pending | sent | expired
  created_at               timestamptz default now()
);

-- ============================================================================
-- SECTION: WhatsApp Module
-- ============================================================================

create table if not exists whatsapp_conversations (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid references clinics(id) on delete cascade,
  patient_phone       text not null,
  patient_name        text,
  patient_id          uuid references patients(id) on delete set null,
  status              text default 'open'
                        check (status in ('open','resolved','bot_handling')),
  ai_takeover_enabled boolean default false,
  last_message_at     timestamptz,
  last_message_preview text,
  unread_count        int default 0,
  assigned_to         uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now(),
  unique(clinic_id, patient_phone)
);

create table if not exists whatsapp_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid references whatsapp_conversations(id) on delete cascade,
  clinic_id           uuid references clinics(id) on delete cascade,
  direction           text not null check (direction in ('inbound','outbound')),
  sender              text not null,
  message_type        text default 'text'
                        check (message_type in ('text','image','audio','document','template')),
  content             text,
  media_url           text,
  media_mime_type     text,
  whatsapp_message_id text unique,
  status              text default 'sent'
                        check (status in ('sent','delivered','read','failed')),
  ai_generated        boolean default false,
  created_at          timestamptz default now()
);

create table if not exists whatsapp_ai_config (
  id                   uuid primary key default gen_random_uuid(),
  clinic_id            uuid references clinics(id) on delete cascade unique,
  ai_enabled           boolean default false,
  ai_persona_name      text default 'Priya',
  system_prompt        text,
  handoff_keywords     text[] default array['doctor','urgent','emergency','accident'],
  business_hours_only  boolean default true,
  business_hours_start time default '09:00',
  business_hours_end   time default '18:00',
  max_ai_turns         int default 5,
  created_at           timestamptz default now()
);

create table if not exists whatsapp_templates (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid references clinics(id) on delete cascade,
  name       text not null,
  content    text not null,
  category   text default 'general'
               check (category in ('appointment','reminder','followup','general')),
  created_at timestamptz default now()
);

-- ============================================================================
-- SECTION: Invoices (rich schema — invoice_number, line items, tax, etc.)
-- ============================================================================

create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid references clinics(id) on delete cascade,
  patient_id      uuid references patients(id) on delete set null,
  appointment_id  uuid references appointments(id) on delete set null,
  invoice_number  text not null,
  line_items      jsonb not null default '[]'::jsonb,  -- [{ name, qty, unit_price, total }]
  subtotal        decimal(10,2) not null default 0,
  discount_amount decimal(10,2) not null default 0,
  discount_type   text default 'flat' check (discount_type in ('flat','percent')),
  tax_percent     decimal(5,2) not null default 0,
  tax_amount      decimal(10,2) not null default 0,
  total_amount    decimal(10,2) not null default 0,
  status          text default 'draft'
                    check (status in ('draft','sent','paid','cancelled')),
  payment_method  text check (payment_method in ('cash','card','upi','insurance')),
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================================
-- SECTION: Clinic Settings
-- ============================================================================

create table if not exists clinic_notification_settings (
  clinic_id  uuid primary key references clinics(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists clinic_invoice_settings (
  clinic_id     uuid primary key references clinics(id) on delete cascade,
  prefix        text not null default 'INV',
  default_tax   numeric(5,2) not null default 18,
  footer_text   text,
  show_gstin    boolean not null default true,
  payment_terms text,
  updated_at    timestamptz default now()
);

-- ============================================================================
-- SECTION: Audit Logs
-- ============================================================================

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid references clinics(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz default now()
);

-- ============================================================================
-- SECTION: Indexes
-- ============================================================================

create index if not exists idx_appointments_clinic_date     on appointments(clinic_id, date);
create index if not exists idx_appointments_doctor_date     on appointments(doctor_id, date);
create index if not exists idx_appointments_patient         on appointments(patient_id);
create index if not exists idx_appointments_status          on appointments(clinic_id, status);

create index if not exists idx_patients_clinic_phone        on patients(clinic_id, phone);

create index if not exists idx_doctors_clinic               on doctors(clinic_id);
create index if not exists idx_doctor_leaves_doctor         on doctor_leaves(doctor_id, from_date, to_date);
create index if not exists idx_blocked_dates_doctor         on blocked_dates(doctor_id, date);

create index if not exists idx_consultations_appointment    on consultations(appointment_id);
create index if not exists idx_consultations_doctor         on consultations(doctor_id, created_at desc);
create index if not exists idx_consultations_patient        on consultations(patient_id, created_at desc);

create index if not exists idx_reminder_rules_clinic_active on reminder_rules(clinic_id, is_active);
create index if not exists idx_reminder_queue_clinic_status on reminder_queue(clinic_id, status, scheduled_at);
create index if not exists idx_reminder_queue_appointment   on reminder_queue(appointment_id);
create index if not exists idx_reminder_logs_clinic         on reminder_logs(clinic_id, created_at desc);

create index if not exists idx_waitlist_clinic_status       on waitlist(clinic_id, status);
create index if not exists idx_waitlist_clinic_patient      on waitlist(clinic_id, patient_id);
create index if not exists idx_waitlist_expires             on waitlist(expires_at)
  where expires_at >= current_date;

create index if not exists idx_wa_conversations_clinic      on whatsapp_conversations(clinic_id, last_message_at desc);
create index if not exists idx_wa_messages_conversation     on whatsapp_messages(conversation_id, created_at asc);
create index if not exists idx_wa_messages_clinic           on whatsapp_messages(clinic_id, created_at desc);
create index if not exists idx_wa_messages_wa_id            on whatsapp_messages(whatsapp_message_id);

create index if not exists idx_invoices_clinic              on invoices(clinic_id, created_at desc);
create index if not exists idx_invoices_patient             on invoices(patient_id);

-- ============================================================================
-- SECTION: Row Level Security (enable on all tables)
-- ============================================================================

alter table clinics                      enable row level security;
alter table users                        enable row level security;
alter table doctors                      enable row level security;
alter table doctor_breaks                enable row level security;
alter table doctor_leaves                enable row level security;
alter table services                     enable row level security;
alter table doctor_services              enable row level security;
alter table patients                     enable row level security;
alter table blocked_dates                enable row level security;
alter table appointments                 enable row level security;
alter table consultations                enable row level security;
alter table reminder_rules               enable row level security;
alter table reminder_queue               enable row level security;
alter table reminder_logs                enable row level security;
alter table waitlist                     enable row level security;
alter table waitlist_notifications       enable row level security;
alter table whatsapp_conversations       enable row level security;
alter table whatsapp_messages            enable row level security;
alter table whatsapp_ai_config           enable row level security;
alter table whatsapp_templates           enable row level security;
alter table invoices                     enable row level security;
alter table clinic_notification_settings enable row level security;
alter table clinic_invoice_settings      enable row level security;
alter table audit_logs                   enable row level security;

-- ============================================================================
-- SECTION: RLS Policies
-- ============================================================================

-- Helper: a user's clinic_id
-- We use subselects instead of a view to avoid complexity.

-- Clinics: super_admin sees all; others see only their own
drop policy if exists "clinic_isolation" on clinics;
drop policy if exists "super_admin_all" on clinics;
drop policy if exists "clinics_super_admin_all" on clinics;
drop policy if exists "clinics_all_super_admin" on clinics;

create policy "clinics_select" on clinics for select
  using (
    (select role from users where id = auth.uid()) = 'super_admin'
    or id = (select clinic_id from users where id = auth.uid())
  );

create policy "clinics_all_super_admin" on clinics for all
  using ((select role from users where id = auth.uid()) = 'super_admin');

-- Users: can view own record; admin can view their clinic; super_admin sees all
drop policy if exists "users_insert_own" on users;

create policy "users_select" on users for select
  using (
    id = auth.uid()
    or clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin'
  );

create policy "users_insert_own" on users for insert
  with check (
    auth.uid() = id
    or (select role from users where id = auth.uid()) = 'super_admin'
  );

create policy "users_update_own" on users for update
  using (
    id = auth.uid()
    or (select role from users where id = auth.uid()) in ('admin','super_admin')
  );

-- Clinic-scoped tables (appointments, patients, doctors, services, etc.)
-- Pattern: user must belong to same clinic, or be super_admin

create policy "clinic_isolation" on appointments for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on patients for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on doctors for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on doctor_breaks for all
  using (doctor_id in (
    select id from doctors
    where clinic_id = (select clinic_id from users where id = auth.uid())
  ));

create policy "clinic_isolation" on doctor_leaves for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on services for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on doctor_services for all
  using (doctor_id in (
    select id from doctors
    where clinic_id = (select clinic_id from users where id = auth.uid())
  ));

create policy "clinic_isolation" on blocked_dates for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- Consultations: doctors see own; admin/receptionist see clinic
create policy "doctor_own_consultations" on consultations for select
  using (
    doctor_id = (select id from doctors where user_id = auth.uid() and clinic_id = consultations.clinic_id)
    or clinic_id = (select clinic_id from users where id = auth.uid()
                    and role in ('admin','receptionist','super_admin'))
  );

create policy "doctor_insert_consultations" on consultations for insert
  with check (
    doctor_id = (select id from doctors where user_id = auth.uid() and clinic_id = consultations.clinic_id)
  );

create policy "doctor_update_consultations" on consultations for update
  using (
    doctor_id = (select id from doctors where user_id = auth.uid() and clinic_id = consultations.clinic_id)
  );

-- Reminders
create policy "clinic_isolation" on reminder_rules for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on reminder_queue for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on reminder_logs for select
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- Waitlist
create policy "clinic_isolation" on waitlist for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on waitlist_notifications for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- WhatsApp (use users table, NOT profiles)
create policy "clinic_isolation" on whatsapp_conversations for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on whatsapp_messages for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on whatsapp_ai_config for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on whatsapp_templates for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- Invoices
create policy "clinic_isolation" on invoices for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- Settings tables
create policy "clinic_isolation" on clinic_notification_settings for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

create policy "clinic_isolation" on clinic_invoice_settings for all
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- Audit logs
create policy "clinic_isolation" on audit_logs for select
  using (clinic_id = (select clinic_id from users where id = auth.uid())
    or (select role from users where id = auth.uid()) = 'super_admin');

-- ============================================================================
-- SECTION: Functions
-- ============================================================================

-- Invoice number generator: INV-2025-001 per clinic
create or replace function public.generate_invoice_number(p_clinic_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_year       text;
  v_seq_name   text;
  v_next       bigint;
begin
  v_year     := to_char(current_date, 'YYYY');
  v_seq_name := format('invoice_seq_%s', replace(p_clinic_id::text, '-', ''));

  execute format('create sequence if not exists %I increment 1 minvalue 1 start 1', v_seq_name);
  execute format('select nextval(%L)', v_seq_name) into v_next;

  return format('INV-%s-%s', v_year, lpad(v_next::text, 3, '0'));
end;
$$;

grant execute on function public.generate_invoice_number(uuid) to authenticated;

-- WhatsApp unread helpers
create or replace function public.increment_unread(conv_id uuid)
returns void language sql security definer as $$
  update whatsapp_conversations
  set unread_count = unread_count + 1
  where id = conv_id;
$$;

create or replace function public.reset_unread(conv_id uuid)
returns void language sql security definer as $$
  update whatsapp_conversations
  set unread_count = 0
  where id = conv_id;
$$;

grant execute on function public.increment_unread(uuid) to authenticated;
grant execute on function public.reset_unread(uuid) to authenticated;

-- ============================================================================
-- SECTION: Trigger Functions
-- ============================================================================

-- 1. Auto-assign waitlist position on insert
create or replace function set_waitlist_position()
returns trigger language plpgsql as $$
begin
  select coalesce(max(position), 0) + 1
  into new.position
  from waitlist
  where clinic_id = new.clinic_id
    and status = 'waiting';
  return new;
end;
$$;

-- 2. Queue reminders when an appointment is created
create or replace function queue_reminders_for_appointment()
returns trigger language plpgsql as $$
declare
  v_rule       record;
  v_send_at    timestamptz;
  v_msg        text;
  v_clinic_name text;
  v_doctor_name text;
  v_patient_name text;
  v_channel    text;
begin
  -- Only queue for newly scheduled appointments
  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;

  select name into v_clinic_name  from clinics  where id = new.clinic_id;
  select name into v_patient_name from patients where id = new.patient_id;
  select name into v_doctor_name  from doctors  where id = new.doctor_id;

  for v_rule in
    select id, offset_hours, channel, message_template
    from reminder_rules
    where clinic_id = new.clinic_id
      and is_active = true
      and trigger_type in ('appointment_upcoming', 'appointment')
  loop
    -- Calculate scheduled send time
    v_send_at := (new.date::timestamptz + new.start_time::interval)
                 + (v_rule.offset_hours || ' hours')::interval;

    -- Skip if already in the past
    if v_send_at <= now() then
      continue;
    end if;

    -- Resolve template variables
    v_msg := v_rule.message_template;
    v_msg := replace(v_msg, '{{patient_name}}', coalesce(v_patient_name, ''));
    v_msg := replace(v_msg, '{{doctor}}',        coalesce(v_doctor_name,  ''));
    v_msg := replace(v_msg, '{{date}}',          to_char(new.date, 'DD Mon YYYY'));
    v_msg := replace(v_msg, '{{time}}',          new.start_time);
    v_msg := replace(v_msg, '{{clinic_name}}',   coalesce(v_clinic_name, ''));

    foreach v_channel in array v_rule.channel loop
      insert into reminder_queue (
        clinic_id, appointment_id, patient_id, rule_id,
        channel, scheduled_at, message_content, status
      ) values (
        new.clinic_id, new.id, new.patient_id, v_rule.id,
        v_channel, v_send_at, v_msg, 'pending'
      );
    end loop;
  end loop;

  return new;
end;
$$;

-- 3. Cancel pending reminders when appointment is cancelled / no_show
create or replace function cancel_reminders_on_appointment_cancel()
returns trigger language plpgsql as $$
begin
  if old.status in ('pending', 'confirmed')
     and new.status in ('cancelled', 'no_show') then
    update reminder_queue
    set status = 'cancelled'
    where appointment_id = new.id
      and status = 'pending';
  end if;
  return new;
end;
$$;

-- 4. Notify waitlist when an appointment slot opens up (cancellation)
create or replace function check_waitlist_on_cancellation()
returns trigger language plpgsql as $$
declare
  v_entry record;
begin
  if new.status = 'cancelled'
     and old.status in ('pending', 'confirmed') then

    select w.* into v_entry
    from waitlist w
    where w.clinic_id = new.clinic_id
      and w.status = 'waiting'
      and (w.doctor_id = new.doctor_id or w.doctor_id is null)
      and (w.preferred_date = new.date or w.preferred_date is null)
      and (w.expires_at >= current_date or w.expires_at is null)
    order by w.priority desc, w.position asc
    limit 1;

    if v_entry.id is not null then
      insert into waitlist_notifications (
        waitlist_id, clinic_id,
        available_appointment_slot, doctor_id, status
      ) values (
        v_entry.id, new.clinic_id,
        (new.date::timestamptz + new.start_time::interval),
        new.doctor_id, 'pending'
      );
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- SECTION: Triggers
-- ============================================================================

-- Waitlist position
drop trigger if exists on_waitlist_insert on waitlist;
create trigger on_waitlist_insert
  before insert on waitlist
  for each row execute function set_waitlist_position();

-- Reminder queue on appointment create
drop trigger if exists on_appointment_created on appointments;
create trigger on_appointment_created
  after insert on appointments
  for each row execute function queue_reminders_for_appointment();

-- Cancel reminders on appointment cancel
drop trigger if exists on_appointment_status_change on appointments;
create trigger on_appointment_status_change
  after update on appointments
  for each row execute function cancel_reminders_on_appointment_cancel();

-- Waitlist notification on appointment cancel
drop trigger if exists on_appointment_cancelled_waitlist on appointments;
create trigger on_appointment_cancelled_waitlist
  after update on appointments
  for each row execute function check_waitlist_on_cancellation();

-- ============================================================================
-- SECTION: Realtime (WhatsApp module needs realtime subscriptions)
-- ============================================================================

-- NOTE: Run these only once; they fail silently if already added.
-- alter publication supabase_realtime add table whatsapp_messages;
-- alter publication supabase_realtime add table whatsapp_conversations;

-- ============================================================================
-- SECTION: Seed Functions (call after clinic creation)
-- ============================================================================

-- Default reminder rules for a new clinic
create or replace function seed_reminder_rules(p_clinic_id uuid)
returns void language sql security definer as $$
  insert into reminder_rules
    (clinic_id, name, trigger_type, offset_hours, channel, message_template)
  values
    (p_clinic_id,
     '24hr Before Reminder',
     'appointment_upcoming', -24, '{whatsapp}',
     'Hi {{patient_name}} 👋, reminder for your appointment with {{doctor}} tomorrow at {{time}}. Reply CANCEL to cancel. - {{clinic_name}}'),
    (p_clinic_id,
     '2hr Before Reminder',
     'appointment_upcoming', -2, '{whatsapp}',
     'Hi {{patient_name}}, your appointment with {{doctor}} is in 2 hours at {{time}}. Please be on time. - {{clinic_name}}'),
    (p_clinic_id,
     'Post-Visit Follow-up',
     'appointment_followup', 48, '{whatsapp}',
     'Hi {{patient_name}}, hope you are feeling better after your visit with {{doctor}}. Do reach out if you have any questions. - {{clinic_name}}')
  on conflict do nothing;
$$;

-- Default WhatsApp message templates for a new clinic
create or replace function seed_whatsapp_templates(p_clinic_id uuid)
returns void language sql security definer as $$
  insert into whatsapp_templates (clinic_id, name, content, category) values
    (p_clinic_id,
     'Appointment Confirmed',
     'Hi {{patient_name}}, your appointment with Dr. {{doctor}} is confirmed for {{date}} at {{time}}. Reply CANCEL to cancel. - {{clinic_name}}',
     'appointment'),
    (p_clinic_id,
     'Appointment Reminder',
     'Hi {{patient_name}}, reminder: your appointment is tomorrow at {{time}} with Dr. {{doctor}}. See you soon! - {{clinic_name}}',
     'reminder'),
    (p_clinic_id,
     'Follow-up Due',
     'Hi {{patient_name}}, Dr. {{doctor}} recommends a follow-up visit. Reply to book your slot. - {{clinic_name}}',
     'followup'),
    (p_clinic_id,
     'General Greeting',
     'Hello {{patient_name}}! Thank you for reaching out. How can we help you today?',
     'general')
  on conflict do nothing;
$$;

grant execute on function seed_reminder_rules(uuid)      to authenticated;
grant execute on function seed_whatsapp_templates(uuid)  to authenticated;

-- ============================================================================
-- SECTION: pg_cron — Reminder Processor (MANUAL STEP)
-- ============================================================================
-- DO NOT run this block automatically.
-- Steps:
--   1. Enable pg_cron extension: Supabase Dashboard → Extensions → pg_cron
--   2. Replace [YOUR_PROJECT] and [SERVICE_ROLE_KEY] below
--   3. Run just the select cron.schedule(...) call in SQL Editor
-- ============================================================================
--
-- select cron.schedule(
--   'reminder-processor',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://[YOUR_PROJECT].supabase.co/functions/v1/reminder-processor',
--     headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- Verify:  select * from cron.job where jobname = 'reminder-processor';
-- Remove:  select cron.unschedule('reminder-processor');
-- ============================================================================
