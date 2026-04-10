import { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  type OnboardingPhase,
  loadOnboardingPhase,
  saveOnboardingPhase,
  advancePhase,
  loadCompletedSteps,
  saveCompletedSteps,
} from "~/lib/onboarding"

type OnboardingContextValue = {
  phase: OnboardingPhase | null
  hydrated: boolean
  completedSteps: Set<number>
  advance: () => void
  dismiss: () => void
  markStepCompleted: (step: number) => void
  isStepCompleted: (step: number) => boolean
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

type OnboardingProviderProps = {
  children: React.ReactNode
  hasLesplans?: boolean
}

export function OnboardingProvider({ children, hasLesplans }: OnboardingProviderProps) {
  const [phase, setPhase] = useState<OnboardingPhase | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (hasLesplans) {
      saveOnboardingPhase("dismissed")
      setPhase("dismissed")
    } else {
      setPhase(loadOnboardingPhase())
    }
    setCompletedSteps(loadCompletedSteps())
    setHydrated(true)
  }, [hasLesplans])

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

  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(step)
      saveCompletedSteps(next)
      return next
    })
  }, [])

  const isStepCompleted = useCallback((step: number) => {
    return completedSteps.has(step)
  }, [completedSteps])

  return (
    <OnboardingContext value={{ phase, hydrated, completedSteps, advance, dismiss, markStepCompleted, isStepCompleted }}>
      {children}
    </OnboardingContext>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider")
  return ctx
}
