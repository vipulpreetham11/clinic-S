import React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Bell, CalendarPlus, ChevronUp, Trash2 } from 'lucide-react'
import type { WaitlistEntry } from '../../types/waitlist'
import { useUpdateWaitlistStatus } from '../../hooks/useWaitlist'
import { useNavigate } from 'react-router-dom'

interface WaitlistTableProps {
  waitlist: WaitlistEntry[]
  isLoading: boolean
  onNotify: (entry: WaitlistEntry) => void
}

export function WaitlistTable({ waitlist, isLoading, onNotify }: WaitlistTableProps) {
  const navigate = useNavigate()
  const updateMutation = useUpdateWaitlistStatus()

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 2: return <Badge variant="destructive">Urgent</Badge>
      case 1: return <Badge className="bg-amber-500 hover:bg-amber-600">High</Badge>
      default: return <Badge variant="secondary">Normal</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting': return <Badge variant="outline" className="text-blue-600 bg-blue-50">Waiting</Badge>
      case 'notified': return <Badge variant="outline" className="text-yellow-600 bg-yellow-50 flex gap-1 items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Notified</Badge>
      case 'booked': return <Badge variant="outline" className="text-green-600 bg-green-50">Booked</Badge>
      case 'expired': return <Badge variant="secondary">Expired</Badge>
      case 'cancelled': return <Badge variant="outline" className="line-through text-gray-500">Cancelled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatPrefTime = (start: string | null, end: string | null) => {
    if (!start && !end) return 'Any time'
    if (start && end) return `${start.substring(0, 5)} - ${end.substring(0, 5)}`
    return start?.substring(0, 5) || end?.substring(0, 5)
  }

  const handleBumpUp = (entry: WaitlistEntry) => {
    if (entry.priority < 2) {
      updateMutation.mutate({ id: entry.id, priority: entry.priority + 1 })
    }
  }

  const handleBookNow = (entry: WaitlistEntry) => {
    navigate('/appointments/new', { 
      state: { 
        prefilledPatient: entry.patients,
        prefilledDoctorId: entry.doctor_id,
        prefilledServiceId: entry.service_id,
        waitlistId: entry.id
      } 
    })
  }

  if (isLoading) return <div className="p-4 text-center text-sm text-gray-500">Loading waitlist...</div>
  if (!waitlist?.length) return <div className="p-4 text-center text-sm text-gray-500">Waitlist is currently empty.</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">Pos</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor Pref</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Pref. Date/Time</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Waiting Since</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {waitlist.map((entry, index) => (
            <TableRow key={entry.id} className={entry.status === 'notified' ? 'bg-yellow-50/50' : ''}>
              <TableCell className="text-center font-bold text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">
                {entry.patients?.name || 'Unknown'}
                <div className="text-xs text-muted-foreground">{entry.patients?.phone}</div>
              </TableCell>
              <TableCell>{entry.doctors?.name || 'Any'}</TableCell>
              <TableCell>{entry.services?.name || 'Any'}</TableCell>
              <TableCell>
                <div className="text-sm">{entry.preferred_date ? format(new Date(entry.preferred_date), 'dd MMM yyyy') : 'Any day'}</div>
                <div className="text-xs text-muted-foreground">{formatPrefTime(entry.preferred_time_start, entry.preferred_time_end)}</div>
              </TableCell>
              <TableCell>{getPriorityBadge(entry.priority)}</TableCell>
              <TableCell>{getStatusBadge(entry.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {['waiting', 'notified'].includes(entry.status) && (
                  <>
                    <Button variant="ghost" size="icon" title="Notify" onClick={() => onNotify(entry)}>
                      <Bell className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Book Now" className="text-blue-600" onClick={() => handleBookNow(entry)}>
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                    {entry.priority < 2 && (
                      <Button variant="ghost" size="icon" title="Bump Priority" onClick={() => handleBumpUp(entry)} disabled={updateMutation.isPending}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Cancel Entry"
                      className="text-red-500" 
                      onClick={() => {
                        if (window.confirm('Cancel this waitlist entry?')) {
                          updateMutation.mutate({ id: entry.id, status: 'cancelled' })
                        }
                      }}
                      disabled={updateMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
