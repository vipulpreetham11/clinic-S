import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
export function useRealtimeAppointments() {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clinic?.id) return

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload: { eventType: string }) => {
          queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] })
          queryClient.invalidateQueries({ queryKey: ['receptionist'] })

          if (payload.eventType === 'INSERT') {
            toast.info('New appointment booked')
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Appointment status updated')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinic?.id, queryClient])
}
