import { MessageCircle, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConnectionSetup } from '@/components/whatsapp/ConnectionSetup'
import { AIConfigForm } from '@/components/whatsapp/AIConfigForm'
import { TemplateManager } from '@/components/whatsapp/TemplateManager'
import { useAuthContext } from '@/context/AuthContext'

export default function WhatsAppSettings() {
  const { clinic } = useAuthContext()
  const navigate = useNavigate()

  if (!clinic) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/conversations')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">WhatsApp Settings</h1>
            <p className="text-sm text-muted-foreground">Configure connection, AI, and message templates</p>
          </div>
        </div>
      </div>

      {/* Settings tabs */}
      <Tabs defaultValue="connection">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="ai">AI Config</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-6">
          <ConnectionSetup isConnected={false} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIConfigForm clinicId={clinic.id} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateManager clinicId={clinic.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
