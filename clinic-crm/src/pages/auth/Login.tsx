import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, ActivitySquare, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const ROLE_REDIRECT: Record<string, string> = {
  super_admin: '/super-admin',
  clinic_admin: '/dashboard',
  admin: '/dashboard',
  doctor: '/doctor',
  receptionist: '/appointments',
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid_credentials') || m.includes('invalid email or password')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email before logging in.'
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return message || 'Something went wrong. Please try again.'
}

const FEATURES = [
  'AI-powered booking & scheduling',
  'WhatsApp automation for patients',
  'Real-time analytics & insights',
]

export default function Login() {
  const { login } = useAuthContext()
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [shakeError, setShakeError] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const clearError = () => {
    if (authError) setAuthError(null)
  }

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null)
    setShakeError(false)
    setIsSubmitting(true)

    try {
      const result = await login(data.email, data.password)

      if (result.error) {
        let msg: string
        if (result.error === 'account_deactivated') {
          msg = 'Your account has been deactivated. Contact your administrator.'
        } else if (result.error === 'account_not_found') {
          msg = 'Account not found. Contact your administrator.'
        } else {
          msg = mapAuthError(result.error)
        }

        setAuthError(msg)
        setShakeError(true)
        setTimeout(() => setShakeError(false), 600)
        return
      }

      const target = ROLE_REDIRECT[result.role ?? ''] ?? '/dashboard'
      setLoginSuccess(true)
      setTimeout(() => navigate(target, { replace: true }), 350)
    } catch (err: any) {
      console.error('Login error:', err)
      setAuthError(err?.message || 'Login failed')
      setShakeError(true)
      setTimeout(() => setShakeError(false), 600)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      <div
        className="hidden lg:flex flex-col w-1/2 min-h-screen p-14 relative overflow-hidden login-panel-left"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #2A8C78 100%)',
        }}
      >
        <div className="absolute -top-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-teal-400/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[15%] -right-[5%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2A8C78] flex items-center justify-center shadow-lg shadow-teal-900/40">
            <ActivitySquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">ClinicOS</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <p className="text-[#2A8C78] text-xs font-semibold uppercase tracking-widest mb-4">
            Clinic Management Platform
          </p>
          <h1 className="text-4xl xl:text-[2.75rem] font-bold text-white leading-tight mb-5">
            The complete clinic<br />management platform
          </h1>
          <p className="text-slate-400 text-base mb-12 max-w-sm leading-relaxed">
            Built for modern healthcare teams - fast, secure, and intelligent.
          </p>

          <div className="space-y-5">
            {FEATURES.map((label) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="w-6 h-6 rounded-full bg-[#2A8C78]/20 border border-[#2A8C78]/50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2A8C78]" />
                </div>
                <span className="text-slate-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-slate-500 text-sm">Trusted by 50+ clinics across Hyderabad</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-8 sm:p-12 bg-[#F8FAFC] login-panel-right">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[#2A8C78] flex items-center justify-center">
              <ActivitySquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0F172A]">ClinicOS</span>
          </div>

          <div className="mb-8 login-field" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-[1.875rem] font-bold text-[#0F172A] tracking-tight">Welcome back</h2>
            <p className="text-[#64748B] text-sm mt-1.5">Sign in to your clinic dashboard</p>
          </div>

          {authError && (
            <div
              role="alert"
              className={cn(
                'mb-6 flex items-start gap-2.5 px-4 py-3 rounded-lg',
                'bg-red-50 border border-red-200 text-red-700 text-sm',
                shakeError && 'animate-shake'
              )}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="login-field" style={{ animationDelay: '0.4s' }}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0F172A] font-medium text-sm">Email address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]" aria-hidden="true">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </span>
                          <Input type="email" autoComplete="email" placeholder="you@clinic.com" className={cn('h-11 pl-9 border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:border-[#2A8C78] focus-visible:ring-[#2A8C78]/20', form.formState.errors.email && 'border-red-400 focus-visible:border-red-400')} {...field} onChange={(e) => { field.onChange(e); clearError() }} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="login-field" style={{ animationDelay: '0.5s' }}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#0F172A] font-medium text-sm">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]" aria-hidden="true">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </span>
                          <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="********" className={cn('h-11 pl-9 pr-10 border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:border-[#2A8C78] focus-visible:ring-[#2A8C78]/20', form.formState.errors.password && 'border-red-400 focus-visible:border-red-400')} {...field} onChange={(e) => { field.onChange(e); clearError() }} />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="login-field" style={{ animationDelay: '0.55s' }}>
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox id="rememberMe" checked={field.value} onCheckedChange={field.onChange} className="border-[#CBD5E1] data-[state=checked]:bg-[#2A8C78] data-[state=checked]:border-[#2A8C78]" />
                      </FormControl>
                      <label htmlFor="rememberMe" className="text-sm text-[#64748B] cursor-pointer select-none leading-none">Remember me</label>
                    </FormItem>
                  )}
                />
              </div>

              <div className="login-field" style={{ animationDelay: '0.6s' }}>
                <Button type="submit" disabled={isSubmitting || loginSuccess} className={cn('w-full h-11 text-base font-medium text-white border-0 transition-colors duration-300', loginSuccess ? 'bg-[#22C55E] hover:bg-[#22C55E]' : 'bg-[#2A8C78] hover:bg-[#236B5E]')}>
                  {loginSuccess ? (
                    <><CheckCircle2 className="mr-2 h-5 w-5" />Signed in!</>
                  ) : isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Authenticating...</>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-[#E2E8F0] login-field" style={{ animationDelay: '0.7s' }}>
            <p className="text-center text-sm text-[#64748B]">Need help? <span className="text-[#0F172A] font-medium">Contact your clinic administrator</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
