export type OnboardingPhase = "welkom" | "voltooid" | "dismissed"

const STORAGE_KEY = "planwijs_onboarding"

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
