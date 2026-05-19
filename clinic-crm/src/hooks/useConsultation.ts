import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useDoctorContext } from './useDoctorContext';
import type { Consultation, ConsultationDraft } from '../types/consultation';
import { toast } from 'sonner';

export const useConsultation = (appointmentId?: string) => {
  const { doctor } = useDoctorContext();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(!!appointmentId);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<any>(null);

  const fetchConsultation = useCallback(async (apptId: string) => {
    if (!doctor?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('consultations')
        .select('*')
        .eq('appointment_id', apptId)
        .eq('doctor_id', doctor.id)
        .single();

      if (err && err.code !== 'PGRST116') throw err;

      setConsultation(data as Consultation || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch consultation';
      setError(message);
      console.error('Consultation fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [doctor?.id]);

  useEffect(() => {
    if (appointmentId) {
      fetchConsultation(appointmentId);
    }
  }, [appointmentId, fetchConsultation]);

  const saveConsultation = useCallback(
    async (draft: ConsultationDraft, isComplete = false) => {
      if (!doctor?.id || !appointmentId) {
        toast.error('Missing required data');
        return false;
      }

      try {
        setIsSaving(true);

        if (consultation?.id) {
          const { error: err } = await supabase
            .from('consultations')
            .update({
              ...draft,
              updated_at: new Date().toISOString(),
            })
            .eq('id', consultation.id)
            .eq('doctor_id', doctor.id);

          if (err) throw err;
        } else {
          const { error: err } = await supabase
            .from('consultations')
            .insert([
              {
                ...draft,
                appointment_id: appointmentId,
              },
            ]);

          if (err) throw err;
        }

        setLastSaved(new Date());

        if (isComplete) {
          await supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', appointmentId);

          toast.success('Consultation completed');
          return true;
        }

        if (!isComplete) {
          toast.success('Consultation saved');
        }
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save consultation';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [doctor?.id, appointmentId, consultation?.id]
  );

  const autosaveDraft = useCallback(
    (draft: ConsultationDraft) => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      autoSaveTimer.current = setTimeout(async () => {
        await saveConsultation(draft, false);
      }, 30000);
    },
    [saveConsultation]
  );

  const clearAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
  }, []);

  return {
    consultation,
    loading,
    error,
    isSaving,
    lastSaved,
    saveConsultation,
    autosaveDraft,
    clearAutoSave,
    refetch: () => appointmentId && fetchConsultation(appointmentId),
  };
};
