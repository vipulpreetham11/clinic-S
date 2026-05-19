function escapeCell(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ]
  return lines.join('\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function patientsToCsv(patients: Record<string, unknown>[]): string {
  const headers = ['id', 'name', 'phone', 'email', 'gender', 'date_of_birth', 'created_at']
  const rows = patients.map((p) => headers.map((h) => p[h]))
  return rowsToCsv(headers, rows)
}

export function appointmentsToCsv(appointments: Record<string, unknown>[]): string {
  const headers = [
    'id',
    'date',
    'start_time',
    'end_time',
    'status',
    'patient_name',
    'doctor_name',
    'service_name',
    'notes',
    'created_at',
  ]
  const rows = appointments.map((a) => [
    a.id,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    (a.patient as { name?: string } | null)?.name ?? '',
    (a.doctor as { name?: string } | null)?.name ?? '',
    (a.service as { name?: string } | null)?.name ?? '',
    a.notes,
    a.created_at,
  ])
  return rowsToCsv(headers, rows)
}

export function invoicesToCsv(invoices: Record<string, unknown>[]): string {
  const headers = ['id', 'appointment_id', 'total_amount', 'status', 'created_at']
  const rows = invoices.map((i) => headers.map((h) => i[h]))
  return rowsToCsv(headers, rows)
}
