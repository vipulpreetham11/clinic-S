-- Reminder rules (templates per clinic — WHEN to send)
create table reminder_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  name text not null,                    -- "24hr Before Appointment"
  trigger_type text not null,            -- appointment_upcoming | appointment_followup | custom
  offset_hours int not null,             -- -24 = 24hrs before, -2 = 2hrs before, 48 = 48hrs after
  channel text[] default '{whatsapp}',   -- whatsapp | sms | email (sms/email stubbed)
  message_template text not null,        -- uses {{patient_name}}, {{doctor}}, {{date}}, {{time}}, {{clinic_name}}
  is_active boolean default true,
  days_of_week int[] default '{0,1,2,3,4,5,6}', -- 0=Sun, send only on these days
  created_at timestamptz default now()
);

-- Reminder queue (generated per appointment)
create table reminder_queue (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  rule_id uuid references reminder_rules(id) on delete cascade,
  channel text not null,                 -- whatsapp | sms | email
  scheduled_at timestamptz not null,     -- exact time to send
  sent_at timestamptz,
  status text default 'pending',         -- pending | sent | failed | skipped | cancelled
  error_message text,
  message_content text,                  -- resolved message (vars replaced)
  whatsapp_message_id text,             -- from Meta API response
  created_at timestamptz default now()
);

-- Reminder logs (permanent audit trail)
create table reminder_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_queue_id uuid references reminder_queue(id) on delete set null,
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  channel text,
  message_content text,
  status text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Waitlist
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,  -- preferred doctor (nullable)
  service_id uuid references services(id) on delete set null, -- preferred service (nullable)
  preferred_date date,
  preferred_time_start time,              -- e.g. 10:00
  preferred_time_end time,               -- e.g. 13:00 (preferred window)
  notes text,                            -- reason / special requests
  priority int default 0,               -- 0=normal, 1=high, 2=urgent
  status text default 'waiting',        -- waiting | notified | booked | expired | cancelled
  notified_at timestamptz,              -- when we pinged them
  notified_channel text,                -- whatsapp | phone
  booked_appointment_id uuid references appointments(id) on delete set null,
  expires_at date,                      -- auto-expire after X days
  position int,                         -- queue position (maintained by trigger)
  created_at timestamptz default now()
);

-- Auto-calculate position for waitlist
create or replace function set_waitlist_position()
returns trigger language plpgsql as $$
begin
  select coalesce(max(position), 0) + 1
  into NEW.position
  from waitlist
  where clinic_id = NEW.clinic_id
    and status = 'waiting';
  return NEW;
end;
$$;

create trigger on_waitlist_insert
  before insert on waitlist
  for each row execute function set_waitlist_position();

-- Waitlist Notifications
create table waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid references waitlist(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete cascade,
  available_appointment_slot timestamptz,
  doctor_id uuid references doctors(id) on delete set null,
  status text default 'pending',       -- pending | sent | expired
  created_at timestamptz default now()
);

-- Auto-queue reminders when appointment is created
create or replace function queue_reminders_for_appointment()
returns trigger language plpgsql as $$
declare
  rule record;
  msg text;
  send_at timestamptz;
begin
  -- Only queue for newly scheduled appointments
  if NEW.status != 'scheduled' then return NEW; end if;

  for rule in
    select * from reminder_rules
    where clinic_id = NEW.clinic_id
      and is_active = true
  loop
    -- Calculate send time
    send_at := NEW.scheduled_at + (rule.offset_hours || ' hours')::interval;

    -- Skip if send_at is in the past
    if send_at <= now() then continue; end if;

    -- Resolve template vars
    select
      replace(replace(replace(replace(replace(
        rule.message_template,
        '{{patient_name}}', p.name),
        '{{doctor}}', d.name),
        '{{date}}', to_char(NEW.scheduled_at, 'DD Mon YYYY')),
        '{{time}}', to_char(NEW.scheduled_at, 'HH12:MI AM')),
        '{{clinic_name}}', c.name)
    into msg
    from patients p, doctors d, clinics c
    where p.id = NEW.patient_id
      and d.id = NEW.doctor_id
      and c.id = NEW.clinic_id;

    -- Queue for each channel
    foreach channel in array rule.channel loop
      insert into reminder_queue (
        clinic_id, appointment_id, patient_id,
        rule_id, channel, scheduled_at,
        message_content, status
      ) values (
        NEW.clinic_id, NEW.id, NEW.patient_id,
        rule.id, channel, send_at,
        msg, 'pending'
      );
    end loop;
  end loop;

  return NEW;
end;
$$;

create trigger on_appointment_created
  after insert on appointments
  for each row execute function queue_reminders_for_appointment();

-- Also cancel pending reminders when appointment is cancelled
create or replace function cancel_reminders_on_appointment_cancel()
returns trigger language plpgsql as $$
begin
  if NEW.status in ('cancelled', 'no_show') and OLD.status = 'scheduled' then
    update reminder_queue
    set status = 'cancelled'
    where appointment_id = NEW.id
      and status = 'pending';
  end if;
  return NEW;
end;
$$;

create trigger on_appointment_status_change
  after update on appointments
  for each row execute function cancel_reminders_on_appointment_cancel();

-- When appointment is cancelled, check if anyone on waitlist wants that slot
create or replace function check_waitlist_on_cancellation()
returns trigger language plpgsql as $$
declare
  waitlist_entry record;
begin
  if NEW.status = 'cancelled' and OLD.status = 'scheduled' then
    -- Find best waitlist match
    select w.* into waitlist_entry
    from waitlist w
    where w.clinic_id = NEW.clinic_id
      and w.status = 'waiting'
      and (w.doctor_id = NEW.doctor_id or w.doctor_id is null)
      and (w.preferred_date = NEW.scheduled_at::date or w.preferred_date is null)
      and (w.expires_at >= current_date or w.expires_at is null)
    order by w.priority desc, w.position asc
    limit 1;

    if waitlist_entry.id is not null then
      -- Insert notification record into a new table
      insert into waitlist_notifications (
        waitlist_id, clinic_id, available_appointment_slot,
        doctor_id, status
      ) values (
        waitlist_entry.id, NEW.clinic_id, NEW.scheduled_at,
        NEW.doctor_id, 'pending'
      );
    end if;
  end if;
  return NEW;
end;
$$;

create trigger on_appointment_cancelled_waitlist
  after update on appointments
  for each row execute function check_waitlist_on_cancellation();

-- Seed Default Rules function
create or replace function seed_reminder_rules(p_clinic_id uuid)
returns void language sql as $$
  insert into reminder_rules (clinic_id, name, trigger_type, offset_hours, channel, message_template) values
  (p_clinic_id, '24hr Before Reminder', 'appointment_upcoming', -24, '{whatsapp}',
   'Hi {{patient_name}} 👋, reminder for your appointment with {{doctor}} tomorrow at {{time}}. Reply CANCEL to cancel. - {{clinic_name}}'),
  (p_clinic_id, '2hr Before Reminder', 'appointment_upcoming', -2, '{whatsapp}',
   'Hi {{patient_name}}, your appointment with {{doctor}} is in 2 hours at {{time}}. Please be on time. - {{clinic_name}}'),
  (p_clinic_id, 'Post-Visit Follow-up', 'appointment_followup', 48, '{whatsapp}',
   'Hi {{patient_name}}, hope you are feeling better after your visit with {{doctor}}. Do reach out if you have any questions. - {{clinic_name}}');
$$;

-- RLS Policies

alter table reminder_rules enable row level security;
alter table reminder_queue enable row level security;
alter table reminder_logs enable row level security;
alter table waitlist enable row level security;
alter table waitlist_notifications enable row level security;

-- Policies for reminder_rules
create policy "Users can view reminder rules for their clinic"
  on reminder_rules for select
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
  );

create policy "Admins can manage reminder rules"
  on reminder_rules for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- Policies for reminder_queue
create policy "Users can view reminder queue for their clinic"
  on reminder_queue for select
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
  );

create policy "Admins and Receptionists can manage reminder queue"
  on reminder_queue for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid() and role in ('admin', 'receptionist')
    )
  );

-- Policies for reminder_logs
create policy "Users can view reminder logs for their clinic"
  on reminder_logs for select
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
  );

-- Policies for waitlist
create policy "Users can view waitlist for their clinic"
  on waitlist for select
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
  );

create policy "Admins and Receptionists can manage waitlist"
  on waitlist for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid() and role in ('admin', 'receptionist')
    )
  );

-- Policies for waitlist_notifications
create policy "Users can view waitlist notifications for their clinic"
  on waitlist_notifications for select
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
  );

create policy "Admins and Receptionists can manage waitlist notifications"
  on waitlist_notifications for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid() and role in ('admin', 'receptionist')
    )
  );

-- Schedule pg_cron (ensure the pg_cron extension is enabled first)
-- select cron.schedule(
--   'reminder-processor',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://[YOUR_PROJECT].supabase.co/functions/v1/reminder-processor',
--     headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
