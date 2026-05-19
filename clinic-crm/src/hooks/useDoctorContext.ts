import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import type { Doctor } from '../types/consultation';
import { toast } from 'sonner';

export const useDoctorContext = () => {
  const { user } = useAuthContext();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: err } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (err) throw err;
        setDoctor(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch doctor profile';
        setError(message);
        console.error('Doctor context error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [user?.id]);

  const updateDoctor = useCallback(async (updates: Partial<Doctor>) => {
    if (!doctor?.id) {
      toast.error('Doctor profile not found');
      return false;
    }

    try {
      const { data, error: err } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', doctor.id)
        .select()
        .single();

      if (err) throw err;
      setDoctor(data);
      toast.success('Profile updated');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error(message);
      return false;
    }
  }, [doctor?.id]);

  return { doctor, loading, error, updateDoctor };
};
