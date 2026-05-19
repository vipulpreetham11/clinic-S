// supabase/functions/whatsapp-send/index.ts
// Deno Edge Function — sends outbound WhatsApp messages via Meta Graph API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN")!
const WA_PHONE_NUMBER_ID = Deno.env.get("WA_PHONE_NUMBER_ID")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { conversation_id, content, clinic_id, sender = "clinic" } = body

  if (!conversation_id || !content || !clinic_id) {
    return new Response(
      JSON.stringify({ error: "conversation_id, content, and clinic_id are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get conversation details
  const { data: conv, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select("patient_phone")
    .eq("id", conversation_id)
    .single()

  if (convError || !conv) {
    return new Response(
      JSON.stringify({ error: "Conversation not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Get clinic-specific phone number ID or fall back to global
  const phoneNumberId = Deno.env.get(`WA_PHONE_ID_${clinic_id}`) || WA_PHONE_NUMBER_ID

  // Send via Meta WhatsApp API
  const payload = {
    messaging_product: "whatsapp",
    to: conv.patient_phone,
    type: "text",
    text: { body: content },
  }

  let waMessageId: string | null = null
  let sendStatus = "sent"

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error("WhatsApp API error:", data)
      sendStatus = "failed"
    } else {
      waMessageId = data.messages?.[0]?.id || null
    }
  } catch (err) {
    console.error("WhatsApp API fetch error:", err)
    sendStatus = "failed"
  }

  // Store outbound message in DB regardless of send status
  const { data: message, error: msgError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id,
      clinic_id,
      direction: "outbound",
      sender,
      content,
      whatsapp_message_id: waMessageId,
      status: sendStatus,
      ai_generated: sender === "ai",
    })
    .select()
    .single()

  if (msgError) {
    console.error("Message insert error:", msgError)
    return new Response(
      JSON.stringify({ error: "Failed to store message" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Update conversation preview
  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_preview: content.slice(0, 100),
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversation_id)

  return new Response(
    JSON.stringify({ success: true, message, status: sendStatus }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
})
