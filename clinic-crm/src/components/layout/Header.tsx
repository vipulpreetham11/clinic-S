import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Bell, LogOut, Settings, User } from 'lucide-react'

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/receptionist': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/doctor': 'Dashboard',
  '/super-admin': 'Super Admin',
  '/super-admin/clinics': 'All Clinics',
  '/appointments': 'Appointments',
  '/appointments/new': 'New Appointment',
  '/doctors': 'Doctors',
  '/doctors/new': 'Add Doctor',
  '/patients': 'Patients',
  '/services': 'Services',
  '/analytics': 'Analytics',
  '/reminders': 'Reminders',
  '/waitlist': 'Waitlist',
  '/conversations': 'WhatsApp',
  '/invoices': 'Invoices',
  '/invoices/new': 'New Invoice',
  '/settings': 'Settings',
  '/admin/settings': 'Settings',
  '/admin/setup': 'Setup Wizard',
  '/doctor/schedule': 'My Schedule',
  '/doctor/patients': 'My Patients',
  '/doctor/leaves': 'My Leaves',
  '/doctor/profile': 'My Profile',
  '/receptionist/invoices': 'Invoices',
  '/whatsapp/settings': 'WhatsApp Settings',
}

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/appointments/') && pathname !== '/appointments/new') return 'Appointment Detail'
  if (pathname.startsWith('/doctors/') && pathname.endsWith('/schedule')) return 'Doctor Schedule'
  if (pathname.startsWith('/doctors/')) return 'Edit Doctor'
  if (pathname.startsWith('/patients/')) return 'Patient Detail'
  if (pathname.startsWith('/services/')) return 'Service Detail'
  if (pathname.startsWith('/invoices/')) return 'Invoice Detail'
  if (pathname.startsWith('/super-admin/clinics/')) return 'Clinic Detail'
  return 'ClinicOS'
}

export function Header() {
  const { profile, role, logout } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()

  const pageTitle = getPageTitle(location.pathname)

  const profileRoute = role === 'doctor' ? '/doctor/profile' : '/settings'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-100 bg-white px-6 flex-none">
      <h2 className="text-base font-semibold text-slate-900 flex-1 truncate">{pageTitle}</h2>

      <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton={false}
          render={
            <div className="cursor-pointer flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.name} />
                )}
                <AvatarFallback className="bg-teal-600 text-white text-sm font-medium">
                  {profile?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium text-slate-800">{profile?.name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => navigate(profileRoute)} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-slate-500" />
              Profile
            </DropdownMenuItem>
            {role !== 'doctor' && (
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4 text-slate-500" />
                Settings
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
