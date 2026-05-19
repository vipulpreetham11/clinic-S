# reminder-processor Edge Function - Complete Setup Guide

## ✅ Status: READY FOR DEPLOYMENT

The reminder-processor Supabase Edge Function has been created and is ready for deployment to your ClinicOS system.

---

## 📁 Files Created

1. **Function Source Code**
   - Location: `c:\Users\Vipul preetham\Desktop\ClinicCRM\reminder_processor_index.ts`
   - Status: ✅ Ready
   - Content: Complete Deno/TypeScript Edge Function implementation

2. **Setup Scripts** (Choose one):
   - **Windows Batch**: `setup-reminder-processor.bat` (Double-click to run)
   - **Node.js (ESM)**: `clinic-crm\setup-reminder-processor.mjs` (`node setup-reminder-processor.mjs`)
   - **Node.js (CommonJS)**: `clinic-crm\create-reminder-processor.js` (`node create-reminder-processor.js`)

3. **Documentation**
   - This file: Complete setup and deployment guide

---

## 🚀 Quick Start (Choose One Method)

### Method 1: Windows Batch File (Recommended for Windows users)
```batch
cd c:\Users\Vipul preetham\Desktop\ClinicCRM
setup-reminder-processor.bat
```

### Method 2: Node.js ES Module
```bash
cd c:\Users\Vipul preetham\Desktop\ClinicCRM\clinic-crm
node setup-reminder-processor.mjs
```

### Method 3: Node.js CommonJS
```bash
cd c:\Users\Vipul preetham\Desktop\ClinicCRM\clinic-crm
node create-reminder-processor.js
```

### Method 4: Manual Setup
1. Create directory: `clinic-crm\supabase\functions\reminder-processor\`
2. Create file: `clinic-crm\supabase\functions\reminder-processor\index.ts`
3. Copy content from `reminder_processor_index.ts` to `index.ts`

---

## 📋 Function Specification

### Purpose
Processes due reminders from the reminder_queue every 15 minutes

### Key Features

#### 1. Time Window Calculation
- Calculates the next 15-minute window from current time
- Fetches all pending reminders due within that window

#### 2. Smart Reminder Selection
- Query parameters:
  - `status = 'pending'`
  - `scheduled_at <= windowEnd`
  - Order by `scheduled_at ASC`
  - Limit: 100 reminders per batch

#### 3. Related Data Retrieval
- Fetches related patient contact info
- Fetches appointment status for validation
- Retrieves reminder rule metadata

#### 4. Appointment Validation
- **Skips reminders** for cancelled appointments
- Updates status to 'skipped' for cancelled appointments

#### 5. Channel-Specific Processing

**WhatsApp Channel:**
- Checks for existing whatsapp_conversations
- Creates conversation if none exists
- Calls the `whatsapp-send` Edge Function
- Passes: `patient_id`, `conversation_id`, `reminder_id`

**SMS Channel:**
- TODO: Placeholder for future SMS implementation

**Email Channel:**
- TODO: Placeholder for future email implementation

#### 6. Status Management
- Updates reminder status to 'sent' on success
- Sets `sent_at` timestamp
- Inserts record in `reminder_logs` table
- On error: Sets status to 'failed', stores error message

#### 7. Error Handling
- Try-catch wrapper around each reminder
- Logs errors to console
- Graceful failure - errors don't block other reminders
- Returns summary of processed/failed count

### Response Format
```json
{
  "processed": 85,
  "failed": 2
}
```

---

## 🔧 Environment Variables Required

The Edge Function needs these environment variables set in Supabase:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xyzproject.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role API key | (service role key from Settings) |

### How to Set Environment Variables
1. Go to Supabase Dashboard → Your Project
2. Navigate to Settings → Edge Functions
3. Add the variables and their values
4. Deploy the function

---

## 🗄️ Database Schema

### Tables Involved

#### reminder_queue (Source)
```sql
- id (UUID, PK)
- status (VARCHAR: 'pending', 'sent', 'skipped', 'failed')
- scheduled_at (TIMESTAMP)
- channel (VARCHAR: 'whatsapp', 'sms', 'email')
- patient_id (FK → patients.id)
- appointment_id (FK → appointments.id)
- reminder_rule_id (FK → reminder_rules.id)
- error_message (TEXT, nullable)
- sent_at (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### patients (Related)
```sql
- id (UUID, PK)
- phone_number (VARCHAR)
- email (VARCHAR)
- ...other fields
```

#### appointments (Related)
```sql
- id (UUID, PK)
- status (VARCHAR: 'confirmed', 'cancelled', 'completed', ...)
- ...other fields
```

#### reminder_rules (Related)
```sql
- id (UUID, PK)
- ...metadata
```

#### whatsapp_conversations (Related)
```sql
- id (UUID, PK)
- patient_id (FK → patients.id)
- status (VARCHAR)
- created_at (TIMESTAMP)
- ...other fields
```

#### reminder_logs (Audit Trail)
```sql
- id (UUID, PK)
- reminder_id (FK → reminder_queue.id)
- status (VARCHAR: 'sent', 'failed')
- sent_at (TIMESTAMP)
- error_message (TEXT, nullable)
- created_at (TIMESTAMP)
```

---

## 🔄 Deployment Steps

### Step 1: Create Directory Structure
Run one of the setup scripts above, or manually create:
```
clinic-crm/supabase/functions/reminder-processor/
                    └── index.ts
```

### Step 2: Verify the Function
```bash
cd clinic-crm
# Check that the file exists
ls supabase/functions/reminder-processor/index.ts
```

### Step 3: Deploy to Supabase
```bash
cd clinic-crm
supabase functions deploy reminder-processor
```

### Step 4: Set Environment Variables
1. Open Supabase Dashboard
2. Go to Settings → Edge Functions
3. Add:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key from Settings

### Step 5: Configure Cron Trigger
The function should be invoked every 15 minutes. Options:

**Option A: Supabase Cron Extension**
```sql
select cron.schedule('reminder-processor-15min',
  '*/15 * * * *',
  'select net.http_post(
    url:=current_setting(''app.supabase_url'') || ''/functions/v1/reminder-processor'',
    headers:=jsonb_build_object(
      ''authorization'', ''Bearer '' || current_setting(''app.supabase_anon_key'')
    )
  )');
```

**Option B: Google Cloud Scheduler / AWS EventBridge**
- Create a scheduled job to call: `https://[project-id].supabase.co/functions/v1/reminder-processor`
- Authentication: Use Supabase JWT or API key
- Frequency: Every 15 minutes

**Option C: External Task Manager / Cron Service**
- Service: cron-job.org, EasyCron, Zapier, etc.
- Endpoint: `https://[project-id].supabase.co/functions/v1/reminder-processor`
- Interval: 15 minutes

---

## ✨ Function Imports

```typescript
// Deno Standard Library - HTTP server
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Supabase SDK - Database client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
```

---

## 📊 Monitoring & Logging

### Check Reminder Logs
```sql
SELECT * FROM reminder_logs
ORDER BY created_at DESC
LIMIT 50;
```

### Check Failed Reminders
```sql
SELECT * FROM reminder_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

### Check Processing Statistics
```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_processed
FROM reminder_queue
WHERE updated_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

---

## 🐛 Troubleshooting

### Function Not Triggering
- Verify cron job is configured correctly
- Check Supabase function logs in dashboard
- Confirm environment variables are set

### Reminders Not Being Sent
- Check `reminder_queue` table for status = 'pending'
- Verify `scheduled_at` is <= current time + 15 minutes
- Check `whatsapp_conversations` table exists
- Review function error logs

### WhatsApp Integration Issues
- Verify `whatsapp-send` Edge Function is deployed
- Check WhatsApp token is valid
- Confirm conversation creation is working

### Database Errors
- Verify all required tables exist
- Check field names and types match
- Ensure service role has necessary permissions

---

## 🔐 Security Notes

### Service Role Key
- The function uses `SUPABASE_SERVICE_ROLE_KEY` for privileged operations
- Keep this key secure - never commit to version control
- Store in Supabase environment variables only

### Best Practices
1. Use environment variables for all secrets
2. Validate all input data
3. Use service role only for internal operations
4. Monitor function logs regularly
5. Set up alerts for high failure rates

---

## 📝 Code Structure

### Main Flow
1. Validate environment variables
2. Create Supabase client with service role
3. Calculate 15-minute window
4. Fetch pending reminders with related data
5. For each reminder:
   - Validate appointment status
   - Route to appropriate channel handler
   - Update status and logs
   - Catch and record any errors
6. Return summary response

### Error Handling
- All database operations are error-checked
- Individual reminder failures don't block others
- Errors are logged with reminder ID for tracking
- Failed reminder status is updated for manual review

---

## 📦 Deployment Checklist

- [ ] Setup script run successfully
- [ ] Directory created: `clinic-crm/supabase/functions/reminder-processor/`
- [ ] File exists: `clinic-crm/supabase/functions/reminder-processor/index.ts`
- [ ] Function deployed: `supabase functions deploy reminder-processor`
- [ ] Environment variables set in Supabase
- [ ] Cron trigger configured (every 15 minutes)
- [ ] Test run successful - check reminder_logs table
- [ ] Monitoring/alerts configured

---

## 🎯 Next Steps

1. **Run Setup Script** (Choose your platform)
2. **Deploy Function** via Supabase CLI
3. **Configure Cron** for 15-minute intervals
4. **Test Thoroughly** with sample reminders
5. **Monitor Logs** for issues
6. **Implement SMS/Email** channels when ready

---

## 📞 Support

For issues or questions:
- Check function logs in Supabase dashboard
- Review the reminder_logs table for status
- Verify all environment variables are set
- Ensure database schema matches specifications

---

Generated: $(date)
Task ID: edge_reminder_processor
Status: ✅ READY FOR DEPLOYMENT
