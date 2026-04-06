import type { components } from "~/types/api.generated"

export type Method = components["schemas"]["Method"]
export type Chapter = components["schemas"]["ChapterResponse"]
export type Paragraph = components["schemas"]["ParagraphResponse"]
export type SchoolYear = components["schemas"]["SchoolYear"]
export type Level = components["schemas"]["Level"]
export type ClassDifficulty = components["schemas"]["ClassDifficulty"]
export type ClassSupportChallenge = components["schemas"]["ClassSupportChallenge"]

export const SUPPORT_CHALLENGE_OPTIONS: ClassSupportChallenge[] = [
  "Meer ondersteuning", "Gebalanceerd", "Meer uitdaging"
]

export const SCHOOL_YEARS: SchoolYear[] = ["1e jaar", "2e jaar", "3e jaar", "4e jaar", "5e jaar", "6e jaar"]
export const LEVELS: Level[] = ["Vmbo-b", "Vmbo-k", "Vmbo-g", "Vmbo-t", "Havo", "Vwo", "Gymnasium"]

export function getDisabledYears(level: Level | null): SchoolYear[] {
  if (!level) return []
  if (level.startsWith("Vmbo")) return ["5e jaar", "6e jaar"]
  if (level === "Havo") return ["6e jaar"]
  return []
}

export function getMethodSubjectLabel(method: Method): string | null {
  const subject = (method as unknown as { subject?: string | { name?: string | null } | null }).subject
  if (!subject) return null
  if (typeof subject === "string") return subject
  if (typeof subject === "object" && typeof subject.name === "string") return subject.name
  return null
}
