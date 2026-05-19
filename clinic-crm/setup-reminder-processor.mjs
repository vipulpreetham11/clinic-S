import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const basePath = join(__dirname, 'supabase', 'functions');
const reminderProcessorDir = join(basePath, 'reminder-processor');
const indexPath = join(reminderProcessorDir, 'index.ts');

const reminderProcessorCode = `import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

async function setup() {
  try {
    // Create directory structure
    await fs.mkdir(reminderProcessorDir, { recursive: true });
    console.log('✓ Created directory:', reminderProcessorDir);
    
    // Write the index.ts file
    await fs.writeFile(indexPath, reminderProcessorCode);
    console.log('✓ Created file:', indexPath);
    
    console.log('\n✓ reminder-processor Edge Function created successfully!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

setup();
