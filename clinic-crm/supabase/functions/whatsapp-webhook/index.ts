// supabase/functions/whatsapp-webhook/index.ts
// Deno Edge Function — handles inbound WhatsApp messages from Meta

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN")!
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN")!
const WA_PHONE_NUMBER_ID = Deno.env.get("WA_PHONE_NUMBER_ID")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function defaultSystemPrompt(): string {
  return `You are Priya, a helpful clinic receptionist assistant.
You help patients with:
- Booking appointments (collect: preferred date, time, doctor, reason for visit)
- Clinic timings and location
- General FAQs about the clinic and its services

Rules:
- Keep replies SHORT (max 3 sentences). This is WhatsApp, not email.
- Always respond in the same language the patient uses (Telugu, Hindi, English)
- Never give medical advice, diagnoses, or treatment recommendations
- If patient says "emergency", "urgent", "chest pain", "accident" → immediately say:
  "Please call our emergency number immediately. I'm alerting our staff now." Then stop.
- If unsure about anything, say "Let me connect you with our receptionist who can help better."
- Never make up appointment slots — say "Our receptionist will confirm your slot shortly."
- Tone: warm, helpful, professional. Not robotic.`
}

async function getClinicIdByPhoneNumberId(supabase: any, phoneNumberId: string): Promise<string | null> {
  // In a multi-clinic setup, map phone_number_id to clinic
  // For single-clinic, use the first active clinic
  const { data } = await supabase
    .from("clinics")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .single()
  return data?.id || null
}

async function matchPatientByPhone(supabase: any, convId: string, clinicId: string, phone: string) {
  const normalizedPhone = phone.replace(/^\+91/, "").replace(/\D/g, "")
  const { data: patient } = await supabase
    .from("patients")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
    .maybeSingle()

  if (patient) {
    await supabase
      .from("whatsapp_conversations")
      .update({
        patient_id: patient.id,
        patient_name: patient.name,
      })
      .eq("id", convId)
  }
}

async function sendWhatsAppMessage(to: string, content: string, phoneNumberId: string): Promise<string | null> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: content },
      }),
    }
  )
  const data = await res.json()
  return data.messages?.[0]?.id || null
}

async function maybeAIReply(
  supabase: any,
  conv: any,
  msgText: string,
  clinicId: string,
  phoneNumberId: string
) {
  if (!msgText) return

  // Fetch AI config
  const { data: config } = await supabase
    .from("whatsapp_ai_config")
    .select("*")
    .eq("clinic_id", clinicId)
    .maybeSingle()

  if (!config?.ai_enabled || !conv.ai_takeover_enabled) return

  // Check handoff keywords
  const lowerText = msgText.toLowerCase()
  const handoffTriggered = config.handoff_keywords?.some((kw: string) =>
    lowerText.includes(kw.toLowerCase())
  )

  if (handoffTriggered) {
    await supabase
      .from("whatsapp_conversations")
      .update({ ai_takeover_enabled: false, status: "open" })
      .eq("id", conv.id)
    // Send handoff message
    const handoffMsg = "I'm connecting you with our receptionist right away. Please hold on."
    const waId = await sendWhatsAppMessage(conv.patient_phone, handoffMsg, phoneNumberId)
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conv.id,
      clinic_id: clinicId,
      direction: "outbound",
      sender: "ai",
      content: handoffMsg,
      ai_generated: true,
      whatsapp_message_id: waId,
      status: "sent",
    })
    return
  }

  // Business hours check
  if (config.business_hours_only) {
    const now = new Date()
    const hour = now.getUTCHours() + 5 // IST offset approx
    const start = parseInt(config.business_hours_start?.split(":")[0] || "9")
    const end = parseInt(config.business_hours_end?.split(":")[0] || "18")
    if (hour < start || hour >= end) return
  }

  // Check AI turn count
  const { count } = await supabase
    .from("whatsapp_messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conv.id)
    .eq("ai_generated", true)

  if ((count || 0) >= (config.max_ai_turns || 5)) {
    await supabase
      .from("whatsapp_conversations")
      .update({ ai_takeover_enabled: false, status: "open" })
      .eq("id", conv.id)
    return
  }

  // Get last 10 messages for context
  const { data: history } = await supabase
    .from("whatsapp_messages")
    .select("direction, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const messages = (history || [])
    .filter((m: any) => m.content)
    .reverse()
    .map((m: any) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content,
    }))

  // Ensure we end on user turn
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    messages.push({ role: "user", content: msgText })
  }

  // Call Claude
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: config.system_prompt || defaultSystemPrompt(),
        messages,
      }),
    })

    const aiData = await claudeRes.json()
    const reply = aiData.content?.[0]?.text

    if (!reply) return

    // Send reply via WhatsApp
    const waId = await sendWhatsAppMessage(conv.patient_phone, reply, phoneNumberId)

    // Store outbound AI message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conv.id,
      clinic_id: clinicId,
      direction: "outbound",
      sender: "ai",
      content: reply,
      ai_generated: true,
      whatsapp_message_id: waId,
      status: "sent",
    })

    // Update conversation preview
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_preview: reply.slice(0, 100),
        last_message_at: new Date().toISOString(),
        status: "bot_handling",
      })
      .eq("id", conv.id)
  } catch (err) {
    console.error("Claude API error:", err)
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Webhook verification (GET from Meta)
  if (req.method === "GET") {
    const url = new URL(req.url)
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  // Inbound messages (POST)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const entry = body.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value

  if (!value) return new Response("OK", { status: 200 })

  const phoneNumberId = value.metadata?.phone_number_id || WA_PHONE_NUMBER_ID

  // Handle message status updates
  if (value.statuses) {
    for (const status of value.statuses) {
      if (status.id) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: status.status })
          .eq("whatsapp_message_id", status.id)
      }
    }
    return new Response("OK", { status: 200 })
  }

  // Handle inbound messages
  if (!value.messages) return new Response("OK", { status: 200 })

  for (const msg of value.messages) {
    const phone = msg.from
    const clinicId = await getClinicIdByPhoneNumberId(supabase, phoneNumberId)

    if (!clinicId) {
      console.error("Could not determine clinic from phone number ID:", phoneNumberId)
      continue
    }

    // Extract patient name from contacts if available
    const contactName = value.contacts?.[0]?.profile?.name || null

    // Upsert conversation
    const { data: conv, error: convErr } = await supabase
      .from("whatsapp_conversations")
      .upsert(
        {
          clinic_id: clinicId,
          patient_phone: phone,
          patient_name: contactName,
          last_message_at: new Date().toISOString(),
          last_message_preview: (msg.text?.body || msg.caption || "Media message").slice(0, 100),
          status: "open",
        },
        { onConflict: "clinic_id,patient_phone" }
      )
      .select()
      .single()

    if (convErr || !conv) {
      console.error("Conversation upsert error:", convErr)
      continue
    }

    // Increment unread count
    await supabase.rpc("increment_unread", { conv_id: conv.id })

    // Store inbound message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conv.id,
      clinic_id: clinicId,
      direction: "inbound",
      sender: phone,
      message_type: msg.type || "text",
      content: msg.text?.body || msg.caption || null,
      media_url: msg.image?.id || msg.document?.id || msg.audio?.id || null,
      media_mime_type: msg.image?.mime_type || msg.document?.mime_type || null,
      whatsapp_message_id: msg.id,
      status: "delivered",
    })

    // Try to match patient by phone
    await matchPatientByPhone(supabase, conv.id, clinicId, phone)

    // AI Takeover check (only for text messages)
    if (msg.type === "text" && msg.text?.body) {
      await maybeAIReply(supabase, conv, msg.text.body, clinicId, phoneNumberId)
    }
  }

  return new Response("OK", { status: 200 })
})
