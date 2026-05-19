-- ============================================================================
-- ClinicOS Reminder Processor - pg_cron Schedule Configuration
-- ============================================================================
-- This SQL file sets up a scheduled job in PostgreSQL using pg_cron to
-- automatically trigger the reminder processor function every 15 minutes.
-- ============================================================================

-- PREREQUISITE: Enable pg_cron extension
-- ============================================================================
-- Before running this SQL, you MUST enable pg_cron in your Supabase dashboard:
--   1. Go to your Supabase project dashboard
--   2. Navigate to Extensions tab (left sidebar)
--   3. Search for "pg_cron"
--   4. Click Enable
--
-- Alternatively, run this command if you have superuser access:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- ============================================================================

-- CONFIGURATION REQUIRED
-- ============================================================================
-- Before executing the schedule command below, replace these placeholders:
--
-- [YOUR_PROJECT]
--   - Find your Supabase project ID:
--   - Settings → General → Project URL
--   - Extract the ID from: https://[YOUR_PROJECT].supabase.co
--
-- [SERVICE_ROLE_KEY]
--   - Find your service role key (use the anon key if service role is restricted):
--   - Settings → API → Service Role Key (or "anon" key)
--   - Keep this secure - do NOT commit to version control
-- ============================================================================

-- Schedule the reminder processor to run every 15 minutes
-- ============================================================================
-- The following cron job will execute every 15 minutes ('*/15 * * * *')
-- It calls the reminder-processor edge function via HTTP POST
-- The function will check for due reminders and send them via WhatsApp

select cron.schedule(
  'reminder-processor',
  '*/15 * * * *',  -- Cron expression: every 15 minutes
  $$
  select net.http_post(
    url := 'https://[YOUR_PROJECT].supabase.co/functions/v1/reminder-processor',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Execution Notes:
-- - The HTTP request includes Bearer token authentication
-- - Empty body is sent (function doesn't need request payload)
-- - The function will execute in the context of your Supabase project
-- - Execution logs will appear in Supabase Functions monitoring dashboard

-- ============================================================================
-- VERIFICATION & MANAGEMENT COMMANDS
-- ============================================================================

-- View all scheduled jobs (run this after scheduling)
-- select * from cron.job;

-- Check status of the reminder-processor job
-- select * from cron.job where jobname = 'reminder-processor';

-- View job run history (shows last execution time and status)
-- select * from cron.job_run_details where jobname = 'reminder-processor' order by start_time desc limit 10;

-- ============================================================================
-- TO DISABLE OR MODIFY THE SCHEDULE
-- ============================================================================

-- Disable the reminder processor job (stops scheduling new runs)
-- select cron.unschedule('reminder-processor');

-- Update the schedule (e.g., change to run every 5 minutes)
-- select cron.schedule(
--   'reminder-processor',
--   '*/5 * * * *',  -- every 5 minutes
--   'select net.http_post(...);'
-- );
-- Note: This replaces the existing schedule with the same name

-- Remove and recreate if you need to change the function URL or headers
-- select cron.unschedule('reminder-processor');
-- select cron.schedule(...); -- with new parameters

-- ============================================================================
-- IMPORTANT SECURITY NOTES
-- ============================================================================
-- 1. Service Role Key: Keep your service role key SECRET
--    - Never commit it to version control
--    - Use environment variables or Supabase Secrets instead
--    - If exposed, regenerate it immediately in Settings → API
--
-- 2. Function Permissions: The edge function should validate
--    - The Authorization header token
--    - That requests only come from this scheduled job
--
-- 3. Rate Limiting: Monitor your database connections
--    - Each execution uses a database connection
--    - At 15-minute intervals, you'll have 4 connections/hour per job
--
-- 4. Error Handling: If the HTTP request fails
--    - The job will retry (check cron.job_run_details for errors)
--    - Check Supabase Functions logs for edge function errors
-- ============================================================================

-- ============================================================================
-- EXECUTION STEPS
-- ============================================================================
-- 1. Replace [YOUR_PROJECT] and [SERVICE_ROLE_KEY] with actual values
-- 2. Open Supabase SQL Editor (SQL section in dashboard)
-- 3. Copy and paste the schedule command (the cron.schedule call)
-- 4. Execute the query
-- 5. Verify with: select * from cron.job where jobname = 'reminder-processor';
-- 6. Check the Functions tab in Supabase to monitor executions
-- ============================================================================
