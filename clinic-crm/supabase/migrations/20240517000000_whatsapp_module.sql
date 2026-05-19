-- Migration: Create WhatsApp Business Module Tables
-- 1. whatsapp_conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_phone TEXT NOT NULL,
    patient_name TEXT,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'bot_handling'
    ai_takeover_enabled BOOLEAN NOT NULL DEFAULT true,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_preview TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(clinic_id, patient_phone)
);

-- 2. whatsapp_messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender TEXT NOT NULL, -- phone number or 'ai' or 'staff'
    message_type TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    whatsapp_message_id TEXT, -- Meta's message ID for tracking delivery
    status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, read, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. whatsapp_templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en_US',
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(clinic_id, name)
);

-- 4. whatsapp_ai_config
CREATE TABLE IF NOT EXISTS public.whatsapp_ai_config (
    clinic_id UUID PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
    ai_enabled BOOLEAN NOT NULL DEFAULT false,
    system_prompt TEXT,
    handoff_keywords TEXT[] DEFAULT '{"human", "agent", "receptionist", "operator", "emergency", "urgent"}',
    business_hours_only BOOLEAN NOT NULL DEFAULT true,
    business_hours_start TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
    business_hours_end TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
    max_ai_turns INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RPC for incrementing unread count safely
CREATE OR REPLACE FUNCTION public.increment_unread(conv_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET unread_count = unread_count + 1
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for resetting unread count
CREATE OR REPLACE FUNCTION public.reset_unread(conv_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET unread_count = 0
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read for authenticated users on whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_conversations.clinic_id));
CREATE POLICY "Enable insert for authenticated users on whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_conversations.clinic_id));
CREATE POLICY "Enable update for authenticated users on whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_conversations.clinic_id));

CREATE POLICY "Enable read for authenticated users on whatsapp_messages" ON public.whatsapp_messages FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_messages.clinic_id));
CREATE POLICY "Enable insert for authenticated users on whatsapp_messages" ON public.whatsapp_messages FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_messages.clinic_id));
CREATE POLICY "Enable update for authenticated users on whatsapp_messages" ON public.whatsapp_messages FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_messages.clinic_id));

CREATE POLICY "Enable read for authenticated users on whatsapp_templates" ON public.whatsapp_templates FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_templates.clinic_id));
CREATE POLICY "Enable insert for authenticated users on whatsapp_templates" ON public.whatsapp_templates FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_templates.clinic_id));
CREATE POLICY "Enable update for authenticated users on whatsapp_templates" ON public.whatsapp_templates FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_templates.clinic_id));
CREATE POLICY "Enable delete for authenticated users on whatsapp_templates" ON public.whatsapp_templates FOR DELETE USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_templates.clinic_id));

CREATE POLICY "Enable read for authenticated users on whatsapp_ai_config" ON public.whatsapp_ai_config FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_ai_config.clinic_id));
CREATE POLICY "Enable insert for authenticated users on whatsapp_ai_config" ON public.whatsapp_ai_config FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_ai_config.clinic_id));
CREATE POLICY "Enable update for authenticated users on whatsapp_ai_config" ON public.whatsapp_ai_config FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE clinic_id = whatsapp_ai_config.clinic_id));

-- Triggers for updated_at if they use that convention
-- (assuming trigger function handle_updated_at() exists)
-- CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
