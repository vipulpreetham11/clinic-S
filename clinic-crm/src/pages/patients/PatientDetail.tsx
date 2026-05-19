import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, CalendarPlus, Phone, Mail, MapPin, Activity } from 'lucide-react'
import { usePatient } from '@/hooks/usePatients'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PatientFormModal } from '@/components/patients/PatientFormModal'
import { PatientTabs } from '@/components/patients/PatientTabs'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: patient, isLoading, isError } = usePatient(id)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient Profile" description="Loading..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 md:col-span-2 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient Not Found" />
        <Button variant="outline" onClick={() => navigate('/patients')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patients
        </Button>
      </div>
    )
  }

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

  const formattedPhone = patient.phone.length === 10
    ? `${patient.phone.substring(0, 5)} ${patient.phone.substring(5)}`
    : patient.phone

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Patient Profile</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button onClick={() => navigate('/appointments/new', { state: { prefilledPatient: patient } })}>
            <CalendarPlus className="mr-2 h-4 w-4" /> Book Appointment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Patient Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center pb-6 border-b">
                <Avatar className="h-24 w-24 mb-4 border-2">
                  <AvatarFallback className={`text-2xl ${getAvatarColor(patient.gender)}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{patient.name}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{ageDisplay}</span>
                  <span>•</span>
                  <span>{patient.gender || 'Unknown'}</span>
                </div>
                {patient.blood_group && patient.blood_group !== 'Unknown' && (
                  <Badge variant="outline" className="mt-3 bg-red-50 text-red-700 border-red-200">
                    Blood: {patient.blood_group}
                  </Badge>
                )}
              </div>

              <div className="pt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a href={`tel:${patient.phone}`} className="text-primary hover:underline">
                      {formattedPhone}
                    </a>
                  </div>
                </div>
                
                {patient.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${patient.email}`} className="text-muted-foreground hover:underline">
                        {patient.email}
                      </a>
                    </div>
                  </div>
                )}
                
                {patient.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground leading-relaxed">{patient.address}</p>
                    </div>
                  </div>
                )}

                {patient.allergies && (
                  <div className="flex items-start gap-3 pt-4 border-t">
                    <Activity className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="w-full">
                      <p className="font-medium text-destructive mb-1.5">Allergies</p>
                      <div className="flex flex-wrap gap-1.5">
                        {patient.allergies.split(',').map((allergy) => (
                          <Badge key={allergy.trim()} variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
                            {allergy.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Tabs */}
        <div className="lg:col-span-2">
          <PatientTabs patientId={patient.id} />
        </div>
      </div>

      <PatientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        patient={patient}
      />
    </div>
  )
}
