import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Edit, Play, Trash2 } from 'lucide-react'
import type { ReminderRule } from '../../types/reminder'
import { Switch } from '../ui/switch'
import { useDeleteRule, useUpsertRule } from '../../hooks/useReminders'

interface ReminderRulesTableProps {
  rules: ReminderRule[]
  isLoading: boolean
  onEdit: (rule: ReminderRule) => void
  onTest: (rule: ReminderRule) => void
}

export function ReminderRulesTable({ rules, isLoading, onEdit, onTest }: ReminderRulesTableProps) {
  const deleteMutation = useDeleteRule()
  const upsertMutation = useUpsertRule()

  const handleToggleActive = (rule: ReminderRule, checked: boolean) => {
    upsertMutation.mutate({ id: rule.id, is_active: checked })
  }

  if (isLoading) return <div className="p-4 text-center text-sm text-gray-500">Loading rules...</div>
  if (!rules?.length) return <div className="p-4 text-center text-sm text-gray-500">No reminder rules defined.</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Offset (Hours)</TableHead>
            <TableHead>Channel(s)</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">{rule.name}</TableCell>
              <TableCell className="capitalize">{rule.trigger_type.replace('_', ' ')}</TableCell>
              <TableCell>
                {rule.offset_hours < 0 
                  ? `${Math.abs(rule.offset_hours)}hrs before` 
                  : `${rule.offset_hours}hrs after`}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {rule.channel.map(ch => (
                    <Badge key={ch} variant="secondary" className="capitalize">{ch}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Switch 
                  checked={rule.is_active} 
                  onCheckedChange={(c) => handleToggleActive(rule, c)}
                  disabled={upsertMutation.isPending}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onTest(rule)} title="Test Rule">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500" 
                  onClick={() => {
                    if (window.confirm('Delete this rule?')) {
                      deleteMutation.mutate(rule.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
