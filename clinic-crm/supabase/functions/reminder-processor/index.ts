import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000) // next 15 min

    // Fetch due reminders
    const { data: dueReminders, error: fetchError } = await supabase
      .from('reminder_queue')
      .select(`
        *,
        patients(name, phone, email),
        appointments(scheduled_at, notes),
        reminder_rules(channel)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', windowEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(100)

    if (fetchError) throw fetchError

    if (!dueReminders?.length) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    let processed = 0
    let failed = 0

    for (const reminder of dueReminders) {
      try {
        // Skip if appointment was cancelled
        const { data: apt } = await supabase
          .from('appointments')
          .select('status')
          .eq('id', reminder.appointment_id)
          .single()

        if (['cancelled', 'no_show'].includes(apt?.status)) {
          await supabase
            .from('reminder_queue')
            .update({ status: 'skipped' })
            .eq('id', reminder.id)
          continue
        }

        if (reminder.channel === 'whatsapp') {
          // Check if patient has active WhatsApp conversation
          const { data: conv } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('clinic_id', reminder.clinic_id)
            .eq('patient_phone', reminder.patients.phone)
            .single()

          let convId = conv?.id

          // Create conversation if not exists
          if (!convId) {
            const { data: newConv, error: convError } = await supabase
              .from('whatsapp_conversations')
              .insert({
                clinic_id: reminder.clinic_id,
                patient_phone: reminder.patients.phone,
                patient_name: reminder.patients.name,
                patient_id: reminder.patient_id,
                status: 'open'
              })
              .select().single()

            if (convError) throw convError
            convId = newConv.id
          }

          // Send via whatsapp-send function
          const sendRes = await fetch(
            `${supabaseUrl}/functions/v1/whatsapp-send`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                conversation_id: convId,
                content: reminder.message_content,
                clinic_id: reminder.clinic_id
              })
            }
          )

          if (!sendRes.ok) {
            const errBody = await sendRes.text();
            throw new Error(`WhatsApp send failed: ${errBody}`)
          }
        }

        // sms / email: stub
        if (reminder.channel === 'sms') {
          // TODO: integrate Twilio / MSG91
          console.log(`SMS stub: ${reminder.patients.phone} → ${reminder.message_content}`)
        }
        if (reminder.channel === 'email') {
          // TODO: integrate Resend / SendGrid
          console.log(`Email stub: ${reminder.patients.email} → ${reminder.message_content}`)
        }

        // Mark sent
        await supabase
          .from('reminder_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reminder.id)

        // Log
        await supabase.from('reminder_logs').insert({
          reminder_queue_id: reminder.id,
          clinic_id: reminder.clinic_id,
          patient_id: reminder.patient_id,
          channel: reminder.channel,
          message_content: reminder.message_content,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

        processed++
      } catch (err: any) {
        console.error(`Failed processing reminder ${reminder.id}:`, err)
        await supabase
          .from('reminder_queue')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', reminder.id)
        
        await supabase.from('reminder_logs').insert({
          reminder_queue_id: reminder.id,
          clinic_id: reminder.clinic_id,
          patient_id: reminder.patient_id,
          channel: reminder.channel,
          message_content: reminder.message_content,
          status: 'failed',
          sent_at: new Date().toISOString()
        })
        
        failed++
      }
    }

    return new Response(JSON.stringify({ processed, failed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Reminder processor error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
