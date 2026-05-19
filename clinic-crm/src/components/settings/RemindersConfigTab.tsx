import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { useReminderRules } from '@/hooks/useReminders'
import { ReminderRulesTable } from '@/components/reminders/ReminderRulesTable'
import { RuleFormModal } from '@/components/reminders/RuleFormModal'
import { TestRuleModal } from '@/components/reminders/TestRuleModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReminderRule } from '@/types/reminder'

export function RemindersConfigTab() {
  const { clinic } = useAuthContext()
  const clinicId = clinic?.id
  const { data: rules = [], isLoading } = useReminderRules(clinicId)

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testingRule, setTestingRule] = useState<ReminderRule | null>(null)

  if (!clinicId) return null

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Reminder rules</CardTitle>
            <CardDescription>
              Automated reminders sent before or after appointments
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditingRule(null)
              setIsRuleModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Add rule
          </Button>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <ReminderRulesTable
            rules={rules}
            isLoading={isLoading}
            onEdit={(rule) => {
              setEditingRule(rule)
              setIsRuleModalOpen(true)
            }}
            onTest={(rule) => {
              setTestingRule(rule)
              setIsTestModalOpen(true)
            }}
          />
        </CardContent>
      </Card>

      <RuleFormModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        initialData={editingRule}
        clinicId={clinicId}
      />
      <TestRuleModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        rule={testingRule}
        clinicId={clinicId}
      />
    </>
  )
}
