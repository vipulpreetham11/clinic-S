import React from 'react'
import { format } from 'date-fns'
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
import { RotateCcw, XCircle } from 'lucide-react'
import type { ReminderQueue } from '../../types/reminder'
import { useRetryReminder, useCancelReminder } from '../../hooks/useReminders'

interface ReminderQueueTableProps {
  queue: ReminderQueue[]
  isLoading: boolean
}

export function ReminderQueueTable({ queue, isLoading }: ReminderQueueTableProps) {
  const retryMutation = useRetryReminder()
  const cancelMutation = useCancelReminder()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-blue-600 bg-blue-50">Pending</Badge>
      case 'sent': return <Badge variant="outline" className="text-green-600 bg-green-50">Sent</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>
      case 'cancelled': return <Badge variant="outline" className="line-through text-gray-500">Cancelled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) return <div className="p-4 text-center text-sm text-gray-500">Loading queue...</div>
  if (!queue?.length) return <div className="p-4 text-center text-sm text-gray-500">No reminders in queue.</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Message Preview</TableHead>
            <TableHead>Scheduled At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queue.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.patients?.name || 'Unknown'}
                <div className="text-xs text-muted-foreground">{item.patients?.phone || item.patients?.email}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{item.channel}</Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate" title={item.message_content || ''}>
                {item.message_content}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {format(new Date(item.scheduled_at), 'dd MMM, hh:mm a')}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  {getStatusBadge(item.status)}
                  {item.error_message && (
                    <span className="text-[10px] text-red-500 truncate max-w-[150px]" title={item.error_message}>
                      {item.error_message}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {item.status === 'failed' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Retry"
                    onClick={() => retryMutation.mutate(item.id)}
                    disabled={retryMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                {item.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Cancel"
                    className="text-red-500"
                    onClick={() => cancelMutation.mutate(item.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
