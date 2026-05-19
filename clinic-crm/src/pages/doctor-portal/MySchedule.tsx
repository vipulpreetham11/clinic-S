import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTodayQueue } from '@/hooks/useTodayQueue';
import { TodayQueue } from '@/components/doctors/TodayQueue';
import { ConsultationModal } from '@/components/doctors/ConsultationModal';
import type { Appointment } from "@/types/consultation";

export default function MySchedule() {
  const navigate = useNavigate();
  const { appointments, loading, error } = useTodayQueue();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleStartConsultation = (appointmentId: string) => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setModalOpen(true);
    }
  };

  const handleViewHistory = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-600 mt-1">Today's appointments and queue</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <TodayQueue
        appointments={appointments}
        onStartConsultation={handleStartConsultation}
        onViewHistory={handleViewHistory}
        loading={loading}
      />

      <ConsultationModal
        appointment={selectedAppointment}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onComplete={() => {
          setModalOpen(false);
          setSelectedAppointment(null);
        }}
      />
    </div>
  );
}
