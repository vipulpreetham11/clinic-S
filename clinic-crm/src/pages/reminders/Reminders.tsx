import React, { useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { useReminderQueue, useReminderRules, useReminderLogs } from '../../hooks/useReminders'
import { ReminderQueueTable } from '../../components/reminders/ReminderQueueTable'
import { ReminderRulesTable } from '../../components/reminders/ReminderRulesTable'
import { ReminderLogsTable } from '../../components/reminders/ReminderLogsTable'
import { RuleFormModal } from '../../components/reminders/RuleFormModal'
import { TestRuleModal } from '../../components/reminders/TestRuleModal'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'
import type { ReminderRule } from '../../types/reminder'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { cn } from '../../lib/utils'

const TABS = ['Queue', 'Rules', 'Logs']

export default function Reminders() {
  const { clinic } = useAuthContext()
  const clinicId = clinic?.id
  const [activeTab, setActiveTab] = useState('queue')

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testingRule, setTestingRule] = useState<ReminderRule | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')

  const { data: queue, isLoading: isLoadingQueue } = useReminderQueue(clinicId || undefined, statusFilter, channelFilter)
  const { data: rules, isLoading: isLoadingRules } = useReminderRules(clinicId || undefined)
  const { data: logs, isLoading: isLoadingLogs } = useReminderLogs(clinicId || undefined)

  const handleEditRule = (rule: ReminderRule) => {
    setEditingRule(rule)
    setIsRuleModalOpen(true)
  }

  const handleAddRule = () => {
    setEditingRule(null)
    setIsRuleModalOpen(true)
  }

  const handleTestRule = (rule: ReminderRule) => {
    setTestingRule(rule)
    setIsTestModalOpen(true)
  }

  if (!clinicId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reminders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage automated reminders and notifications</p>
        </div>
        {activeTab === 'rules' && (
          <Button onClick={handleAddRule} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Rule
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.toLowerCase()
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v || 'all')}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ReminderQueueTable queue={queue || []} isLoading={isLoadingQueue} />
        </div>
      )}

      {activeTab === 'rules' && (
        <ReminderRulesTable
          rules={rules || []}
          isLoading={isLoadingRules}
          onEdit={handleEditRule}
          onTest={handleTestRule}
        />
      )}

      {activeTab === 'logs' && (
        <ReminderLogsTable logs={logs || []} isLoading={isLoadingLogs} />
      )}

      <RuleFormModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        clinicId={clinicId}
        initialData={editingRule}
      />
      <TestRuleModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        clinicId={clinicId}
        rule={testingRule}
      />
    </div>
  )
}
