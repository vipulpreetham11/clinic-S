import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Plus, Crown, AlertTriangle, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Patient } from '@/types'

interface PatientSearchProps {
  clinicId: string
  onPatientSelect: (patient: Patient | null) => void
  onNewPatient: () => void
  selectedPatient?: Patient | null
}

function usePatientSearch(clinicId: string, query: string) {
  return useQuery({
    queryKey: ['patient-search', clinicId, query],
    queryFn: async () => {
      if (!query.trim()) return []
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('name')
        .limit(6)
      if (error) throw error
      return (data || []) as Patient[]
    },
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30,
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function PatientSearch({ clinicId, onPatientSelect, onNewPatient, selectedPatient }: PatientSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: results = [], isLoading } = usePatientSearch(clinicId, debouncedQuery)

  function handleSelect(patient: Patient) {
    onPatientSelect(patient)
    setInputValue('')
    setDebouncedQuery('')
    setIsOpen(false)
  }

  function handleClear() {
    onPatientSelect(null)
    setInputValue('')
    setDebouncedQuery('')
  }

  if (selectedPatient) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {getInitials(selectedPatient.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedPatient.name}</span>
                {selectedPatient.is_vip && (
                  <Crown className="h-4 w-4 text-yellow-500" aria-label="VIP patient" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear} aria-label="Change patient">
            Change
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {selectedPatient.blood_group && (
            <Badge variant="outline" className="text-xs">
              {selectedPatient.blood_group}
            </Badge>
          )}
          {selectedPatient.allergies && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Allergies: {selectedPatient.allergies}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patient by name or phone..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9"
          aria-label="Search patient"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => { setInputValue(''); setDebouncedQuery('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && inputValue.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden"
        >
          {isLoading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((patient) => (
                <li key={patient.id}>
                  <button
                    type="button"
                    role="option"
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                    onClick={() => handleSelect(patient)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                      {getInitials(patient.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{patient.name}</span>
                        {patient.is_vip && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </div>
                  </button>
                </li>
              ))}
              <li className="border-t">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-accent transition-colors"
                  onClick={() => { setIsOpen(false); onNewPatient() }}
                >
                  <Plus className="h-4 w-4" />
                  Add new patient
                </button>
              </li>
            </ul>
          ) : (
            <div className="p-4 text-center">
              <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No patient found</p>
              <p className="text-xs text-muted-foreground mb-3">"{inputValue}" doesn't match any patient</p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                onClick={() => { setIsOpen(false); onNewPatient() }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add as new patient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
