import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDoctorContext } from './useDoctorContext';
import type { Appointment } from '../types/consultation';
import { format } from 'date-fns';

export const useTodayQueue = () => {
  const { doctor } = useDoctorContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayAppointments = useCallback(async () => {
    if (!doctor?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error: err } = await supabase
        .from('appointments')
        .select(`
          *,
          services(id, name, duration_minutes),
          patients(id, name, date_of_birth, gender, phone),
          doctors(id, name, specialization)
        `)
        .eq('doctor_id', doctor.id)
        .eq('date', today)
        .in('status', ['pending', 'confirmed', 'rescheduled'])
        .order('start_time', { ascending: true });

      if (err) throw err;
      const normalized = (data || []).map((item: any) => ({
        ...item,
        service: item.services ?? null,
        patient: item.patients ?? null,
        doctor: item.doctors ?? null,
      }))
      setAppointments((normalized as unknown as Appointment[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch queue';
      setError(message);
      console.error('Today queue error:', err);
    } finally {
      setLoading(false);
    }
  }, [doctor?.id]);

  useEffect(() => {
    fetchTodayAppointments();

    if (!doctor?.id) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const subscription = supabase
      .channel(`doctor-queue-${doctor.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctor.id},date=eq.${today}`,
        },
        () => {
          fetchTodayAppointments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [doctor?.id, fetchTodayAppointments]);

  return { appointments, loading, error, refresh: fetchTodayAppointments };
};
