import { useAuthContext } from '@/context/AuthContext'

/**
 * Hook to access the current clinic context.
 */
export function useClinic() {
  const { clinic, isLoading } = useAuthContext()

  return {
    clinic,
    isLoading,
  }
}
