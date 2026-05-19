import { NavLink, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import {
  Building,
  PieChart,
  Settings,
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  BriefcaseMedical,
  Bell,
  Clock,
  MessageSquare,
  FileText,
  Plus,
  HeartPulse,
  CalendarX2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  name: string
  href: string
  icon: React.ElementType
}

export function Sidebar() {
  const { role, clinic, profile, logout } = useAuthContext()
  const location = useLocation()

  let links: NavItem[] = []

  switch (role) {
    case 'super_admin':
      links = [
        { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
        { name: 'All Clinics', href: '/super-admin/clinics', icon: Building },
        { name: 'Analytics', href: '/analytics', icon: PieChart },
      ]
      break
    case 'admin':
    case 'clinic_admin':
      links = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Appointments', href: '/appointments', icon: CalendarDays },
        { name: 'Doctors', href: '/doctors', icon: Stethoscope },
        { name: 'Patients', href: '/patients', icon: Users },
        { name: 'Services', href: '/services', icon: BriefcaseMedical },
        { name: 'Analytics', href: '/analytics', icon: PieChart },
        { name: 'Reminders', href: '/reminders', icon: Bell },
        { name: 'Waitlist', href: '/waitlist', icon: Clock },
        { name: 'WhatsApp', href: '/conversations', icon: MessageSquare },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
      break
    case 'receptionist':
      links = [
        { name: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
        { name: 'Appointments', href: '/appointments', icon: CalendarDays },
        { name: 'Patients', href: '/patients', icon: Users },
        { name: 'Waitlist', href: '/waitlist', icon: Clock },
        { name: 'Invoices', href: '/receptionist/invoices', icon: FileText },
      ]
      break
    case 'doctor':
      links = [
        { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
        { name: 'My Schedule', href: '/doctor/schedule', icon: CalendarDays },
        { name: 'My Patients', href: '/doctor/patients', icon: Users },
        { name: 'My Leaves', href: '/doctor/leaves', icon: CalendarX2 },
      ]
      break
  }

  const mobileLinks = links.slice(0, 5)

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 flex-none bg-[#0f172a] min-h-screen">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-700/50 flex-none">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-600 flex-none p-1.5 mr-3">
            {clinic?.logo_url
              ? <img src={clinic.logo_url} alt="Logo" className="w-full h-full rounded-lg object-cover" />
              : <HeartPulse className="w-full h-full text-white" />
            }
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-white font-bold text-base truncate leading-tight">
              {role === 'super_admin' ? 'ClinicOS Admin' : clinic?.name ?? 'ClinicOS'}
            </span>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium mt-0.5">
              {role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* New Booking CTA for receptionist */}
        {role === 'receptionist' && (
          <div className="px-3 pt-4">
            <NavLink
              to="/appointments/new"
              className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </NavLink>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {links.map((link) => {
            const isActive =
              link.href === '/super-admin'
                ? location.pathname === '/super-admin'
                : location.pathname === link.href ||
                  (link.href !== '/' && location.pathname.startsWith(link.href + '/'))
            const Icon = link.icon
            return (
              <NavLink
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all mb-1',
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 flex-none" />
                {link.name}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={logout}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && logout()}
          >
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profile?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile?.name ?? 'User'}</div>
              <div className="text-slate-400 text-xs capitalize">{role?.replace(/_/g, ' ')}</div>
            </div>
            <LogOut className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 w-full border-t bg-[#0f172a] border-slate-700 flex items-center justify-around p-2 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
        {mobileLinks.map((link) => {
          const isActive =
            location.pathname === link.href ||
            (link.href !== '/' && location.pathname.startsWith(link.href + '/'))
          const Icon = link.icon
          return (
            <NavLink
              key={link.href}
              to={link.href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl min-w-[56px] transition-all',
                isActive ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{link.name}</span>
            </NavLink>
          )
        })}
        {role === 'receptionist' && (
          <NavLink
            to="/appointments/new"
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-teal-400 font-medium"
          >
            <div className="bg-teal-600 text-white p-1.5 rounded-full shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">New</span>
          </NavLink>
        )}
      </nav>
    </>
  )
}
