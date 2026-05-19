import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Consultation } from '@/types/consultation';
import { format } from 'date-fns';

interface ConsultationHistoryProps {
  patientId: string;
  doctorId: string;
  currentConsultationId?: string;
}

export const ConsultationHistory = ({
  patientId,
  doctorId,
  currentConsultationId,
}: ConsultationHistoryProps) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', patientId)
          .eq('doctor_id', doctorId)
          .neq('id', currentConsultationId || '')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setConsultations((data as Consultation[]) || []);
      } catch (err) {
        console.error('Failed to fetch consultation history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId, doctorId, currentConsultationId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consultation History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consultation History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No previous consultations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Last 5 Consultations</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {consultations.map((consultation, idx) => (
            <AccordionItem key={consultation.id} value={consultation.id}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full text-left">
                  <span className="text-sm font-medium">
                    {format(new Date(consultation.created_at), 'MMM dd, yyyy')}
                  </span>
                  {consultation.diagnosis && (
                    <Badge variant="secondary" className="ml-2">
                      {consultation.diagnosis.split(',')[0]}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  {consultation.chief_complaint && (
                    <div>
                      <p className="font-semibold text-gray-700">Chief Complaint</p>
                      <p className="text-gray-600">{consultation.chief_complaint}</p>
                    </div>
                  )}

                  {consultation.diagnosis && (
                    <div>
                      <p className="font-semibold text-gray-700">Diagnosis</p>
                      <p className="text-gray-600">{consultation.diagnosis}</p>
                    </div>
                  )}

                  {consultation.prescription && consultation.prescription.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700">Medicines</p>
                      <ul className="text-gray-600 space-y-1">
                        {consultation.prescription.map((med, i) => (
                          <li key={i} className="text-xs">
                            {med.medicine} - {med.dosage} {med.frequency} for {med.duration}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {consultation.follow_up_date && (
                    <div>
                      <p className="font-semibold text-gray-700">Follow-up</p>
                      <p className="text-gray-600">
                        {format(new Date(consultation.follow_up_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
