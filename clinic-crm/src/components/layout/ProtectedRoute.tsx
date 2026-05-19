import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import { HeartPulse } from 'lucide-react'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading, isRole } = useAuthContext()
  const location = useLocation()

  if (isLoading) {
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !isRole(...allowedRoles)) {
    let fallback = '/login'
    if (role === 'super_admin') fallback = '/super-admin'
    else if (role === 'admin' || role === 'clinic_admin') fallback = '/dashboard'
    else if (role === 'doctor') fallback = '/doctor'
    else if (role === 'receptionist') fallback = '/receptionist'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
