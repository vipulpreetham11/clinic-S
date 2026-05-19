import { Navigate } from 'react-router-dom'

export default function AdminSettingsRedirect() {
  return <Navigate to="/settings" replace />
}
