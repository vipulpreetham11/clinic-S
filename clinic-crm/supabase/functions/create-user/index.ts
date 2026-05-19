import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserBody {
  email: string
  password: string
  name: string
  role: 'admin' | 'receptionist' | 'doctor'
  clinic_id: string
  phone?: string
  specialization?: string
  qualification?: string
  working_days?: string[]
  arrival_time?: string
  departure_time?: string
  slot_duration?: number
  max_appointments_per_day?: number
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as CreateUserBody
    const {
      email,
      password,
      name,
      role,
      clinic_id,
      phone,
      specialization,
      qualification,
      working_days,
      arrival_time,
      departure_time,
      slot_duration,
      max_appointments_per_day,
    } = body

    if (!email?.trim() || !password || !name?.trim() || !role || !clinic_id) {
      return jsonResponse({ error: 'email, password, name, role, and clinic_id are required' }, 400)
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
    }

    const normalizedRole =
      role === 'clinic_admin' ? 'admin' : role

    if (!['admin', 'receptionist', 'doctor'].includes(normalizedRole)) {
      return jsonResponse({ error: 'Invalid role' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      return jsonResponse({ error: 'A user with this email already exists' }, 400)
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), role: normalizedRole, clinic_id },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create auth user')

    const userId = authData.user.id
    let doctorId: string | null = null

    try {
      if (normalizedRole === 'doctor') {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .insert({
            clinic_id,
            user_id: userId,
            name: name.trim(),
            specialization: specialization?.trim() || 'General Physician',
            qualification: qualification?.trim() || '',
            phone: phone?.trim() || '',
            working_days: working_days?.length
              ? working_days
              : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            arrival_time: arrival_time || '09:00',
            departure_time: departure_time || '18:00',
            slot_duration: slot_duration ?? 30,
            max_appointments_per_day: max_appointments_per_day ?? 20,
            is_active: true,
          })
          .select('id')
          .single()

        if (doctorError) throw doctorError
        doctorId = doctorData.id

        await supabase.from('doctor_breaks').insert({
          doctor_id: doctorId,
          label: 'Lunch Break',
          start_time: '13:00',
          end_time: '14:00',
        })
      }

      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        clinic_id,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || '',
        role: normalizedRole,
        is_active: true,
        doctor_id: doctorId,
      })

      if (userError) throw userError

      return jsonResponse({ user_id: userId, doctor_id: doctorId })
    } catch (innerErr) {
      await supabase.auth.admin.deleteUser(userId)
      if (doctorId) {
        await supabase.from('doctors').delete().eq('id', doctorId)
      }
      throw innerErr
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 400)
  }
})
