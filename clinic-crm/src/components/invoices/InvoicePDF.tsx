import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { InvoiceDetails } from '@/types/invoice'

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },
  heading: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    marginTop: 12,
  },
  muted: {
    color: '#4B5563',
  },
  box: {
    border: '1 solid #D1D5DB',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    borderTop: '1 solid #E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 12,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colSr: { width: '8%' },
  colDesc: { width: '44%' },
  colQty: { width: '14%', textAlign: 'right' },
  colRate: { width: '17%', textAlign: 'right' },
  colAmt: { width: '17%', textAlign: 'right' },
  totalsWrap: {
    marginTop: 12,
    width: '45%',
    marginLeft: '55%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottom: '1 solid #F3F4F6',
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: 700,
    borderTop: '1 solid #D1D5DB',
    marginTop: 4,
    paddingTop: 4,
  },
  footer: {
    marginTop: 28,
    borderTop: '1 solid #E5E7EB',
    paddingTop: 10,
    textAlign: 'center',
    color: '#6B7280',
  },
})

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

interface InvoicePDFProps {
  invoice: InvoiceDetails
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const clinic = invoice.clinic
  const patient = invoice.patient

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <View>
            <Text style={styles.title}>{clinic?.name ?? 'Clinic Name'}</Text>
            <Text style={styles.muted}>{clinic?.address ?? 'Clinic address'}</Text>
            <Text style={styles.muted}>Phone: {clinic?.phone ?? '-'}</Text>
            <Text style={styles.muted}>GSTIN: XXXXXXXX1234X9Z</Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>TAX INVOICE</Text>
            <Text>Invoice #: {invoice.invoice_number}</Text>
            <Text>Date: {format(new Date(invoice.created_at), 'dd MMM yyyy')}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Bill To</Text>
          <Text>{patient?.name ?? '-'}</Text>
          <Text style={styles.muted}>Phone: {patient?.phone ?? '-'}</Text>
          <Text style={styles.muted}>Email: {(patient as any)?.email ?? '-'}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colSr}>Sr</Text>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colRate}>Rate</Text>
          <Text style={styles.colAmt}>Amount</Text>
        </View>

        {invoice.line_items.map((item, index) => (
          <View style={styles.tableRow} key={`${item.name}-${index}`}>
            <Text style={styles.colSr}>{index + 1}</Text>
            <Text style={styles.colDesc}>{item.name}</Text>
            <Text style={styles.colQty}>{item.qty}</Text>
            <Text style={styles.colRate}>{formatINR(item.unit_price)}</Text>
            <Text style={styles.colAmt}>{formatINR(item.total)}</Text>
          </View>
        ))}

        <View style={styles.totalsWrap}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatINR(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>
              Discount {invoice.discount_type === 'percent' ? `(${invoice.discount_amount}%)` : ''}
            </Text>
            <Text>- {formatINR(
              invoice.discount_type === 'percent'
                ? (invoice.subtotal * invoice.discount_amount) / 100
                : invoice.discount_amount
            )}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax ({invoice.tax_percent}%)</Text>
            <Text>{formatINR(invoice.tax_amount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>TOTAL</Text>
            <Text>{formatINR(invoice.total_amount)}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text>Payment Method: {invoice.payment_method ?? '-'}</Text>
          <Text>
            Paid On:{' '}
            {invoice.paid_at ? format(new Date(invoice.paid_at), 'dd MMM yyyy, hh:mm a') : '-'}
          </Text>
          {!!invoice.notes && <Text>Notes: {invoice.notes}</Text>}
        </View>

        <View style={styles.footer}>
          <Text>Thank you for choosing {clinic?.name ?? 'our clinic'}.</Text>
          <Text>For queries, contact us at {clinic?.phone ?? '-'}.</Text>
        </View>
      </Page>
    </Document>
  )
}
