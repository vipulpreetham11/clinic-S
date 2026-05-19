import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTodayQueue } from '@/hooks/useTodayQueue';
import { useDoctorContext } from '@/hooks/useDoctorContext';
import { TodayQueue } from '@/components/doctors/TodayQueue';
import { NextPatientPreview } from '@/components/doctors/NextPatientPreview';
import { ConsultationModal } from '@/components/doctors/ConsultationModal';
import type { Appointment } from "@/types/consultation";
import { Users, CheckCircle, Clock } from 'lucide-react';

export const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { doctor } = useDoctorContext();
  const { appointments, loading, error } = useTodayQueue();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const completed = appointments.filter((a) => a.status === 'completed').length;
  const pending = appointments.filter((a) => a.status === 'pending').length;

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

  if (!doctor) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading doctor profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, Dr. {doctor.name}
        </h1>
        <p className="text-gray-600 mt-1">{doctor.specialization || 'Doctor'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{appointments.length}</div>
            <p className="text-xs text-gray-500 mt-1">total count</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completed}</div>
            <p className="text-xs text-gray-500 mt-1">done so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{pending}</div>
            <p className="text-xs text-gray-500 mt-1">remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <TodayQueue
            appointments={appointments}
            onStartConsultation={handleStartConsultation}
            onViewHistory={handleViewHistory}
            loading={loading}
          />
        </div>

        <div className="col-span-1">
          <NextPatientPreview appointments={appointments} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Consultation Modal */}
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
};

export default DoctorDashboard;
