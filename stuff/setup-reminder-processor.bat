@echo off
REM Setup script for reminder-processor Edge Function on Windows
REM This script creates the directory structure and copies the function code

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set FUNCTIONS_DIR=%SCRIPT_DIR%clinic-crm\supabase\functions
set REMINDER_PROCESSOR_DIR=%FUNCTIONS_DIR%reminder-processor

echo Creating reminder-processor Edge Function...
echo.

REM Create the directory
if not exist "%REMINDER_PROCESSOR_DIR%" (
    mkdir "%REMINDER_PROCESSOR_DIR%"
    echo [OK] Created directory: %REMINDER_PROCESSOR_DIR%
) else (
    echo [WARNING] Directory already exists: %REMINDER_PROCESSOR_DIR%
)

REM Create the index.ts file with the function code
(
echo import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
echo import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
echo.
echo serve(async (req) =^> {
echo   try {
echo     const supabaseUrl = Deno.env.get("SUPABASE_URL");
echo     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
echo.
echo     if (!supabaseUrl ^|^| !supabaseServiceKey) {
echo       return new Response(
echo         JSON.stringify({ error: "Missing Supabase configuration" }),
echo         { status: 500 }
echo       );
echo     }
echo.
echo     const supabase = createClient(supabaseUrl, supabaseServiceKey);
echo.
echo     // Calculate time window (now to now + 15 min)
echo     const now = new Date();
echo     const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);
echo.
echo     // Fetch pending reminders due in window
echo     const { data: reminders, error: fetchError } = await supabase
echo       .from("reminder_queue")
echo       .select(
echo         ^`
echo         id,
echo         status,
echo         scheduled_at,
echo         channel,
echo         patient:patients(id, phone_number, email),
echo         appointment:appointments(id, status),
echo         reminder_rule:reminder_rules(id)
echo       ^`
echo       )
echo       .eq("status", "pending")
echo       .lte("scheduled_at", windowEnd.toISOString())
echo       .order("scheduled_at", { ascending: true })
echo       .limit(100);
echo.
echo     if (fetchError) {
echo       console.error("Error fetching reminders:", fetchError);
echo       return new Response(
echo         JSON.stringify({ error: "Failed to fetch reminders" }),
echo         { status: 500 }
echo       );
echo     }
echo.
echo     let processed = 0;
echo     let failed = 0;
echo.
echo     for (const reminder of reminders ^|^| []) {
echo       try {
echo         // Check if appointment was cancelled
echo         if (reminder.appointment?.status === "cancelled") {
echo           await supabase
echo             .from("reminder_queue")
echo             .update({ status: "skipped" })
echo             .eq("id", reminder.id);
echo           continue;
echo         }
echo.
echo         if (reminder.channel === "whatsapp") {
echo           // Check for existing whatsapp_conversations
echo           const { data: conversation } = await supabase
echo             .from("whatsapp_conversations")
echo             .select("id")
echo             .eq("patient_id", reminder.patient.id)
echo             .single();
echo.
echo           let conversationId = conversation?.id;
echo.
echo           // Create conversation if not exists
echo           if (!conversationId) {
echo             const { data: newConversation, error: createError } = await supabase
echo               .from("whatsapp_conversations")
echo               .insert({
echo                 patient_id: reminder.patient.id,
echo                 status: "active",
echo                 created_at: new Date().toISOString(),
echo               })
echo               .select("id")
echo               .single();
echo.
echo             if (createError) {
echo               throw new Error(
echo                 `Failed to create conversation: ${createError.message}`
echo               );
echo             }
echo.
echo             conversationId = newConversation?.id;
echo           }
echo.
echo           // Call whatsapp-send Edge Function via fetch
echo           const whatsappResponse = await fetch(
echo             `${supabaseUrl}/functions/v1/whatsapp-send`,
echo             {
echo               method: "POST",
echo               headers: {
echo                 "Content-Type": "application/json",
echo                 Authorization: `Bearer ${supabaseServiceKey}`,
echo               },
echo               body: JSON.stringify({
echo                 patient_id: reminder.patient.id,
echo                 conversation_id: conversationId,
echo                 reminder_id: reminder.id,
echo               }),
echo             }
echo           );
echo.
echo           if (!whatsappResponse.ok) {
echo             throw new Error(
echo               `WhatsApp send failed: ${whatsappResponse.statusText}`
echo             );
echo           }
echo         } else if (reminder.channel === "sms") {
echo           // TODO: Implement SMS sending
echo           console.log("TODO: SMS sending not yet implemented");
echo         } else if (reminder.channel === "email") {
echo           // TODO: Implement email sending
echo           console.log("TODO: Email sending not yet implemented");
echo         }
echo.
echo         // Mark reminder status='sent', sent_at=now
echo         await supabase
echo           .from("reminder_queue")
echo           .update({
echo             status: "sent",
echo             sent_at: new Date().toISOString(),
echo           })
echo           .eq("id", reminder.id);
echo.
echo         // Insert into reminder_logs
echo         await supabase.from("reminder_logs").insert({
echo           reminder_id: reminder.id,
echo           status: "sent",
echo           sent_at: new Date().toISOString(),
echo         });
echo.
echo         processed++;
echo       } catch (error) {
echo         failed++;
echo         console.error(`Error processing reminder ${reminder.id}:`, error);
echo.
echo         // Mark status='failed', error_message=err
echo         await supabase
echo           .from("reminder_queue")
echo           .update({
echo             status: "failed",
echo             error_message: error.message,
echo           })
echo           .eq("id", reminder.id);
echo       }
echo     }
echo.
echo     return new Response(
echo       JSON.stringify({
echo         processed,
echo         failed,
echo       }),
echo       {
echo         headers: { "Content-Type": "application/json" },
echo       }
echo     );
echo   } catch (error) {
echo     console.error("Function error:", error);
echo     return new Response(
echo       JSON.stringify({ error: error.message }),
echo       { status: 500 }
echo     );
echo   }
echo });
) > "%REMINDER_PROCESSOR_DIR%\index.ts"

echo [OK] Created file: %REMINDER_PROCESSOR_DIR%\index.ts
echo.
echo ===================================================================
echo reminder-processor Edge Function setup complete!
echo ===================================================================
echo.
echo Next steps:
echo 1. Navigate to the clinic-crm directory
echo 2. Deploy to Supabase: supabase functions deploy reminder-processor
echo 3. Set up a cron trigger to run every 15 minutes
echo.
pause
