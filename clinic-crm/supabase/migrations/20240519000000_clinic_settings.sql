-- Clinic profile extensions
alter table clinics add column if not exists website text;
alter table clinics add column if not exists gstin text;
alter table clinics add column if not exists default_slot_duration int default 30;
alter table clinics add column if not exists currency text default 'INR';
alter table clinics add column if not exists business_hours jsonb default '{}'::jsonb;

-- Per-clinic notification preferences
create table if not exists clinic_notification_settings (
  clinic_id uuid primary key references clinics(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Per-clinic invoice defaults
create table if not exists clinic_invoice_settings (
  clinic_id uuid primary key references clinics(id) on delete cascade,
  prefix text not null default 'INV',
  default_tax numeric(5,2) not null default 18,
  footer_text text,
  show_gstin boolean not null default true,
  payment_terms text,
  updated_at timestamptz default now()
);

alter table users add column if not exists doctor_id uuid references doctors(id);

alter table clinic_notification_settings enable row level security;
alter table clinic_invoice_settings enable row level security;

create policy "clinic_notification_settings_isolation" on clinic_notification_settings
  for all using (
    clinic_id in (select clinic_id from users where id = auth.uid())
  );

create policy "clinic_invoice_settings_isolation" on clinic_invoice_settings
  for all using (
    clinic_id in (select clinic_id from users where id = auth.uid())
  );
