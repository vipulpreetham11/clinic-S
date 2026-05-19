import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { invoiceSettingsSchema } from '@/lib/settingsSchemas'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoiceSettings, useSaveInvoiceSettings } from '@/hooks/useSettings'

type InvoiceFormValues = z.infer<typeof invoiceSettingsSchema>

export function BillingInvoiceTab() {
  const { data, isLoading } = useInvoiceSettings()
  const save = useSaveInvoiceSettings()

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      prefix: 'INV',
      default_tax: 18,
      footer_text: '',
      show_gstin: true,
      payment_terms: '',
    },
  })

  useEffect(() => {
    if (data) {
      form.reset({
        prefix: data.prefix,
        default_tax: data.default_tax,
        footer_text: data.footer_text ?? '',
        show_gstin: data.show_gstin,
        payment_terms: data.payment_terms ?? '',
      })
    }
  }, [data, form])

  function onSubmit(values: InvoiceFormValues) {
    save.mutate({
      prefix: values.prefix,
      default_tax: values.default_tax,
      footer_text: values.footer_text || null,
      show_gstin: values.show_gstin,
      payment_terms: values.payment_terms || null,
    })
  }

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice defaults</CardTitle>
            <CardDescription>Applied when generating new invoices</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice prefix</FormLabel>
                  <FormControl>
                    <Input placeholder="INV" {...field} />
                  </FormControl>
                  <FormDescription>e.g. INV-1042</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_tax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default tax (GST %)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Default payment terms</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="footer_text"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Invoice footer text</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="show_gstin"
              render={({ field }) => (
                <FormItem className="md:col-span-2 flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show GSTIN on invoice</FormLabel>
                    <FormDescription>
                      Displays your clinic GSTIN from the profile tab
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save invoice settings'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}