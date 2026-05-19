# reminder-processor Edge Function Setup

## Status
The reminder-processor Supabase Edge Function code has been created and is ready for deployment.

## Files Created

1. **Source Code**: `c:\Users\Vipul preetham\Desktop\ClinicCRM\reminder_processor_index.ts`
   - Complete Deno/TypeScript Edge Function implementation
   - Follows exact specification

2. **Setup Script**: `c:\Users\Vipul preetham\Desktop\ClinicCRM\clinic-crm\setup-reminder-processor.mjs`
   - Node.js/ES module script
   - Creates directory structure and installs the function

3. **Backup Copy**: `c:\Users\Vipul preetham\Desktop\ClinicCRM\clinic-crm\supabase\functions\reminder-processor.ts`
   - Copy of the source code in the functions directory

## Installation Instructions

### Option 1: Run the setup script (Recommended)

From the `clinic-crm` directory:
```bash
node setup-reminder-processor.mjs
```

This will:
- Create `supabase/functions/reminder-processor/` directory
- Create `supabase/functions/reminder-processor/index.ts` with the function code
- Clean up temporary files

### Option 2: Manual Setup

1. Create the directory: `clinic-crm\supabase\functions\reminder-processor\`
2. Copy the content from `reminder_processor_index.ts` into `reminder-processor\index.ts`
3. Delete the temporary files

### Option 3: Using Supabase CLI

```bash
cd clinic-crm
supabase functions deploy reminder-processor
```

## Function Specification

The reminder-processor Edge Function:
- **Trigger**: Every 15 minutes
- **Purpose**: Process due reminders from the reminder_queue

### Features:
1. **Time Window Calculation**: Processes reminders due within the next 15 minutes
2. **Reminder Fetching**: Retrieves pending reminders with related patient and appointment data
3. **Appointment Validation**: Skips reminders for cancelled appointments
4. **Channel-Specific Processing**:
   - **WhatsApp**: Creates conversations if needed, calls whatsapp-send function
   - **SMS**: Placeholder with TODO comment
   - **Email**: Placeholder with TODO comment
5. **Status Tracking**: Updates reminder status and logs in reminder_logs table
6. **Error Handling**: Catches and records errors for failed reminders

### Returns:
JSON response with:
```json
{
  "processed": <number>,
  "failed": <number>
}
```

## Environment Variables Required

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role API key (for privileged operations)

## Dependencies

- Deno standard library (`std@0.208.0`)
- Supabase SDK (`@supabase/supabase-js@2.38.0`)

## Database Tables

The function interacts with:
- `reminder_queue`: Source of reminders to process
- `patients`: Patient contact information
- `appointments`: Appointment status validation
- `reminder_rules`: Reminder rule metadata
- `whatsapp_conversations`: WhatsApp conversation tracking
- `reminder_logs`: Processing logs and audit trail

## Next Steps

1. Run the setup script to create the function directory structure
2. Deploy to Supabase using `supabase functions deploy`
3. Set up a cron job or Cloud Scheduler to invoke the function every 15 minutes
4. Monitor the reminder_logs table for processing status
5. Implement SMS and email channels when ready
