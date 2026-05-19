import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { SERVICE_CATEGORIES, type ServiceCategory, type ServiceUpsertInput } from '@/types/service'

export const serviceFormSchema = z.object({
  name: z.string().trim().min(1, 'Service name is required'),
  category: z.enum(SERVICE_CATEGORIES),
  description: z.string().optional(),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(5, 'Minimum duration is 5 minutes')
    .max(480, 'Maximum duration is 480 minutes')
    .refine((value) => value % 5 === 0, 'Duration should be in steps of 5 minutes'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  is_active: z.boolean().default(true),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  defaultValues?: Partial<ServiceUpsertInput>
  onSubmit: (values: ServiceUpsertInput) => Promise<void>
  submitLabel?: string
  isSubmitting?: boolean
}

export function ServiceForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Service',
  isSubmitting = false,
}: ServiceFormProps) {
  const initialValues: ServiceFormValues = {
    name: defaultValues?.name ?? '',
    category: (defaultValues?.category ?? 'General') as ServiceCategory,
    description: defaultValues?.description ?? '',
    duration_minutes: defaultValues?.duration_minutes ?? 30,
    price: defaultValues?.price ?? 0,
    is_active: defaultValues?.is_active ?? true,
  }

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema) as any,
    defaultValues: initialValues,
  })

  useEffect(() => {
    form.reset(initialValues)
  }, [
    initialValues.name,
    initialValues.category,
    initialValues.description,
    initialValues.duration_minutes,
    initialValues.price,
    initialValues.is_active,
    form,
  ])

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit({
            ...values,
            description: values.description?.trim() ? values.description.trim() : null,
          })
        })}
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Service name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Select service category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes) *</FormLabel>
                <FormControl>
                  <Input type="number" min={5} max={480} step={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (Rs.) *</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Active</FormLabel>
                <FormControl>
                  <div className="flex h-8 items-center gap-2">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm text-muted-foreground">
                      {field.value ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Optional notes about this service"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
