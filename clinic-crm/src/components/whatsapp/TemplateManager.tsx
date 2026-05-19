import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useTemplates, useCreateTemplate, useDeleteTemplate, useSeedTemplates } from '@/hooks/useTemplates'
import { cn } from '@/lib/utils'
import type { TemplateCategory } from '@/types/whatsapp'
import { Skeleton } from '@/components/ui/skeleton'

const schema = z.object({
  name: z.string().min(1, 'Template name is required'),
  category: z.enum(['appointment', 'reminder', 'followup', 'general']),
  content: z.string().min(10, 'Content must be at least 10 characters'),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  appointment: 'bg-blue-50 text-blue-700 border-blue-200',
  reminder: 'bg-amber-50 text-amber-700 border-amber-200',
  followup: 'bg-green-50 text-green-700 border-green-200',
  general: 'bg-gray-50 text-gray-700 border-gray-200',
}

interface TemplateManagerProps {
  clinicId: string
}

export function TemplateManager({ clinicId }: TemplateManagerProps) {
  const { data: templates = [], isLoading } = useTemplates(clinicId)
  const createTemplate = useCreateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const seedTemplates = useSeedTemplates()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: 'general',
      content: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    await createTemplate.mutateAsync({
      clinic_id: clinicId,
      ...data,
    })
    form.reset()
    setShowForm(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteTemplate.mutateAsync({ id: deleteId, clinicId })
    setDeleteId(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedTemplates.mutate(clinicId)}
              disabled={seedTemplates.isPending}
            >
              Load Defaults
            </Button>
          )}
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border p-4 bg-muted/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">New Template</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl><Input placeholder="Appointment Confirmed" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appointment">Appointment</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="followup">Follow-up</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hi {{patient_name}}, your appointment with Dr. {{doctor}} is confirmed for {{date}} at {{time}}."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Use: {'{{patient_name}}'}, {'{{doctor}}'}, {'{{date}}'}, {'{{time}}'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={createTemplate.isPending}>
                  <Check className="h-4 w-4 mr-1" />
                  {createTemplate.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create templates to send quick replies</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border p-4 bg-card hover:bg-muted/20 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-medium text-sm">{template.name}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5', CATEGORY_COLORS[template.category])}
                    >
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {template.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(template.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
