import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, FileEdit, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Patient } from '@/types'

interface PatientCardProps {
  patient: Patient
  onEdit: (patient: Patient) => void
  onDelete: (patient: Patient) => void
}

export function PatientCard({ patient, onEdit, onDelete }: PatientCardProps) {
  const navigate = useNavigate()
  
  const initials = patient.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const getAvatarColor = (gender?: string | null) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'bg-blue-100 text-blue-700'
      case 'female':
        return 'bg-pink-100 text-pink-700'
      default:
        return 'bg-purple-100 text-purple-700'
    }
  }

  // Calculate age
  let ageDisplay = '-'
  if (patient.date_of_birth) {
    const dob = new Date(patient.date_of_birth)
    const diffMs = Date.now() - dob.getTime()
    const ageDate = new Date(diffMs)
    const years = Math.abs(ageDate.getUTCFullYear() - 1970)
    if (years === 0) {
      const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
      ageDisplay = `${months} mo`
    } else {
      ageDisplay = `${years} yrs`
    }
  }

  // Format phone
  const formattedPhone = patient.phone.length === 10
    ? `${patient.phone.substring(0, 5)} ${patient.phone.substring(5)}`
    : patient.phone

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <Avatar className="h-12 w-12 border">
            <AvatarFallback className={getAvatarColor(patient.gender)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-base leading-none mb-1">{patient.name}</h3>
            <p className="text-sm text-muted-foreground">{formattedPhone}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(patient)}>
              <FileEdit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => onDelete(patient)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Age / Gender</span>
          <span className="font-medium">{ageDisplay} • {patient.gender || 'Unknown'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Blood Group</span>
          <span className="font-medium">{patient.blood_group || '-'}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-3 border-t text-sm">
        <span className="text-muted-foreground text-xs">
          Added {formatDistanceToNow(new Date(patient.created_at), { addSuffix: true })}
        </span>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/patients/${patient.id}`)}>
          View Details
        </Button>
      </div>
    </div>
  )
}
