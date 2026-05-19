import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  CalendarPlus,
  UserPlus,
  Search,
  ListOrdered,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PatientSearch } from '@/components/appointments/PatientSearch'
import { PatientFormModal } from '@/components/patients/PatientFormModal'
import { useAuthContext } from '@/context/AuthContext'
import type { Patient } from '@/types'

interface QuickActionsBarProps {
  onWaitlist?: () => void
}

export function QuickActionsBar({ onWaitlist }: QuickActionsBarProps) {
  const navigate = useNavigate()
  const { clinic } = useAuthContext()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [searchOpen, setSearchOpen] = useState(false)
  const [patientModalOpen, setPatientModalOpen] = useState(false)
  const [walkInFlow, setWalkInFlow] = useState(false)

  function goNewAppointment(patientId?: string) {
    const params = new URLSearchParams({ date: today })
    if (patientId) params.set('patientId', patientId)
    navigate(`/appointments/new?${params.toString()}`)
  }

  function handlePatientSelect(patient: Patient | null) {
    if (patient) {
      setSearchOpen(false)
      navigate(`/patients/${patient.id}`)
    }
  }

  const actions = [
    {
      label: 'New Appointment',
      icon: CalendarPlus,
      onClick: () => goNewAppointment(),
    },
    {
      label: 'Walk-in Patient',
      icon: UserPlus,
      onClick: () => {
        setWalkInFlow(true)
        setPatientModalOpen(true)
      },
    },
    {
      label: 'Search Patient',
      icon: Search,
      onClick: () => setSearchOpen(true),
    },
    {
      label: 'View Waitlist',
      icon: ListOrdered,
      onClick: onWaitlist,
    },
  ]

  return (
    <>
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              variant="outline"
              className="h-11 justify-start gap-2 font-medium"
              onClick={action.onClick}
            >
              <Icon className="h-4 w-4 text-primary" />
              {action.label}
            </Button>
          )
        })}
      </div>

      <div className="sm:hidden fixed bottom-20 right-4 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={
              <div
                className="inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                aria-label="Quick actions"
              >
                <MoreHorizontal className="h-6 w-6" />
              </div>
            }
          />
          <DropdownMenuContent align="end" className="w-52 mb-2">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem key={action.label} onClick={action.onClick} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Patient</DialogTitle>
          </DialogHeader>
          {clinic?.id && (
            <PatientSearch
              clinicId={clinic.id}
              onPatientSelect={handlePatientSelect}
              onNewPatient={() => {
                setSearchOpen(false)
                setWalkInFlow(false)
                setPatientModalOpen(true)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <PatientFormModal
        isOpen={patientModalOpen}
        onClose={() => {
          setPatientModalOpen(false)
          setWalkInFlow(false)
        }}
        onCreated={(patient) => {
          if (walkInFlow) {
            goNewAppointment(patient.id)
          }
        }}
      />
    </>
  )
}
