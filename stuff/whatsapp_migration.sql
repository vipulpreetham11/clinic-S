-- ============================================
-- ClinicOS WhatsApp Module — SQL Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Conversations table
create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_phone text not null,
  patient_name text,
  patient_id uuid references patients(id) on delete set null,
  status text default 'open' check (status in ('open', 'resolved', 'bot_handling')),
  ai_takeover_enabled boolean default false,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count int default 0,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique(clinic_id, patient_phone)
);

-- 2. Messages table
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender text not null,
  message_type text default 'text' check (message_type in ('text', 'image', 'audio', 'document', 'template')),
  content text,
  media_url text,
  media_mime_type text,
  whatsapp_message_id text unique,
  status text default 'sent' check (status in ('sent', 'delivered', 'read', 'failed')),
  ai_generated boolean default false,
  created_at timestamptz default now()
);

-- 3. AI Config table
create table if not exists whatsapp_ai_config (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade unique,
  ai_enabled boolean default false,
  ai_persona_name text default 'Priya',
  system_prompt text,
  handoff_keywords text[] default array['doctor', 'urgent', 'emergency', 'accident'],
  business_hours_only boolean default true,
  business_hours_start time default '09:00',
  business_hours_end time default '18:00',
  max_ai_turns int default 5,
  created_at timestamptz default now()
);

-- 4. Templates table
create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  name text not null,
  content text not null,
  category text default 'general' check (category in ('appointment', 'reminder', 'followup', 'general')),
  created_at timestamptz default now()
);

-- ============================================
-- Indexes for performance
-- ============================================
create index if not exists idx_wa_messages_conversation on whatsapp_messages(conversation_id, created_at desc);
create index if not exists idx_wa_messages_clinic on whatsapp_messages(clinic_id, created_at desc);
create index if not exists idx_wa_conversations_clinic on whatsapp_conversations(clinic_id, last_message_at desc);
create index if not exists idx_wa_messages_wa_id on whatsapp_messages(whatsapp_message_id);

-- ============================================
-- RPC Helper Functions
-- ============================================

-- Atomic unread increment
create or replace function increment_unread(conv_id uuid)
returns void language sql security definer as $$
  update whatsapp_conversations
  set unread_count = unread_count + 1
  where id = conv_id;
$$;

-- Reset unread when receptionist opens conversation
create or replace function reset_unread(conv_id uuid)
returns void language sql security definer as $$
  update whatsapp_conversations
  set unread_count = 0
  where id = conv_id;
$$;

-- Seed default templates per clinic (call after clinic creation)
create or replace function seed_whatsapp_templates(p_clinic_id uuid)
returns void language sql security definer as $$
  insert into whatsapp_templates (clinic_id, name, content, category) values
  (p_clinic_id, 'Appointment Confirmed',
   'Hi {{patient_name}}, your appointment with Dr. {{doctor}} is confirmed for {{date}} at {{time}}. Reply CANCEL to cancel. - [Clinic Name]',
   'appointment'),
  (p_clinic_id, 'Appointment Reminder',
   'Hi {{patient_name}}, reminder: your appointment is tomorrow at {{time}} with Dr. {{doctor}}. See you soon! - [Clinic Name]',
   'reminder'),
  (p_clinic_id, 'Follow-up Due',
   'Hi {{patient_name}}, Dr. {{doctor}} recommends a follow-up visit. Reply to book your slot. - [Clinic Name]',
   'followup'),
  (p_clinic_id, 'General Greeting',
   'Hello {{patient_name}}! Thank you for reaching out. How can we help you today?',
   'general')
  on conflict do nothing;
$$;

-- ============================================
-- Row Level Security
-- ============================================
alter table whatsapp_conversations enable row level security;
alter table whatsapp_messages enable row level security;
alter table whatsapp_ai_config enable row level security;
alter table whatsapp_templates enable row level security;

-- Conversations: clinic-scoped access
create policy "clinic_access_conversations"
  on whatsapp_conversations for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
    or exists (
      select 1 from users where id = auth.uid() and role = 'super_admin'
    )
  );

-- Messages: clinic-scoped access
create policy "clinic_access_messages"
  on whatsapp_messages for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
    or exists (
      select 1 from users where id = auth.uid() and role = 'super_admin'
    )
  );

-- AI Config: clinic-scoped
create policy "clinic_access_ai_config"
  on whatsapp_ai_config for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
    or exists (
      select 1 from users where id = auth.uid() and role = 'super_admin'
    )
  );

-- Templates: clinic-scoped
create policy "clinic_access_templates"
  on whatsapp_templates for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
    or exists (
      select 1 from users where id = auth.uid() and role = 'super_admin'
    )
  );

-- ============================================
-- Realtime: enable for messages & conversations
-- ============================================
alter publication supabase_realtime add table whatsapp_messages;
alter publication supabase_realtime add table whatsapp_conversations;
