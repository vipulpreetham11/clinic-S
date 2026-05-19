import { Copy, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface ConnectionSetupProps {
  isConnected?: boolean
  phoneNumber?: string | null
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copied`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={value} readOnly className="font-mono text-sm bg-muted/40" />
        <Button variant="outline" size="icon" onClick={handleCopy} className="flex-shrink-0 h-9 w-9">
          {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export function ConnectionSetup({ isConnected = false, phoneNumber }: ConnectionSetupProps) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`
  const verifyToken = import.meta.env.VITE_WHATSAPP_VERIFY_TOKEN || 'your-verify-token'

  const steps = [
    'Go to Meta Developer Console (developers.facebook.com)',
    'Create or open a WhatsApp Business App',
    'Navigate to WhatsApp → Configuration',
    'Add the Webhook URL and Verify Token below',
    'Subscribe to webhook fields: messages, message_status_updates',
    'Copy Phone Number ID → add as WA_PHONE_NUMBER_ID in Supabase secrets',
    'Add WHATSAPP_TOKEN (permanent token) to Supabase secrets',
  ]

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className={`flex items-center gap-3 rounded-lg border p-4 ${
        isConnected ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
        <div>
          <p className={`font-medium text-sm ${isConnected ? 'text-green-800' : 'text-amber-800'}`}>
            {isConnected ? 'WhatsApp Connected' : 'WhatsApp Not Connected'}
          </p>
          {phoneNumber && <p className="text-xs text-green-700 mt-0.5">+{phoneNumber}</p>}
          {!isConnected && (
            <p className="text-xs text-amber-700 mt-0.5">Follow the steps below to connect your WhatsApp Business account</p>
          )}
        </div>
      </div>

      {/* Webhook credentials */}
      <div className="space-y-4 rounded-lg border p-4 bg-card">
        <h3 className="font-semibold text-sm">Webhook Credentials</h3>
        <CopyField label="Webhook URL" value={webhookUrl} />
        <CopyField label="Verify Token" value={verifyToken} />
      </div>

      {/* Setup guide */}
      <div className="rounded-lg border p-4 space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Setup Instructions</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/cloud-api/get-started', '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Meta Docs
          </Button>
        </div>

        <ol className="space-y-3">
          {steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Supabase Secrets table */}
      <div className="rounded-lg border p-4 space-y-3 bg-card">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Required Supabase Secrets</h3>
        </div>
        <p className="text-xs text-muted-foreground">Add these in Supabase Dashboard → Edge Functions → Secrets</p>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium text-muted-foreground">Secret Key</th>
                <th className="text-left pb-2 font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[
                ['WHATSAPP_TOKEN', 'Meta permanent access token'],
                ['WHATSAPP_VERIFY_TOKEN', 'Custom verification string'],
                ['WA_PHONE_NUMBER_ID', 'Meta Phone Number ID'],
                ['ANTHROPIC_API_KEY', 'Claude API key for AI replies'],
              ].map(([key, desc]) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-primary">{key}</td>
                  <td className="py-2 text-muted-foreground font-sans">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
