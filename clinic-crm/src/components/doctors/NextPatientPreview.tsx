import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Appointment } from '@/types/consultation';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';

interface NextPatientPreviewProps {
  appointments: Appointment[];
}

export const NextPatientPreview = ({ appointments }: NextPatientPreviewProps) => {
  const nextAppointment = appointments[0];
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    if (!nextAppointment?.patient?.id) {
      setAllergies([]);
      return;
    }

    const fetchAllergies = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('notes')
          .eq('id', nextAppointment.patient!.id)
          .single();

        if (error) throw error;

        const allergiesFromNotes = data?.notes
          ? data.notes
              .split(',')
              .map((a: string) => a.trim())
              .filter((a: string) => a.toLowerCase().includes('allergy'))
          : [];

        setAllergies(allergiesFromNotes);
      } catch (err) {
        console.error('Failed to fetch allergies:', err);
      }
    };

    fetchAllergies();
  }, [nextAppointment?.patient?.id]);

  if (!nextAppointment?.patient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
        </CardContent>
      </Card>
    );
  }

  const age = nextAppointment.patient.date_of_birth
    ? Math.floor(
        (new Date().getTime() - new Date(nextAppointment.patient.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Next Patient</CardTitle>
        <p className="text-sm text-gray-500 mt-2">{nextAppointment.start_time}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">{nextAppointment.patient.name}</h3>
          <p className="text-sm text-gray-600">
            {age ? `${age} years` : 'Age not provided'} •{' '}
            {nextAppointment.patient.gender || 'Gender not provided'}
          </p>
          <p className="text-sm text-gray-600">{nextAppointment.patient.phone}</p>
        </div>

        {allergies.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="font-semibold text-red-900 text-sm">Allergies</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, idx) => (
                <Badge key={idx} variant="destructive" className="text-xs">
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {nextAppointment.service && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Service</p>
            <p className="text-sm text-gray-900">{nextAppointment.service.name}</p>
          </div>
        )}

        <Button className="w-full">Start Consultation</Button>
      </CardContent>
    </Card>
  );
};
