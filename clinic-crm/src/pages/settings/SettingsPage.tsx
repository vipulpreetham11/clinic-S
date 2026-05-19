import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClinicProfileTab } from '@/components/settings/ClinicProfileTab'
import { TeamUsersTab } from '@/components/settings/TeamUsersTab'
import { NotificationsTab } from '@/components/settings/NotificationsTab'
import { RemindersConfigTab } from '@/components/settings/RemindersConfigTab'
import { BillingInvoiceTab } from '@/components/settings/BillingInvoiceTab'
import { DangerZoneTab } from '@/components/settings/DangerZoneTab'
import { cn } from '@/lib/utils'

const SETTINGS_TABS = [
  { id: 'profile', label: 'Clinic Profile' },
  { id: 'team', label: 'Team' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'billing', label: 'Billing' },
  { id: 'danger', label: 'Danger Zone' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Settings"
        description="Manage your clinic profile, team, notifications, and billing"
      />

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ClinicProfileTab />}
      {activeTab === 'team' && <TeamUsersTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'reminders' && <RemindersConfigTab />}
      {activeTab === 'billing' && <BillingInvoiceTab />}
      {activeTab === 'danger' && <DangerZoneTab />}
    </div>
  )
}
