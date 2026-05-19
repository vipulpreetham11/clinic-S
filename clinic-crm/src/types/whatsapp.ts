// ============================================
// ClinicOS — WhatsApp Module TypeScript Types
// ============================================

export type ConversationStatus = 'open' | 'resolved' | 'bot_handling'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'template'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type TemplateCategory = 'appointment' | 'reminder' | 'followup' | 'general'

export interface WhatsAppConversation {
  id: string
  clinic_id: string
  patient_phone: string
  patient_name: string | null
  patient_id: string | null
  status: ConversationStatus
  ai_takeover_enabled: boolean
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  assigned_to: string | null
  created_at: string
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  clinic_id: string
  direction: MessageDirection
  sender: string
  message_type: MessageType
  content: string | null
  media_url: string | null
  media_mime_type: string | null
  whatsapp_message_id: string | null
  status: MessageStatus
  ai_generated: boolean
  created_at: string
}

export interface WhatsAppAIConfig {
  id: string
  clinic_id: string
  ai_enabled: boolean
  ai_persona_name: string
  system_prompt: string | null
  handoff_keywords: string[]
  business_hours_only: boolean
  business_hours_start: string
  business_hours_end: string
  max_ai_turns: number
  created_at: string
}

export interface WhatsAppTemplate {
  id: string
  clinic_id: string
  name: string
  content: string
  category: TemplateCategory
  created_at: string
}

export type ConversationFilter = 'all' | 'open' | 'bot_handling' | 'resolved'
