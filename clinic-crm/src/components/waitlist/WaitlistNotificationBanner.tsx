import React from 'react'
import { useWaitlistNotifications } from '../../hooks/useWaitlist'
import { useAuthContext } from '../../context/AuthContext'
import { Bell, X } from 'lucide-react'
import { Button } from '../ui/button'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export function WaitlistNotificationBanner() {
  const { clinic, role } = useAuthContext()
  const clinicId = clinic?.id
  const navigate = useNavigate()
  const { data: notifications, refetch } = useWaitlistNotifications(clinicId || undefined)

  if (!notifications || notifications.length === 0 || !['admin', 'receptionist'].includes(role || '')) {
    return null
  }

  const dismissNotification = async (id: string) => {
    await supabase.from('waitlist_notifications').update({ status: 'expired' }).eq('id', id)
    refetch()
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {notifications.map((notif) => (
        <div key={notif.id} className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-blue-500 animate-bounce" />
            <div>
              <p className="font-medium text-sm">Slot available!</p>
              <p className="text-xs">
                {notif.waitlist?.patients?.name} on the waitlist matches a cancelled slot on {notif.available_appointment_slot ? format(new Date(notif.available_appointment_slot), 'dd MMM, hh:mm a') : 'Unknown'}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate('/waitlist')} className="bg-blue-600 hover:bg-blue-700 text-white">
              View Waitlist
            </Button>
            <Button size="icon" variant="ghost" onClick={() => dismissNotification(notif.id)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-100">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
