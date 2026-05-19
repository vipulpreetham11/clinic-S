import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Appointment } from '@/types/consultation';
import { format, differenceInMinutes, isAfter } from 'date-fns';
import { Clock } from 'lucide-react';

interface TodayQueueProps {
  appointments: Appointment[];
  onStartConsultation: (appointmentId: string) => void;
  onViewHistory: (patientId: string) => void;
  loading?: boolean;
}

export const TodayQueue = ({
  appointments,
  onStartConsultation,
  onViewHistory,
  loading,
}: TodayQueueProps) => {
  const now = new Date();

  const { past, current, upcoming } = useMemo(() => {
    const p: Appointment[] = [];
    let curr: Appointment | null = null;
    const u: Appointment[] = [];

    appointments.forEach((apt) => {
      const [hours, minutes] = (apt.start_time || '09:00').split(':').map(Number);
      const apptTime = new Date();
      apptTime.setHours(hours, minutes, 0, 0);

      if (isAfter(now, apptTime)) {
        p.push(apt);
      } else if (
        differenceInMinutes(apptTime, now) < 30 &&
        differenceInMinutes(apptTime, now) >= 0
      ) {
        curr = apt;
      } else {
        u.push(apt);
      }
    });

    return { past: p, current: curr, upcoming: u };
  }, [appointments, now]);

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    return Math.floor(
      (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  };

  const renderAppointmentRow = (apt: Appointment, isOverdue = false) => {
    const age = calculateAge(apt.patient?.date_of_birth);
    return (
      <div
        key={apt.id}
        className={`flex items-center justify-between p-4 border-b hover:bg-gray-50 transition ${
          isOverdue ? 'bg-amber-50 border-amber-200' : ''
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{apt.start_time || '09:00'}</span>
            <span className="text-gray-600">
              {apt.patient?.name} {age ? `• ${age}y` : ''}
              {apt.patient?.gender && ` • ${apt.patient.gender[0].toUpperCase()}`}
            </span>
            {apt.service && (
              <Badge variant="outline" className="text-xs">
                {apt.service.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{apt.patient?.phone}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              apt.status === 'completed'
                ? 'default'
                : apt.status === 'pending'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {apt.status}
          </Badge>

          <Button
            size="sm"
            onClick={() => onStartConsultation(apt.id)}
            disabled={apt.status === 'completed'}
          >
            Start
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => apt.patient?.id && onViewHistory(apt.patient.id)}
          >
            History
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No appointments today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Today's Queue ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {past.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700">
                Completed/Pending
              </div>
              {past.map((apt) => renderAppointmentRow(apt, apt.status === 'pending'))}
            </div>
          )}

          {current && (
            <div className="bg-blue-50 border-l-4 border-blue-500">
              <div className="px-4 py-2 bg-blue-100 text-sm font-semibold text-blue-900">
                📍 NOW
              </div>
              {renderAppointmentRow(current)}
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700">
                Upcoming
              </div>
              {upcoming.map((apt) => renderAppointmentRow(apt))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
