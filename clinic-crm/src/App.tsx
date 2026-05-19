import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeartPulse } from 'lucide-react'
import { Layout } from './components/layout/Layout'
import { useAuthContext } from './context/AuthContext'
import { Toaster } from './components/ui/sonner'

// Auth
import Login from './pages/auth/Login'

// Super Admin
import SuperAdminDashboard from './pages/super-admin/Dashboard'
import SuperAdminClinics from './pages/super-admin/Clinics'
import CreateClinic from './pages/super-admin/CreateClinic'
import ClinicDetail from './pages/super-admin/ClinicDetail'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import AdminSettings from './pages/admin/Settings'
import SettingsPage from './pages/settings/SettingsPage'
import AdminSetupWizard from './pages/admin/SetupWizard'

// Shared
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import InvoicesStub from './pages/receptionist/InvoicesStub'
import AppointmentList from './pages/appointments/AppointmentList'
import NewAppointment from './pages/appointments/NewAppointment'
import AppointmentDetail from './pages/appointments/AppointmentDetail'
import DoctorList from './pages/doctors/DoctorList'
import DoctorForm from './pages/doctors/DoctorForm'
import DoctorSchedule from './pages/doctors/DoctorSchedule'
import PatientList from './pages/patients/PatientList'
import PatientDetail from './pages/patients/PatientDetail'
import ServiceList from './pages/services/ServiceList'
import ServiceDetail from './pages/services/[id]'
import Analytics from './pages/analytics/Analytics'
import Reminders from './pages/reminders/Reminders'
import Waitlist from './pages/waitlist/Waitlist'
import Conversations from './pages/conversations/Conversations'
import Invoices from './pages/invoices/Invoices'
import InvoiceFormPage from './pages/invoices/InvoiceFormPage'
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage'
import WhatsAppSettings from './pages/whatsapp/WhatsAppSettings'

// Doctor Portal
import MySchedule from './pages/doctor-portal/MySchedule'
import MyPatients from './pages/doctor-portal/MyPatients'
import DoctorDashboard from './pages/doctor-portal/DoctorDashboard'
import DoctorProfile from './pages/doctor-portal/DoctorProfile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
})

const ROLE_HOME: Record<string, string> = {
  super_admin: '/super-admin',
  admin: '/dashboard',
  clinic_admin: '/dashboard',
  doctor: '/doctor',
  receptionist: '/receptionist',
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 shadow-lg animate-pulse">
          <HeartPulse className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm text-slate-500 font-medium">Loading ClinicOS…</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, profile, role, isLoading, isRole } = useAuthContext()
  const location = useLocation()

  // Minimum display time prevents a flash where isLoading briefly becomes false
  // between the init() finally and the SIGNED_IN handler re-setting it to true.
  const [minLoadDone, setMinLoadDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMinLoadDone(true), 500)
    return () => clearTimeout(t)
  }, [])

  if (isLoading || !minLoadDone) return <LoadingScreen />

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !isRole(...allowedRoles)) {
    return <Navigate to={ROLE_HOME[role ?? ''] ?? '/login'} replace />
  }

  return <Outlet />
}

function RoleDashboard() {
  const { isAdmin } = useAuthContext()
  return isAdmin ? <AdminDashboard /> : <ReceptionistDashboard />
}

function RootRedirect() {
  const { user, profile, role, isLoading } = useAuthContext()

  if (isLoading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[role ?? ''] ?? '/login'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<RootRedirect />} />

            {/* Super Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/clinics" element={<SuperAdminClinics />} />
              <Route path="/super-admin/clinics/new" element={<CreateClinic />} />
              <Route path="/super-admin/clinics/:id" element={<ClinicDetail />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'clinic_admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/setup" element={<AdminSetupWizard />} />
              <Route path="/doctors/new" element={<DoctorForm />} />
              <Route path="/doctors/:id" element={<DoctorForm />} />
              <Route path="/services" element={<ServiceList />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
            </Route>

            {/* Shared Analytics */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'clinic_admin']} />}>
              <Route path="/analytics" element={<Analytics />} />
            </Route>

            {/* Admin + Receptionist Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'clinic_admin', 'receptionist']} />}>
              <Route path="/receptionist" element={<ReceptionistDashboard />} />
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/receptionist/invoices" element={<InvoicesStub />} />
              <Route path="/appointments" element={<AppointmentList />} />
              <Route path="/appointments/new" element={<NewAppointment />} />
              <Route path="/appointments/:id" element={<AppointmentDetail />} />
              <Route path="/doctors" element={<DoctorList />} />
              <Route path="/doctors/:id/schedule" element={<DoctorSchedule />} />
              <Route path="/patients" element={<PatientList />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/whatsapp/settings" element={<WhatsAppSettings />} />
            </Route>

            {/* Doctor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/schedule" element={<MySchedule />} />
              <Route path="/doctor/patients" element={<MyPatients />} />
              <Route path="/doctor/profile" element={<DoctorProfile />} />
              <Route path="/doctor/leaves" element={<Navigate to="/doctor/schedule" replace />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}
