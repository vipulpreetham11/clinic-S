#!/usr/bin/env node

/**
 * Automated setup script for reminder-processor Edge Function
 * 
 * Usage: node setup-reminder-processor-cli.js
 * 
 * This script:
 * 1. Creates the reminder-processor directory
 * 2. Creates the index.ts file with Edge Function code
 * 3. Cleans up temporary files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = __dirname;
const functionsDir = path.join(projectRoot, 'supabase', 'functions');
const reminderProcessorDir = path.join(functionsDir, 'reminder-processor');
const indexFile = path.join(reminderProcessorDir, 'index.ts');

const functionCode = `import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time window (now to now + 15 min)
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    // Fetch pending reminders due in window
    const { data: reminders, error: fetchError } = await supabase
      .from("reminder_queue")
      .select(
        \`
        id,
        status,
        scheduled_at,
        channel,
        patient:patients(id, phone_number, email),
        appointment:appointments(id, status),
        reminder_rule:reminder_rules(id)
      \`
      )
      .eq("status", "pending")
      .lte("scheduled_at", windowEnd.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching reminders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reminders" }),
        { status: 500 }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const reminder of reminders || []) {
      try {
        // Check if appointment was cancelled
        if (reminder.appointment?.status === "cancelled") {
          await supabase
            .from("reminder_queue")
            .update({ status: "skipped" })
            .eq("id", reminder.id);
          continue;
        }

        if (reminder.channel === "whatsapp") {
          // Check for existing whatsapp_conversations
          const { data: conversation } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("patient_id", reminder.patient.id)
            .single();

          let conversationId = conversation?.id;

          // Create conversation if not exists
          if (!conversationId) {
            const { data: newConversation, error: createError } = await supabase
              .from("whatsapp_conversations")
              .insert({
                patient_id: reminder.patient.id,
                status: "active",
                created_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (createError) {
              throw new Error(
                \`Failed to create conversation: \${createError.message}\`
              );
            }

            conversationId = newConversation?.id;
          }

          // Call whatsapp-send Edge Function via fetch
          const whatsappResponse = await fetch(
            \`\${supabaseUrl}/functions/v1/whatsapp-send\`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: \`Bearer \${supabaseServiceKey}\`,
              },
              body: JSON.stringify({
                patient_id: reminder.patient.id,
                conversation_id: conversationId,
                reminder_id: reminder.id,
              }),
            }
          );

          if (!whatsappResponse.ok) {
            throw new Error(
              \`WhatsApp send failed: \${whatsappResponse.statusText}\`
            );
          }
        } else if (reminder.channel === "sms") {
          // TODO: Implement SMS sending
          console.log("TODO: SMS sending not yet implemented");
        } else if (reminder.channel === "email") {
          // TODO: Implement email sending
          console.log("TODO: Email sending not yet implemented");
        }

        // Mark reminder status='sent', sent_at=now
        await supabase
          .from("reminder_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        // Insert into reminder_logs
        await supabase.from("reminder_logs").insert({
          reminder_id: reminder.id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        processed++;
      } catch (error) {
        failed++;
        console.error(\`Error processing reminder \${reminder.id}:\`, error);

        // Mark status='failed', error_message=err
        await supabase
          .from("reminder_queue")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", reminder.id);
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        failed,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
`;

function log(msg, type = 'info') {
  const icons = { info: 'ℹ️ ', success: '✓ ', error: '✗ ', warn: '⚠️ ' };
  console.log(\`\${icons[type]}\${msg}\`);
}

try {
  log('Setting up reminder-processor Edge Function...');
  
  // Create directory
  if (!fs.existsSync(reminderProcessorDir)) {
    fs.mkdirSync(reminderProcessorDir, { recursive: true });
    log(\`Created directory: \${reminderProcessorDir}\`, 'success');
  } else {
    log(\`Directory already exists: \${reminderProcessorDir}\`, 'warn');
  }
  
  // Create index.ts
  fs.writeFileSync(indexFile, functionCode);
  log(\`Created file: \${indexFile}\`, 'success');
  
  log('\\nreminder-processor Edge Function setup complete!', 'success');
  log('\\nNext steps:', 'info');
  log('1. Deploy to Supabase: supabase functions deploy reminder-processor', 'info');
  log('2. Set up a cron trigger to run every 15 minutes', 'info');
  
} catch (error) {
  log(\`Error during setup: \${error.message}\`, 'error');
  process.exit(1);
}
`;

fs.writeFileSync(path.join(projectRoot, 'setup-reminder-processor-cli.js'), 
  functionCode);

console.log('Setup script created at: setup-reminder-processor-cli.js');
console.log('To run: node setup-reminder-processor-cli.js');
