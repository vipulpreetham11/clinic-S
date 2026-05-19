import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VitalsForm } from './VitalsForm';
import { PrescriptionBuilder } from './PrescriptionBuilder';
import { ConsultationHistory } from './ConsultationHistory';
import { PrintableSummary } from './PrintableSummary';
import { useConsultation } from '@/hooks/useConsultation';
import { useDoctorContext } from '@/hooks/useDoctorContext';
import { supabase } from '@/lib/supabase';
import type { Appointment, ConsultationDraft, Vitals, Prescription } from "@/types/consultation";
import { AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ConsultationModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const ConsultationModal = ({
  appointment,
  open,
  onOpenChange,
  onComplete,
}: ConsultationModalProps) => {
  const { doctor } = useDoctorContext();
  const { consultation, isSaving, lastSaved, saveConsultation, autosaveDraft } =
    useConsultation(appointment?.id);

  const [clinic, setClinic] = useState<any>(null);
  const [formData, setFormData] = useState<ConsultationDraft>({
    appointment_id: appointment?.id || '',
    clinic_id: appointment?.clinic_id || '',
    doctor_id: doctor?.id || '',
    patient_id: appointment?.patient_id || '',
    chief_complaint: '',
    examination_notes: '',
    diagnosis: '',
    prescription: [],
    vitals: {},
    follow_up_date: '',
    follow_up_notes: '',
    internal_notes: '',
  });

  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (consultation) {
      setFormData({
        appointment_id: consultation.appointment_id,
        clinic_id: consultation.clinic_id,
        doctor_id: consultation.doctor_id,
        patient_id: consultation.patient_id,
        chief_complaint: consultation.chief_complaint || '',
        examination_notes: consultation.examination_notes || '',
        diagnosis: consultation.diagnosis || '',
        prescription: consultation.prescription || [],
        vitals: consultation.vitals || {},
        follow_up_date: consultation.follow_up_date || '',
        follow_up_notes: consultation.follow_up_notes || '',
        internal_notes: consultation.internal_notes || '',
      });
    }
  }, [consultation]);

  useEffect(() => {
    const fetchClinic = async () => {
      if (!appointment?.clinic_id) return;
      const { data } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', appointment.clinic_id)
        .single();
      setClinic(data);
    };
    fetchClinic();
  }, [appointment?.clinic_id]);

  useEffect(() => {
    autosaveDraft(formData);
  }, [formData, autosaveDraft]);

  const handleSaveDraft = async () => {
    const success = await saveConsultation(formData, false);
    if (success) {
      toast.success('Draft saved');
    }
  };

  const handleComplete = async () => {
    if (!formData.chief_complaint?.trim()) {
      toast.error('Please enter chief complaint');
      return;
    }

    const success = await saveConsultation(formData, true);
    if (success) {
      onOpenChange(false);
      onComplete?.();
    }
  };

  if (!appointment?.patient || !doctor) {
    return null;
  }

  const age = appointment.patient.date_of_birth
    ? Math.floor(
        (new Date().getTime() - new Date(appointment.patient.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consultation - {appointment.start_time}</DialogTitle>
          {lastSaved && (
            <p className="text-xs text-gray-500 mt-2">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </DialogHeader>

        {showPrint && appointment.patient ? (
          <PrintableSummary
            consultation={{
              ...formData,
              id: consultation?.id || '',
              created_at: consultation?.created_at || new Date().toISOString(),
              updated_at: consultation?.updated_at || new Date().toISOString(),
            }}
            patientName={appointment.patient.name}
            patientPhone={appointment.patient.phone}
            patientDOB={appointment.patient.date_of_birth}
            patientGender={appointment.patient.gender}
            doctorName={doctor.name}
            doctorSpecialty={doctor.specialization}
            clinicName={clinic?.name || ''}
            clinicPhone={clinic?.phone || ''}
            clinicAddress={clinic?.address}
          />
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Patient Context */}
            <div className="col-span-1 space-y-4 border-r pr-4">
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold text-gray-900">{appointment.patient.name}</h3>
                <p className="text-sm text-gray-600">
                  {age ? `${age} years` : 'Age N/A'} •{' '}
                  {appointment.patient.gender || 'Gender N/A'}
                </p>
                <p className="text-sm text-gray-600">{appointment.patient.phone}</p>
              </div>

              {/* Allergies - Always Visible */}
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="font-semibold text-red-900 text-sm">Allergies</p>
                </div>
                <p className="text-sm text-red-800">
                  {appointment.patient.notes?.includes('allergy')
                    ? appointment.patient.notes
                    : 'No known allergies'}
                </p>
              </div>

              {/* Service Info */}
              {appointment.service && (
                <div>
                  <Label className="text-xs font-semibold">Service</Label>
                  <p className="text-sm">{appointment.service.name}</p>
                </div>
              )}

              {/* Last Visit */}
              <div>
                <Label className="text-xs font-semibold">Appointment Time</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  {appointment.start_time} - {appointment.end_time}
                </div>
              </div>

              {/* Consultation History */}
              <ConsultationHistory
                patientId={appointment.patient.id}
                doctorId={doctor.id}
                currentConsultationId={consultation?.id}
              />
            </div>

            {/* Right: Consultation Form */}
            <div className="col-span-2 space-y-4">
              {/* Chief Complaint */}
              <div>
                <Label>
                  Chief Complaint <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.chief_complaint}
                  onChange={(e) =>
                    setFormData({ ...formData, chief_complaint: e.target.value })
                  }
                  placeholder="Describe patient's main complaint..."
                  className="min-h-24"
                />
              </div>

              {/* Examination Notes */}
              <div>
                <Label>Examination Notes</Label>
                <Textarea
                  value={formData.examination_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, examination_notes: e.target.value })
                  }
                  placeholder="Physical examination findings..."
                  className="min-h-20"
                />
              </div>

              {/* Vitals */}
              <VitalsForm
                vitals={formData.vitals}
                onChange={(vitals) => setFormData({ ...formData, vitals })}
              />

              {/* Diagnosis */}
              <div>
                <Label>Diagnosis</Label>
                <Textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Clinical diagnosis..."
                  className="min-h-20"
                />
              </div>

              {/* Prescription */}
              <PrescriptionBuilder
                medicines={formData.prescription || []}
                onChange={(medicines) => setFormData({ ...formData, prescription: medicines })}
              />

              {/* Follow-up */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) =>
                      setFormData({ ...formData, follow_up_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Follow-up Notes</Label>
                  <Input
                    value={formData.follow_up_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, follow_up_notes: e.target.value })
                    }
                    placeholder="e.g., Review blood test results"
                  />
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <Label>Internal Notes (not shown to patient)</Label>
                <Textarea
                  value={formData.internal_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, internal_notes: e.target.value })
                  }
                  placeholder="Notes for future reference..."
                  className="min-h-16"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showPrint ? (
            <>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPrint(true)}
                disabled={!formData.chief_complaint?.trim()}
              >
                Preview & Print
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!formData.chief_complaint?.trim() || isSaving}
              >
                {isSaving ? 'Completing...' : 'Complete Consultation'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowPrint(false)}>
                Back to Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
