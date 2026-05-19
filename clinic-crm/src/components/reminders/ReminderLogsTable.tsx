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
import type { ReminderLog } from '../../types/reminder'

interface ReminderLogsTableProps {
  logs: ReminderLog[]
  isLoading: boolean
}

export function ReminderLogsTable({ logs, isLoading }: ReminderLogsTableProps) {
  if (isLoading) return <div className="p-4 text-center text-sm text-gray-500">Loading logs...</div>
  if (!logs?.length) return <div className="p-4 text-center text-sm text-gray-500">No logs found.</div>

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent': return <Badge variant="outline" className="text-green-600 bg-green-50">Sent</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {log.sent_at ? format(new Date(log.sent_at), 'dd MMM, hh:mm a') : '-'}
              </TableCell>
              <TableCell className="font-medium">
                {log.patients?.name || 'Unknown'}
                <div className="text-xs text-muted-foreground">{log.patients?.phone}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">{log.channel}</Badge>
              </TableCell>
              <TableCell className="max-w-md truncate" title={log.message_content || ''}>
                {log.message_content}
              </TableCell>
              <TableCell>
                {getStatusBadge(log.status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
