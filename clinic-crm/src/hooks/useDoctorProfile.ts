import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDoctorContext } from './useDoctorContext';
import type { Doctor } from '../types/consultation';
import { toast } from 'sonner';

export const useDoctorProfile = () => {
  const { doctor, updateDoctor: contextUpdate } = useDoctorContext();
  const [profile, setProfile] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(!doctor);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (doctor) {
      setProfile(doctor);
      setLoading(false);
    }
  }, [doctor]);

  const updateProfile = useCallback(
    async (updates: Partial<Doctor>): Promise<boolean> => {
      if (!profile?.id) {
        toast.error('Profile not found');
        return false;
      }

      try {
        setIsSaving(true);

        const result = await contextUpdate(updates);
        if (result) {
          setProfile((prev) => (prev ? { ...prev, ...updates } : null));
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [profile?.id, contextUpdate]
  );

  return {
    profile,
    loading,
    error,
    isSaving,
    updateProfile,
  };
};
