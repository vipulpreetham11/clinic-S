import { supabase } from '@/lib/supabase'

export async function getTodayStats(clinicId: string) {
  const today = new Date().toISOString().split('T')[0]
  
  const [
    appointmentsResult,
    confirmedResult,
    completedResult,
    cancelledResult,
    noShowResult,
    newPatientsResult,
    waitlistResult,
    pendingRemindersResult,
    activeConversationsResult,
  ] = await Promise.all([
    // Total appointments today
    supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('date', today),
    
    // Confirmed today
    supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('date', today)
      .eq('status', 'confirmed'),
    
    // Completed today
    supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('date', today)
      .eq('status', 'completed'),
    
    // Cancelled today
    supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('date', today)
      .eq('status', 'cancelled'),
    
    // No shows today
    supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('date', today)
      .eq('status', 'no_show'),
    
    // New patients today
    supabase.from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),
    
    // Waitlist count
    supabase.from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'waiting'),
    
    // Pending reminders
    supabase.from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'pending'),

    // Active WhatsApp conversations
    supabase.from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_ai_active', true)
      .gte('last_message_at', 
        new Date(Date.now() - 24*60*60*1000).toISOString()
      ),
  ])

  return {
    total: appointmentsResult.count || 0,
    confirmed: confirmedResult.count || 0,
    completed: completedResult.count || 0,
    cancelled: cancelledResult.count || 0,
    no_show: noShowResult.count || 0,
    new_patients: newPatientsResult.count || 0,
    waitlist: waitlistResult.count || 0,
    pending_reminders: pendingRemindersResult.count || 0,
    active_conversations: activeConversationsResult.count || 0,
  }
}

export async function getTodayAppointments(clinicId: string) {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, start_time, end_time, status, source,
      patients(id, name, phone, is_vip, allergies),
      doctors(id, name, specialization, photo_url),
      services(id, name, duration_minutes, price)
    `)
    .eq('clinic_id', clinicId)
    .eq('date', today)
    .order('start_time', { ascending: true })
  
  if (error) throw error
  return (data || []).map((item: any) => ({
    ...item,
    patient: item.patients ?? null,
    doctor: item.doctors ?? null,
    service: item.services ?? null,
  }))
}

export async function getDoctorStatusToday(clinicId: string) {
  const dayName = new Date().toLocaleDateString('en-US', 
    { weekday: 'short' }
  )

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select(`
      id, name, specialization, photo_url,
      arrival_time, departure_time, 
      working_days, is_active,
      appointments:appointments(
        id, status
      )
    `)
    .eq('clinic_id', clinicId)
    .eq('is_active', true)

  if (error) throw error

  return doctors?.map(doctor => {
    const isWorkingToday = doctor.working_days?.includes(dayName)
    const todayApts = doctor.appointments?.filter(
      (a: any) => a.status !== 'cancelled'
    ) || []
    const completedApts = doctor.appointments?.filter(
      (a: any) => a.status === 'completed'
    ) || []

    return {
      ...doctor,
      isWorkingToday,
      totalTodayApts: todayApts.length,
      completedApts: completedApts.length,
      remainingApts: todayApts.length - completedApts.length,
    }
  }) || []
}

export async function getWeeklyTrend(clinicId: string) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const { data, error } = await supabase
    .from('appointments')
    .select('date, status')
    .eq('clinic_id', clinicId)
    .in('date', days)

  if (error) throw error

  return days.map(date => ({
    date,
    day: new Date(date).toLocaleDateString('en-US', 
      { weekday: 'short' }
    ),
    total: data?.filter(a => a.date === date).length || 0,
    completed: data?.filter(
      a => a.date === date && a.status === 'completed'
    ).length || 0,
  }))
}

export async function getRecentActivity(clinicId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, status, source, created_at, date, start_time,
      patient:patients(name, phone),
      service:services(name)
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) throw error
  return data || []
}
