import { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'M' },
  { id: 'tuesday', label: 'T' },
  { id: 'wednesday', label: 'W' },
  { id: 'thursday', label: 'T' },
  { id: 'friday', label: 'F' },
  { id: 'saturday', label: 'S' },
  { id: 'sunday', label: 'S' },
]

export function AddUserModal({
  clinicId,
  open,
  onOpenChange,
}: {
  clinicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Basic User fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'clinic_admin' | 'receptionist' | 'doctor'>('clinic_admin')

  // Doctor extra fields
  const [specialization, setSpecialization] = useState('')
  const [qualification, setQualification] = useState('')
  const [arrivalTime, setArrivalTime] = useState('09:00')
  const [departureTime, setDepartureTime] = useState('18:00')
  const [slotDuration, setSlotDuration] = useState('15')
  const [maxAppointments, setMaxAppointments] = useState('20')
  const [workingDays, setWorkingDays] = useState<string[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ])

  function toggleDay(day: string) {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day))
    } else {
      setWorkingDays([...workingDays, day])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password || !role) {
      toast.error('Please fill all required fields')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        name,
        email,
        password,
        role,
        clinic_id: clinicId,
        phone: phone || undefined,
      }

      if (role === 'doctor') {
        payload.specialization = specialization || undefined
        payload.qualification = qualification || undefined
        payload.arrival_time = arrivalTime
        payload.departure_time = departureTime
        payload.slot_duration = parseInt(slotDuration, 10)
        payload.max_appointments_per_day = parseInt(maxAppointments, 10)
        payload.working_days = workingDays
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: payload,
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      toast.success(`${role.replace('_', ' ')} account created successfully`)
      queryClient.invalidateQueries({ queryKey: ['clinic-users', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['clinic-stats', clinicId] })
      
      if (role === 'doctor') {
        queryClient.invalidateQueries({ queryKey: ['clinic-doctors', clinicId] })
      }

      handleClose()
    } catch (err: any) {
      console.error('Error creating user:', err)
      toast.error(err.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setName('')
    setEmail('')
    setPassword('')
    setPhone('')
    setRole('clinic_admin')
    setSpecialization('')
    setQualification('')
    setArrivalTime('09:00')
    setDepartureTime('18:00')
    setSlotDuration('15')
    setMaxAppointments('20')
    setWorkingDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create an account for this clinic. They will receive an email to sign in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="clinic_admin">Clinic Admin</option>
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>
          </div>

          {role === 'doctor' && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Doctor Profile Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Cardiologist"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrivalTime">Arrival Time</Label>
                  <Input
                    id="arrivalTime"
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departureTime">Departure Time</Label>
                  <Input
                    id="departureTime"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slotDuration">Slot Duration (min)</Label>
                  <select
                    id="slotDuration"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <option value="15">15 mins</option>
                    <option value="20">20 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAppointments">Max Appointments / Day</Label>
                  <Input
                    id="maxAppointments"
                    type="number"
                    value={maxAppointments}
                    onChange={(e) => setMaxAppointments(e.target.value)}
                    min="1"
                    className="bg-white"
                  />
                </div>

                <div className="col-span-2 space-y-2 mt-2">
                  <Label>Working Days</Label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const isActive = workingDays.includes(day.id)
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-teal-600 text-white hover:bg-teal-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700">
              {loading ? 'Creating...' : `Create ${role.replace('_', ' ')}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
