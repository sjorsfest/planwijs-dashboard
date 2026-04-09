import { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  type OnboardingPhase,
  loadOnboardingPhase,
  saveOnboardingPhase,
  advancePhase,
} from "~/lib/onboarding"

type OnboardingContextValue = {
  phase: OnboardingPhase | null
  hydrated: boolean
  advance: () => void
  dismiss: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<OnboardingPhase | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPhase(loadOnboardingPhase())
    setHydrated(true)
  }, [])

  const advance = useCallback(() => {
    setPhase((prev) => {
      if (!prev) return prev
      const next = advancePhase(prev)
      saveOnboardingPhase(next)
      return next
    })
  }, [])

  const dismiss = useCallback(() => {
    saveOnboardingPhase("dismissed")
    setPhase("dismissed")
  }, [])

  return (
    <OnboardingContext value={{ phase, hydrated, advance, dismiss }}>
      {children}
    </OnboardingContext>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider")
  return ctx
}
