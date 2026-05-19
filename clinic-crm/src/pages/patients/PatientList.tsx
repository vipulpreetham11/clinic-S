import { useState, useEffect } from 'react'
import { Users, Plus, Search, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { usePatients, useDeletePatient } from '@/hooks/usePatients'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { PatientFormModal } from '@/components/patients/PatientFormModal'
import { PatientCard } from '@/components/patients/PatientCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { Patient } from '@/types'

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

export default function PatientList() {
  const navigate = useNavigate()
  const deletePatient = useDeletePatient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  
  const [page, setPage] = useState(1)
  const [genderFilter, setGenderFilter] = useState('all')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all')
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)

  const { data: { data: patients = [], totalPages = 1 } = {}, isLoading } = usePatients({
    search: debouncedSearch,
    page,
    filters: {
      gender: genderFilter,
      blood_group: bloodGroupFilter,
    }
  })

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, genderFilter, bloodGroupFilter])

  const handleDelete = async (patient: Patient) => {
    if (confirm(`Are you sure you want to delete ${patient.name}? This action cannot be undone.`)) {
      await deletePatient.mutateAsync(patient.id)
    }
  }

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setIsAddModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Patient directory and records"
        action={
          <Button onClick={() => { setEditingPatient(null); setIsAddModalOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Patient
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v || 'all')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bloodGroupFilter} onValueChange={(v) => setBloodGroupFilter(v || 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Blood Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : patients.length > 0 ? (
        <>
          {/* Mobile view */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {patients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Age / Gender</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => {
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

                  return (
                    <TableRow key={patient.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => navigate(`/patients/${patient.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {patient.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <span className="font-medium text-slate-900">{patient.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{ageDisplay} • {patient.gender || '-'}</TableCell>
                      <TableCell>
                        {patient.blood_group && patient.blood_group !== 'Unknown' 
                          ? <Badge variant="outline">{patient.blood_group}</Badge>
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(patient.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Filter className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(patient)}>
                              Edit patient
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => handleDelete(patient)}>
                              Delete patient
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={debouncedSearch || genderFilter !== 'all' || bloodGroupFilter !== 'all' ? "No patients found matching filters" : "No patients found"}
          description={debouncedSearch || genderFilter !== 'all' || bloodGroupFilter !== 'all' ? "Try adjusting your search or filters." : "Your patient database is empty."}
          action={
            (!debouncedSearch && genderFilter === 'all' && bloodGroupFilter === 'all') && (
              <Button onClick={() => { setEditingPatient(null); setIsAddModalOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Add Patient
              </Button>
            )
          }
        />
      )}

      <PatientFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        patient={editingPatient}
      />
    </div>
  )
}
