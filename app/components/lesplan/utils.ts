import type {
  GoalCoverageItem,
  KnowledgeCoverageItem,
  LessonOutlineItem,
  LesplanOverviewState,
  LesplanPageState,
} from "./types"
import type { LesplanResponse } from "~/lib/backend/types"

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  return normalized.length > 0 ? normalized : undefined
}

export function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "number" ? item : Number.NaN))
    .filter((item) => Number.isFinite(item))
}

export function lessonOutlineList(value: unknown): LessonOutlineItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .map((item) => asObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      lesson_number: typeof item.lesson_number === "number" ? item.lesson_number : 0,
      subject_focus: typeof item.subject_focus === "string" ? item.subject_focus : "",
      description: typeof item.description === "string" ? item.description : "",
      teaching_approach_hint:
        typeof item.teaching_approach_hint === "string" ? item.teaching_approach_hint : undefined,
      builds_on: typeof item.builds_on === "string" ? item.builds_on : "",
      concept_tags: stringList(item.concept_tags),
      lesson_intention: typeof item.lesson_intention === "string" ? item.lesson_intention : undefined,
      end_understanding: typeof item.end_understanding === "string" ? item.end_understanding : undefined,
      sequence_rationale: typeof item.sequence_rationale === "string" ? item.sequence_rationale : undefined,
      builds_on_lessons: numberList(item.builds_on_lessons),
      paragraph_indices: numberList(item.paragraph_indices),
    }))
    .filter((item) => item.lesson_number > 0 && item.subject_focus.length > 0)
  return normalized.length > 0 ? normalized : undefined
}

export function goalCoverageList(value: unknown): GoalCoverageItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .map((item) => asObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      goal: typeof item.goal === "string" ? item.goal : "",
      lesson_numbers: numberList(item.lesson_numbers),
      rationale: typeof item.rationale === "string" ? item.rationale : undefined,
    }))
    .filter((item) => item.goal.length > 0)
  return normalized.length > 0 ? normalized : undefined
}

export function knowledgeCoverageList(value: unknown): KnowledgeCoverageItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .map((item) => asObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      knowledge: typeof item.knowledge === "string" ? item.knowledge : "",
      lesson_numbers: numberList(item.lesson_numbers),
      rationale: typeof item.rationale === "string" ? item.rationale : undefined,
    }))
    .filter((item) => item.knowledge.length > 0)
  return normalized.length > 0 ? normalized : undefined
}

export function normalizeOverview(
  overview: LesplanResponse["overview"] | null | undefined
): LesplanOverviewState {
  if (!overview) return null
  const raw = overview as unknown as Record<string, unknown>

  return {
    title: typeof raw.title === "string" ? raw.title : undefined,
    series_summary: typeof raw.series_summary === "string" ? raw.series_summary : undefined,
    series_themes: stringList(raw.series_themes),
    learning_goals: stringList(raw.learning_goals),
    key_knowledge: stringList(raw.key_knowledge),
    recommended_approach: typeof raw.recommended_approach === "string" ? raw.recommended_approach : undefined,
    learning_progression: typeof raw.learning_progression === "string" ? raw.learning_progression : undefined,
    lesson_outline: lessonOutlineList(raw.lesson_outline),
    goal_coverage: goalCoverageList(raw.goal_coverage),
    knowledge_coverage: knowledgeCoverageList(raw.knowledge_coverage),
    didactic_approach: typeof raw.didactic_approach === "string" ? raw.didactic_approach : undefined,
  }
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trim()}…`
}

export function splitSentences(value: string): string[] {
  return (value.match(/[^.!?]+[.!?]?/g) ?? []).map((part) => part.trim()).filter(Boolean)
}

export function splitIntoParagraphs(value: string, sentencesPerParagraph = 2): string[] {
  const sentences = splitSentences(value)
  if (sentences.length === 0) return []
  const chunks: string[] = []
  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    chunks.push(sentences.slice(index, index + sentencesPerParagraph).join(" "))
  }
  return chunks
}

export function compactKnowledgeLabel(item: string): string {
  const clean = item.replace(/\s+/g, " ").trim()
  return truncateText(clean, 42)
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 3)
  )
}

export function deriveLessonTags(item: LessonOutlineItem, keyKnowledge: string[]): string[] {
  if (Array.isArray(item.concept_tags) && item.concept_tags.length > 0) {
    return item.concept_tags.map((tag) => compactKnowledgeLabel(tag)).slice(0, 4)
  }

  const lessonTokens = tokenize(`${item.subject_focus} ${item.description} ${item.builds_on}`)
  const matchedKnowledge = keyKnowledge
    .filter((entry) => {
      const entryTokens = tokenize(entry)
      for (const token of entryTokens) {
        if (lessonTokens.has(token)) return true
      }
      return false
    })
    .map((entry) => compactKnowledgeLabel(entry))
    .slice(0, 3)

  const fallbackFromFocus = item.subject_focus
    .split(/[:;,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 3)
    .map((part) => truncateText(part, 28))

  const tags = [...matchedKnowledge, ...fallbackFromFocus]
  return [...new Set(tags)].slice(0, 4)
}

export function summarizeBuildsOn(buildsOn: string): string {
  if (!buildsOn.trim()) return "Bouwt voort op eerdere context uit de reeks."
  const lessonMatch = buildsOn.match(/les\s*\d+/i)
  if (lessonMatch) return `Bouwt voort op ${lessonMatch[0].toLowerCase()}.`
  return `Bouwt voort op ${truncateText(buildsOn, 78)}`
}

export function buildSeriesSummary(overview: LesplanOverviewState, numLessons: number) {
  const progressionSentences = splitSentences(overview?.learning_progression ?? "").slice(0, 2)
  const summary =
    overview?.series_summary && overview.series_summary.trim().length > 0
      ? overview.series_summary.trim()
      : progressionSentences.length > 0
      ? progressionSentences.join(" ")
      : `Deze lessenreeks bestaat uit ${numLessons} lessen en is nog op hoofdlijnen uitgewerkt voor review.`

  const themes =
    (overview?.series_themes ?? []).length > 0
      ? (overview?.series_themes ?? []).map((item) => compactKnowledgeLabel(item)).slice(0, 6)
      : (overview?.key_knowledge ?? []).map((item) => compactKnowledgeLabel(item)).slice(0, 5)

  const firstLesson = overview?.lesson_outline?.[0]?.subject_focus
  const lastLesson = overview?.lesson_outline?.[overview.lesson_outline.length - 1]?.subject_focus
  const progression =
    firstLesson && lastLesson
      ? `De opbouw loopt van "${truncateText(firstLesson, 52)}" naar "${truncateText(lastLesson, 52)}".`
      : "Na goedkeuring wordt deze reeks uitgewerkt naar gedetailleerde lessen."

  return { summary, themes, progression }
}

const SECTION_KEY_TO_FIELD_NAME: Record<string, string> = {
  seriesamenvatting: "series_summary",
  leerdoelen: "learning_goals",
  kernkennis: "key_knowledge",
  leerlijn: "learning_progression",
  "aanbevolen-aanpak": "recommended_approach",
  "didactische-aanpak": "didactic_approach",
}

export function sectionKeyToFieldName(sectionKey: string): string {
  if (sectionKey.startsWith("les-")) return "lesson_outline"
  return SECTION_KEY_TO_FIELD_NAME[sectionKey] ?? sectionKey
}

const REVIEW_STATUS_MODEL = [
  { id: "concept", label: "Concept gegenereerd" },
  { id: "review", label: "Wacht op review" },
  { id: "ready", label: "Klaar voor goedkeuring" },
  { id: "approved", label: "Goedgekeurd" },
] as const

type ReviewModelStepId = (typeof REVIEW_STATUS_MODEL)[number]["id"]

export function getReviewModelStep(status: LesplanPageState["status"]): ReviewModelStepId {
  if (status === "overview_ready") return "ready"
  if (status === "revising_overview") return "review"
  if (status === "generating_lessons" || status === "completed") return "approved"
  return "concept"
}

export function getReviewStatusLabel(status: LesplanPageState["status"]): string {
  const step = getReviewModelStep(status)
  return REVIEW_STATUS_MODEL.find((item) => item.id === step)?.label ?? "Concept gegenereerd"
}
