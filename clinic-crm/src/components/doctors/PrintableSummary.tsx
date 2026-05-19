import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { Consultation } from '@/types/consultation';
import { format } from 'date-fns';

interface PrintableSummaryProps {
  consultation: Consultation;
  patientName: string;
  patientPhone: string;
  patientDOB?: string;
  patientGender?: string;
  patientBloodGroup?: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorRegNo?: string;
  clinicName: string;
  clinicPhone: string;
  clinicAddress?: string;
}

export const PrintableSummary = ({
  consultation,
  patientName,
  patientPhone,
  patientDOB,
  patientGender,
  patientBloodGroup,
  doctorName,
  doctorSpecialty,
  doctorRegNo,
  clinicName,
  clinicPhone,
  clinicAddress,
}: PrintableSummaryProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    return Math.floor(
      (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  };

  const age = calculateAge(patientDOB);

  return (
    <div>
      <Button onClick={handlePrint} size="sm" className="mb-4">
        Print Consultation
      </Button>

      <div ref={printRef} className="bg-white p-8" id="printable-summary">
        <style>{`
          @media print {
            body { margin: 0; padding: 0; }
            #printable-summary { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="max-w-4xl mx-auto font-serif text-sm">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2">
            <div>
              <h1 className="text-xl font-bold">{clinicName}</h1>
              {clinicAddress && <p className="text-xs text-gray-600">{clinicAddress}</p>}
              <p className="text-xs text-gray-600">Phone: {clinicPhone}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">
                Date: {format(new Date(consultation.created_at), 'dd MMM yyyy')}
              </p>
              <p>Time: {format(new Date(consultation.created_at), 'HH:mm')}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b">
            <div>
              <p className="text-xs font-semibold">PATIENT NAME</p>
              <p className="font-bold">{patientName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold">PHONE</p>
              <p className="font-bold">{patientPhone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold">AGE & GENDER</p>
              <p>
                {age ? `${age} years` : 'N/A'} {patientGender ? `/ ${patientGender}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold">BLOOD GROUP</p>
              <p>{patientBloodGroup || 'N/A'}</p>
            </div>
          </div>

          {/* Chief Complaint */}
          {consultation.chief_complaint && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase">Chief Complaint</p>
              <p className="text-sm">{consultation.chief_complaint}</p>
            </div>
          )}

          {/* Examination Notes */}
          {consultation.examination_notes && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase">Examination Findings</p>
              <p className="text-sm">{consultation.examination_notes}</p>
            </div>
          )}

          {/* Vitals */}
          {consultation.vitals && Object.values(consultation.vitals).some((v) => v) && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase">Vitals</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {consultation.vitals.bp_sys && (
                  <div>BP: {consultation.vitals.bp_sys}/{consultation.vitals.bp_dia} mmHg</div>
                )}
                {consultation.vitals.temp && <div>Temp: {consultation.vitals.temp}°C</div>}
                {consultation.vitals.weight && <div>Weight: {consultation.vitals.weight} kg</div>}
                {consultation.vitals.spo2 && <div>SpO₂: {consultation.vitals.spo2}%</div>}
                {consultation.vitals.pulse && <div>Pulse: {consultation.vitals.pulse} bpm</div>}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {consultation.diagnosis && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase">Diagnosis</p>
              <p className="text-sm">{consultation.diagnosis}</p>
            </div>
          )}

          {/* Prescription */}
          {consultation.prescription && consultation.prescription.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase mb-2">Prescription</p>
              <table className="w-full border text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-2 py-1 text-left">Medicine</th>
                    <th className="border px-2 py-1 text-left">Dosage</th>
                    <th className="border px-2 py-1 text-left">Frequency</th>
                    <th className="border px-2 py-1 text-left">Duration</th>
                    <th className="border px-2 py-1 text-left">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultation.prescription.map((med, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="border px-2 py-1">{med.medicine}</td>
                      <td className="border px-2 py-1">{med.dosage}</td>
                      <td className="border px-2 py-1">{med.frequency}</td>
                      <td className="border px-2 py-1">{med.duration}</td>
                      <td className="border px-2 py-1">{med.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Follow-up */}
          {consultation.follow_up_date && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase">Follow-up</p>
              <p className="text-sm">
                Date: {format(new Date(consultation.follow_up_date), 'dd MMM yyyy')}
              </p>
              {consultation.follow_up_notes && <p className="text-sm">{consultation.follow_up_notes}</p>}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold mb-2">Doctor Signature</p>
                <p className="text-xs font-semibold">{doctorName}</p>
                {doctorSpecialty && <p className="text-xs">{doctorSpecialty}</p>}
                {doctorRegNo && <p className="text-xs">Reg No: {doctorRegNo}</p>}
              </div>
              <div className="text-xs text-gray-600">
                <p>{clinicName}</p>
                <p>{clinicPhone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
