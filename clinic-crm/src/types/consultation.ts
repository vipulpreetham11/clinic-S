// supabase.types not generated yet - using manual stubs

export type Prescription = {
  medicine: string;
  dosage: string;
  frequency: 'OD' | 'BD' | 'TDS' | 'QID' | 'SOS' | string;
  duration: string;
  instructions: string;
};

export type Vitals = {
  bp_sys?: number;
  bp_dia?: number;
  temp?: number;
  weight?: number;
  spo2?: number;
  pulse?: number;
};

export type Consultation = {
  id: string;
  appointment_id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  chief_complaint?: string;
  examination_notes?: string;
  diagnosis?: string;
  prescription?: Prescription[];
  vitals?: Vitals;
  follow_up_date?: string;
  follow_up_notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
};

export type ConsultationDraft = Omit<Consultation, 'id' | 'created_at' | 'updated_at'>;

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  service_id: string;
  scheduled_at: string;
  status: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
  service?: { name: string; duration_minutes: number } | null;
  doctor?: { name: string; specialization?: string } | null;
  patient?: { 
    id: string;
    name: string;
    date_of_birth?: string;
    gender?: string;
    phone: string;
    notes?: string;
  } | null;
};

export type Doctor = {
  id: string;
  name: string;
  specialization?: string;
  qualification?: string;
  phone?: string;
  photo_url?: string;
  working_days?: string[];
  slot_duration?: number;
  arrival_time?: string;
  departure_time?: string;
  [key: string]: any;
};

export type Patient = {
  id: string;
  name: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  age?: number;
  allergies?: string[];
  [key: string]: unknown;
};
