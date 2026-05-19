import React, { useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { useWaitlist } from '../../hooks/useWaitlist'
import { WaitlistTable } from '../../components/waitlist/WaitlistTable'
import { AddWaitlistModal } from '../../components/waitlist/AddWaitlistModal'
import { NotifyWaitlistModal } from '../../components/waitlist/NotifyWaitlistModal'
import { WaitlistStats } from '../../components/waitlist/WaitlistStats'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useDoctors } from '../../hooks/useDoctors'
import type { WaitlistEntry } from '../../types/waitlist'

export default function Waitlist() {
  const { clinic } = useAuthContext()
  const clinicId = clinic?.id
  const { data: doctors } = useDoctors()

  const [statusFilter, setStatusFilter] = useState('waiting')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)
  const [notifyEntry, setNotifyEntry] = useState<WaitlistEntry | null>(null)

  const { data: waitlist, isLoading } = useWaitlist(clinicId || undefined, {
    status: statusFilter,
    priority: priorityFilter,
    doctor_id: doctorFilter
  })

  const { data: fullWaitlist } = useWaitlist(clinicId || undefined, { status: 'all' })

  const handleNotify = (entry: WaitlistEntry) => {
    setNotifyEntry(entry)
    setIsNotifyModalOpen(true)
  }

  if (!clinicId) return null

  const waitingCount = fullWaitlist?.filter((e: WaitlistEntry) => e.status === 'waiting').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Waitlist</h1>
            {waitingCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                {waitingCount} waiting
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Manage patients waiting for available slots</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add to Waitlist
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
          <SelectTrigger className="w-44 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="notified">Notified</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v || 'all')}>
          <SelectTrigger className="w-44 bg-white">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="0">Normal</SelectItem>
            <SelectItem value="1">High</SelectItem>
            <SelectItem value="2">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={doctorFilter} onValueChange={(v) => setDoctorFilter(v || 'all')}>
          <SelectTrigger className="w-52 bg-white">
            <SelectValue placeholder="Preferred Doctor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Doctor</SelectItem>
            {doctors?.map((doc: any) => (
              <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <WaitlistTable
        waitlist={waitlist || []}
        isLoading={isLoading}
        onNotify={handleNotify}
      />

      <WaitlistStats waitlist={fullWaitlist || []} />

      <AddWaitlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        clinicId={clinicId}
      />
      <NotifyWaitlistModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        entry={notifyEntry}
      />
    </div>
  )
}
