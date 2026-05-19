import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useWhatsAppSettings, useSaveWhatsAppSettings, DEFAULT_SYSTEM_PROMPT } from '@/hooks/useWhatsAppSettings'
import type { WhatsAppAIConfig } from '@/types/whatsapp'
import { Skeleton } from '@/components/ui/skeleton'

const schema = z.object({
  ai_enabled: z.boolean(),
  ai_persona_name: z.string().min(1, 'Persona name is required'),
  system_prompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  business_hours_only: z.boolean(),
  business_hours_start: z.string(),
  business_hours_end: z.string(),
  max_ai_turns: z.coerce.number().min(1).max(20),
})

type FormValues = z.infer<typeof schema>

interface AIConfigFormProps {
  clinicId: string
}

export function AIConfigForm({ clinicId }: AIConfigFormProps) {
  const { data: config, isLoading } = useWhatsAppSettings(clinicId)
  const saveSettings = useSaveWhatsAppSettings()
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [initialized, setInitialized] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ai_enabled: false,
      ai_persona_name: 'Priya',
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      business_hours_only: true,
      business_hours_start: '09:00',
      business_hours_end: '18:00',
      max_ai_turns: 5,
    },
  })

  // Initialize form when config loads
  if (config && !initialized) {
    setInitialized(true)
    setKeywords(config.handoff_keywords || ['doctor', 'urgent', 'emergency', 'accident'])
    form.reset({
      ai_enabled: config.ai_enabled,
      ai_persona_name: config.ai_persona_name || 'Priya',
      system_prompt: config.system_prompt || DEFAULT_SYSTEM_PROMPT,
      business_hours_only: config.business_hours_only,
      business_hours_start: config.business_hours_start || '09:00',
      business_hours_end: config.business_hours_end || '18:00',
      max_ai_turns: config.max_ai_turns || 5,
    })
  }

  if (!initialized && !config) {
    setKeywords(['doctor', 'urgent', 'emergency', 'accident'])
    setInitialized(true)
  }

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase()
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw])
      setKeywordInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  const onSubmit = async (data: FormValues) => {
    await saveSettings.mutateAsync({
      clinic_id: clinicId,
      ...data,
      handoff_keywords: keywords,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Master Toggle */}
        <FormField
          control={form.control as any}
          name="ai_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-card">
              <div>
                <FormLabel className="text-base font-semibold">Enable AI Takeover</FormLabel>
                <FormDescription className="text-sm text-muted-foreground mt-0.5">
                  Allow the AI assistant to automatically respond to patient messages
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Persona name */}
          <FormField
            control={form.control as any}
            name="ai_persona_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bot Persona Name</FormLabel>
                <FormControl>
                  <Input placeholder="Priya" {...field} />
                </FormControl>
                <FormDescription>Name shown to patients in AI replies</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max turns */}
          <FormField
            control={form.control as any}
            name="max_ai_turns"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max AI Turns</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={20} {...field} />
                </FormControl>
                <FormDescription>AI hands off to receptionist after this many replies</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* System prompt */}
        <FormField
          control={form.control as any}
          name="system_prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI System Prompt</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[220px] resize-y font-mono text-xs"
                  placeholder={DEFAULT_SYSTEM_PROMPT}
                  {...field}
                />
              </FormControl>
              <FormDescription>Instructions that define how the AI behaves with patients</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Handoff keywords */}
        <div className="space-y-2">
          <Label>Handoff Keywords</Label>
          <p className="text-xs text-muted-foreground">
            If a patient message contains any of these words, AI hands off to receptionist immediately
          </p>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/20 min-h-[52px]">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 bg-destructive/10 text-destructive text-xs px-2 py-1 rounded-full font-medium">
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Add keyword (e.g., emergency)"
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
            />
            <Button type="button" variant="outline" onClick={addKeyword}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Business hours */}
        <FormField
          control={form.control as any}
          name="business_hours_only"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <FormLabel>Business Hours Only</FormLabel>
                <FormDescription>AI only responds during business hours</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('business_hours_only') && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="business_hours_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="business_hours_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closing Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        <Button type="submit" disabled={saveSettings.isPending} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saveSettings.isPending ? 'Saving...' : 'Save AI Config'}
        </Button>
      </form>
    </Form>
  )
}
