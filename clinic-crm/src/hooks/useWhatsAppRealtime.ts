import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Short chime sound encoded as base64 data URI
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+
  'dvT18A'  // Minimal placeholder — replace with real base64 chime

function playNotificationSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND)
    audio.volume = 0.5
    audio.play().catch(() => {/* ignore autoplay block */})
  } catch {/* ignore */}
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    new Notification(title, {
      body,
      icon: '/vite.svg',
      tag: 'whatsapp-message',
    })
  }
}

export function useWhatsAppRealtime(clinicId: string | undefined) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    if (!clinicId) return

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`whatsapp-realtime-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          const msg = payload.new as any

          // Invalidate both lists
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', msg.conversation_id] })

          // Only notify for inbound messages
          if (msg.direction === 'inbound') {
            playNotificationSound()
            showBrowserNotification(
              'New WhatsApp Message',
              msg.content || 'Media message received'
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [clinicId, queryClient])
}
