-- Usage: select seed_reminder_rules('[clinic_uuid]');

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
