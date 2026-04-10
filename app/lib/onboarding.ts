export type OnboardingPhase = "welkom" | "voltooid" | "dismissed"

const STORAGE_KEY = "planwijs_onboarding"
const STEPS_KEY = "planwijs_onboarding_steps"

const PHASE_TRANSITIONS: Record<OnboardingPhase, OnboardingPhase> = {
  welkom: "voltooid",
  voltooid: "dismissed",
  dismissed: "dismissed",
}

export function loadOnboardingPhase(): OnboardingPhase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return "welkom"
    if (raw === "welkom" || raw === "voltooid" || raw === "dismissed") return raw
    return "welkom"
  } catch {
    return "welkom"
  }
}

export function saveOnboardingPhase(phase: OnboardingPhase): void {
  try {
    localStorage.setItem(STORAGE_KEY, phase)
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function advancePhase(current: OnboardingPhase): OnboardingPhase {
  return PHASE_TRANSITIONS[current]
}

export function loadCompletedSteps(): Set<number> {
  try {
    const raw = localStorage.getItem(STEPS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "number")) {
      return new Set(parsed as number[])
    }
    return new Set()
  } catch {
    return new Set()
  }
}

export function saveCompletedSteps(steps: Set<number>): void {
  try {
    localStorage.setItem(STEPS_KEY, JSON.stringify([...steps]))
  } catch {
    // localStorage unavailable — silently ignore
  }
}
