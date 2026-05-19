import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDoctorContext } from './useDoctorContext';
import type { Patient } from '../types/consultation';

export type PatientWithMetrics = Patient & {
  lastVisit?: {
    date: string;
    serviceId: string;
  };
  totalVisits: number;
  age?: number;
};

export const useMyPatients = (search?: string) => {
  const { doctor } = useDoctorContext();
  const [patients, setPatients] = useState<PatientWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!doctor?.id) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all unique patients seen by this doctor
      const { data: appointments, error: err } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          date,
          service_id,
          patient:patient_id(
            id, name, phone, email, date_of_birth, gender, 
            address, notes, is_vip, created_at
          )
        `)
        .eq('doctor_id', doctor.id)
        .not('patient_id', 'is', null)
        .order('date', { ascending: false });

      if (err) throw err;

      const patientMap = new Map<string, PatientWithMetrics>();

      appointments?.forEach((apt: any) => {
        if (!apt.patient) return;

        if (!patientMap.has(apt.patient.id)) {
          const dob = apt.patient.date_of_birth
            ? new Date(apt.patient.date_of_birth)
            : null;
          const age = dob
            ? Math.floor(
                (new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
              )
            : undefined;

          patientMap.set(apt.patient.id, {
            ...apt.patient,
            age,
            totalVisits: 0,
            lastVisit: undefined,
          });
        }

        const patient = patientMap.get(apt.patient.id)!;
        patient.totalVisits++;

        if (!patient.lastVisit) {
          patient.lastVisit = {
            date: apt.date,
            serviceId: apt.service_id,
          };
        }
      });

      let result = Array.from(patientMap.values());

      if (search) {
        const lowerSearch = search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerSearch) ||
            p.phone.includes(search)
        );
      }

      setPatients(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch patients';
      setError(message);
      console.error('My patients error:', err);
    } finally {
      setLoading(false);
    }
  }, [doctor?.id, search]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, error, refresh: fetchPatients };
};
