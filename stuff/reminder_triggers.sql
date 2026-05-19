-- Reminder trigger functions for ClinicOS

-- Function to queue reminders for newly scheduled appointments
create or replace function queue_reminders_for_appointment()
returns trigger as $$
declare
  v_rule record;
  v_send_at timestamptz;
  v_message_content text;
  v_clinic_name text;
  v_doctor_name text;
  v_patient_name text;
  v_appointment_date text;
  v_appointment_time text;
  v_channel text;
begin
  -- Only process newly created appointments with 'pending' or 'confirmed' status
  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;

  -- Get clinic name
  select name into v_clinic_name from clinics where id = new.clinic_id;

  -- Get patient name
  select name into v_patient_name from patients where id = new.patient_id;

  -- Get doctor name
  select name into v_doctor_name from doctors where id = new.doctor_id;

  -- Format appointment date and time
  v_appointment_date := to_char(new.date, 'DD-MM-YYYY');
  v_appointment_time := new.start_time;

  -- Iterate through all active reminder rules for this clinic
  for v_rule in 
    select id, offset_hours, channel, message_template 
    from reminder_rules 
    where clinic_id = new.clinic_id 
      and is_active = true
      and trigger_type = 'appointment'
  loop
    -- Calculate send_at time based on offset_hours
    v_send_at := (new.date::timestamptz + new.start_time::interval) - (v_rule.offset_hours || ' hours')::interval;

    -- Skip if send_at is in the past
    if v_send_at <= now() then
      continue;
    end if;

    -- Process each channel in the rule
    foreach v_channel in array v_rule.channel
    loop
      -- Resolve template variables
      v_message_content := v_rule.message_template;
      v_message_content := replace(v_message_content, '{patient_name}', v_patient_name);
      v_message_content := replace(v_message_content, '{doctor}', v_doctor_name);
      v_message_content := replace(v_message_content, '{date}', v_appointment_date);
      v_message_content := replace(v_message_content, '{time}', v_appointment_time);
      v_message_content := replace(v_message_content, '{clinic_name}', v_clinic_name);

      -- Insert into reminder_queue
      insert into reminder_queue (
        clinic_id,
        appointment_id,
        patient_id,
        rule_id,
        channel,
        scheduled_at,
        status,
        message_content,
        created_at
      ) values (
        new.clinic_id,
        new.id,
        new.patient_id,
        v_rule.id,
        v_channel,
        v_send_at,
        'pending',
        v_message_content,
        now()
      );
    end loop;
  end loop;

  return new;
end;
$$ language plpgsql;

-- Trigger on appointment creation
create or replace trigger on_appointment_created
  after insert on appointments
  for each row
  execute function queue_reminders_for_appointment();

-- Function to cancel reminders when appointment is cancelled or no_show
create or replace function cancel_reminders_on_appointment_cancel()
returns trigger as $$
begin
  -- Listen to appointment status changes
  -- If status changes to cancelled or no_show from scheduled status
  if (old.status in ('pending', 'confirmed') 
      and new.status in ('cancelled', 'no_show')) then
    
    -- Update reminder_queue status to 'cancelled' for all pending reminders
    update reminder_queue
    set status = 'cancelled'
    where appointment_id = new.id
      and status = 'pending';
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger on appointment status change
create or replace trigger on_appointment_status_change
  after update on appointments
  for each row
  execute function cancel_reminders_on_appointment_cancel();
