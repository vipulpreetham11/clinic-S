import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User as UserProfile, Clinic } from '@/types'
import { hexToHsl } from '@/lib/utils'

interface LoginResult {
  error: string | null
  role?: string
}

interface AuthState {
  user: SupabaseUser | null
  profile: UserProfile | null
  clinic: Clinic | null
  role: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refreshClinic: () => Promise<void>
  isRole: (...roles: string[]) => boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isReceptionist: boolean
  isDoctor: boolean
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const mountedRef = useRef(true)
  const activeProfileId = useRef<string | null>(null)
  const initCompleted = useRef(false)

  const applyClinicTheme = (primaryColor: string) => {
    try {
      const hsl = hexToHsl(primaryColor)
      document.documentElement.style.setProperty('--primary', hsl)
      document.documentElement.style.setProperty('--ring', hsl)
    } catch {
      // ignore malformed color
    }
  }

  const clearTheme = () => {
    document.documentElement.style.removeProperty('--primary')
    document.documentElement.style.removeProperty('--ring')
  }

  const clearSession = () => {
    setUser(null)
    setProfile(null)
    setClinic(null)
    setRole(null)
    activeProfileId.current = null
    clearTheme()
  }

  const fetchProfileAndClinic = async (userId: string): Promise<UserProfile | null> => {
    // Retry up to 3 times with linear backoff to survive transient network hiccups.
    const fetchWithRetry = async (attempt = 1) => {
      const result = await supabase.from('users').select('*').eq('id', userId).single()
      if (result.error && attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        return fetchWithRetry(attempt + 1)
      }
      return result
    }

    const { data: userProfile, error: profileError } = await fetchWithRetry()

    if (profileError || !userProfile) {
      console.error('Profile fetch error:', profileError?.message)
      // Don't touch isLoading here — the caller (init / SIGNED_IN handler) owns that
      // via its own finally block, preventing a race where isLoading=false fires while
      // user is set but profile is still null.
      // If activeProfileId is already set the caller will leave existing profile/role
      // state in place, so the user stays on screen instead of being booted to /login.
      return null
    }

    if (!mountedRef.current) return userProfile as UserProfile

    setProfile(userProfile as UserProfile)
    setRole(userProfile.role as string)
    activeProfileId.current = userId

    if (!userProfile.clinic_id) {
      setClinic(null)
      clearTheme()
      return userProfile as UserProfile
    }

    const { data: clinicData } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', userProfile.clinic_id)
      .single()

    if (!mountedRef.current) return userProfile as UserProfile

    if (clinicData) {
      setClinic(clinicData as Clinic)
      if (clinicData.primary_color) applyClinicTheme(clinicData.primary_color as string)
    } else {
      setClinic(null)
      clearTheme()
    }

    return userProfile as UserProfile
  }

  useEffect(() => {
    mountedRef.current = true
    initCompleted.current = false

    // Safety net: never stay stuck on the loading screen forever.
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) setIsLoading(false)
    }, 10000)

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mountedRef.current) return

        if (error || !session?.user) {
          clearSession()
          return
        }

        setUser(session.user)
        await fetchProfileAndClinic(session.user.id)
      } catch (e) {
        console.error('Auth init error:', e)
        if (mountedRef.current) clearSession()
      } finally {
        // Always clear loading after init completes, whether success or failure.
        if (mountedRef.current) {
          clearTimeout(timeoutId)
          setIsLoading(false)
        }
      }
    }

    void init().then(() => {
      initCompleted.current = true
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        // INITIAL_SESSION is handled synchronously by getSession() in init() above.
        // Processing it here would set isLoading=false before the profile fetch
        // completes, causing ProtectedRoute to see role=null and redirect to /login.
        if (event === 'INITIAL_SESSION') return

        // Token refresh: session renews silently; profile is already loaded.
        if (event === 'TOKEN_REFRESHED') return

        if (event === 'SIGNED_OUT') {
          clearSession()
          setIsLoading(false)
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // On page reload Supabase fires SIGNED_IN while init() is still running.
          // Skip it here — init() owns the full fetch sequence. Once init() resolves,
          // initCompleted flips to true so genuine fresh logins are processed normally.
          if (!initCompleted.current) return

          // login() sets activeProfileId.current before this event fires,
          // so we skip the duplicate profile fetch for fresh logins.
          if (activeProfileId.current !== session.user.id) {
            setUser(session.user)
            setIsLoading(true)
            try {
              await fetchProfileAndClinic(session.user.id)
            } finally {
              if (mountedRef.current) setIsLoading(false)
            }
          }
          return
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('clinicos-auth')

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      if (!data.user) return { error: 'Login failed. Please try again.' }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !userProfile) {
        await supabase.auth.signOut()
        return { error: 'User profile not found. Contact admin.' }
      }

      if (!userProfile.is_active) {
        await supabase.auth.signOut()
        return { error: 'account_deactivated' }
      }

      setUser(data.user)
      setProfile(userProfile as UserProfile)
      setRole(userProfile.role as string)
      // Set activeProfileId before the SIGNED_IN event fires so the subscription
      // handler skips the duplicate profile fetch.
      activeProfileId.current = data.user.id

      if (userProfile.clinic_id) {
        const { data: clinicData } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', userProfile.clinic_id)
          .single()

        if (clinicData) {
          setClinic(clinicData as Clinic)
          if (clinicData.primary_color) applyClinicTheme(clinicData.primary_color as string)
        }
      } else {
        setClinic(null)
        clearTheme()
      }

      void supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id)

      return { error: null, role: userProfile.role as string }
    } catch (err) {
      console.error('Login error:', err)
      return { error: 'Login failed' }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    clearSession()
    window.location.href = '/login'
  }

  const refreshClinic = async () => {
    if (!user?.id) return
    try {
      await fetchProfileAndClinic(user.id)
    } catch {
      // ignore
    }
  }

  const isRole = (...roles: string[]) => {
    if (!role) return false
    return roles.includes(role)
  }

  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin' || role === 'clinic_admin'
  const isReceptionist = role === 'receptionist'
  const isDoctor = role === 'doctor'

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        clinic,
        role,
        isLoading,
        login,
        logout,
        refreshClinic,
        isRole,
        isSuperAdmin,
        isAdmin,
        isReceptionist,
        isDoctor,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

export const useAuth = useAuthContext
