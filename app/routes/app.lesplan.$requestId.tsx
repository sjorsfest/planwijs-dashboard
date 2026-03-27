import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { data, Link, useFetcher, useLoaderData, useRevalidator } from "react-router"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Send,
  Sparkles,
} from "lucide-react"
import {
  approveLesplan,
  ApiRequestError,
  getBookDetail,
  getClass,
  getLesplan,
  getMethod,
  type LesplanResponse,
  submitFeedback,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { openEventSource } from "~/lib/sse"
import { Button } from "~/components/ui/button"
import { Textarea } from "~/components/ui/textarea"
import {
  mapFeedbackMessages,
  type ApprovalReadiness,
  type GoalCoverageItem,
  type KnowledgeCoverageItem,
  type LesplanDoneEvent,
  type LessonOutlineItem,
  type LesplanOverviewPartial,
  type LesplanOverviewState,
  type LesplanPageState,
  type LesplanThreadMessage,
  type LesplanWorkspaceLoaderData,
  type SourceContext,
} from "~/components/lesplan/types"
import type { Route } from "./+types/app.lesplan.$requestId"

type ActionData = {
  intent: "feedback" | "approve"
  ok: boolean
  lesplan?: LesplanResponse
  error?: string
}

type StatusEvent = {
  status: LesplanPageState["status"]
}

type StreamRef = {
  mode: "overview" | "revision"
  close: () => void
}

type PendingFeedbackRequest = {
  teacherId: string
  placeholderId: string
}

type StateAction =
  | { type: "hydrate"; payload: LesplanWorkspaceLoaderData }
  | { type: "stream_connecting"; mode: "overview" | "revision" }
  | { type: "stream_connected"; status?: LesplanPageState["status"] }
  | { type: "stream_partial"; partial: LesplanOverviewPartial }
  | { type: "ensure_revision_placeholder"; placeholderId: string }
  | { type: "feedback_submit_start"; teacherId: string; teacherContent: string; placeholderId: string }
  | { type: "feedback_submit_failed"; teacherId: string; placeholderId: string; error: string }
  | { type: "feedback_submit_ack"; lesplan: LesplanResponse; placeholderId: string }
  | { type: "revision_done"; done: LesplanDoneEvent; placeholderId: string }
  | { type: "overview_done"; done: LesplanDoneEvent }
  | { type: "stream_error"; message: string }
  | { type: "approve_start" }
  | { type: "approve_success"; lesplan: LesplanResponse }
  | { type: "approve_failed"; error: string }
  | { type: "set_polling"; active: boolean }
  | { type: "clear_error" }

const STATUS_COPY: Record<LesplanPageState["status"], { label: string; color: string }> = {
  pending: { label: "Klaar om te starten", color: "bg-amber-100 text-amber-800" },
  generating_overview: { label: "Overzicht wordt opgebouwd…", color: "bg-blue-100 text-blue-800" },
  overview_ready: { label: "Klaar voor review", color: "bg-emerald-100 text-emerald-800" },
  revising_overview: { label: "Wordt aangepast…", color: "bg-[#eff4ff] text-[#2a14b4]" },
  generating_lessons: { label: "Lessen worden uitgewerkt…", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Lesplan compleet", color: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Genereren mislukt", color: "bg-red-100 text-red-800" },
}

const SOFT_EASE = [0.22, 1, 0.36, 1] as const

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  return normalized.length > 0 ? normalized : undefined
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "number" ? item : Number.NaN))
    .filter((item) => Number.isFinite(item))
}

function lessonOutlineList(value: unknown): LessonOutlineItem[] | undefined {
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

function goalCoverageList(value: unknown): GoalCoverageItem[] | undefined {
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

function knowledgeCoverageList(value: unknown): KnowledgeCoverageItem[] | undefined {
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

function approvalReadiness(value: unknown): ApprovalReadiness | undefined {
  const raw = asObject(value)
  if (!raw) return undefined
  return {
    ready_for_approval: Boolean(raw.ready_for_approval),
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    checklist: stringList(raw.checklist) ?? [],
    open_questions: stringList(raw.open_questions) ?? [],
  }
}

function normalizeOverview(
  overview: LesplanResponse["overview"] | LesplanDoneEvent["overview"] | null | undefined
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
    approval_readiness: approvalReadiness(raw.approval_readiness),
    didactic_approach: typeof raw.didactic_approach === "string" ? raw.didactic_approach : undefined,
  }
}

function mergeOverview(current: LesplanOverviewState, partial: LesplanOverviewPartial): LesplanOverviewState {
  const next = { ...(current ?? {}) }
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      Object.assign(next, { [key]: value })
    }
  }
  return next
}

function mapPartialPayload(partial: Record<string, unknown>): LesplanOverviewPartial {
  const result: LesplanOverviewPartial = {}
  if (typeof partial.title === "string") result.title = partial.title
  if (typeof partial.series_summary === "string") result.series_summary = partial.series_summary
  if (Array.isArray(partial.series_themes)) {
    result.series_themes = partial.series_themes.filter((item): item is string => typeof item === "string")
  }
  if (Array.isArray(partial.learning_goals)) {
    result.learning_goals = partial.learning_goals.filter((goal): goal is string => typeof goal === "string")
  }
  if (Array.isArray(partial.key_knowledge)) {
    result.key_knowledge = partial.key_knowledge.filter((item): item is string => typeof item === "string")
  }
  if (typeof partial.recommended_approach === "string") result.recommended_approach = partial.recommended_approach
  if (typeof partial.learning_progression === "string") result.learning_progression = partial.learning_progression
  if (Array.isArray(partial.lesson_outline)) {
    result.lesson_outline = lessonOutlineList(partial.lesson_outline)
  }
  if (Array.isArray(partial.goal_coverage)) result.goal_coverage = goalCoverageList(partial.goal_coverage)
  if (Array.isArray(partial.knowledge_coverage)) {
    result.knowledge_coverage = knowledgeCoverageList(partial.knowledge_coverage)
  }
  if (partial.approval_readiness && typeof partial.approval_readiness === "object") {
    result.approval_readiness = approvalReadiness(partial.approval_readiness)
  }
  if (typeof partial.didactic_approach === "string") result.didactic_approach = partial.didactic_approach
  return result
}

function buildStateFromLoaderData(loaderData: LesplanWorkspaceLoaderData): LesplanPageState {
  return {
    requestId: loaderData.requestId,
    status: loaderData.lesplan.status,
    request: loaderData.request,
    sourceContext: loaderData.sourceContext,
    overview: normalizeOverview(loaderData.lesplan.overview),
    feedbackMessages: mapFeedbackMessages(loaderData.lesplan.feedback_messages),
    lessons: loaderData.lesplan.overview?.lessons ?? [],
    ui: {
      streamConnected: false,
      streamMode: null,
      sendingFeedback: false,
      approving: false,
      pollingLessons: false,
    },
  }
}

function findPendingAssistant(messages: LesplanThreadMessage[]): LesplanThreadMessage | undefined {
  return messages.find((m) => m.pending && m.role === "assistant")
}

function reducer(state: LesplanPageState, action: StateAction): LesplanPageState {
  switch (action.type) {
    case "hydrate": {
      const next = buildStateFromLoaderData(action.payload)
      const placeholder = findPendingAssistant(state.feedbackMessages)
      return {
        ...next,
        feedbackMessages: placeholder ? [...next.feedbackMessages, placeholder] : next.feedbackMessages,
        ui: {
          ...state.ui,
          streamConnected:
            next.status === "generating_overview" || next.status === "revising_overview"
              ? state.ui.streamConnected
              : false,
          streamMode:
            next.status === "generating_overview"
              ? "overview"
              : next.status === "revising_overview"
              ? "revision"
              : placeholder
              ? "revision"
              : null,
          pollingLessons:
            next.status === "generating_overview" ||
            next.status === "revising_overview" ||
            next.status === "generating_lessons"
              ? state.ui.pollingLessons
              : false,
          approving: false,
          sendingFeedback: false,
          lastError:
            next.status === "generating_overview" ||
            next.status === "revising_overview" ||
            next.status === "failed"
              ? state.ui.lastError
              : undefined,
        },
      }
    }
    case "stream_connecting":
      return { ...state, ui: { ...state.ui, streamConnected: false, streamMode: action.mode, lastError: undefined } }
    case "stream_connected":
      return { ...state, status: action.status ?? state.status, ui: { ...state.ui, streamConnected: true } }
    case "stream_partial":
      return { ...state, overview: mergeOverview(state.overview, action.partial) }
    case "ensure_revision_placeholder": {
      if (findPendingAssistant(state.feedbackMessages)) return state
      return {
        ...state,
        feedbackMessages: [
          ...state.feedbackMessages,
          { id: action.placeholderId, role: "assistant", content: "Overzicht wordt aangepast…", createdAt: new Date().toISOString(), pending: true },
        ],
      }
    }
    case "feedback_submit_start":
      return {
        ...state,
        ui: { ...state.ui, sendingFeedback: true, lastError: undefined },
        feedbackMessages: [
          ...state.feedbackMessages,
          { id: action.teacherId, role: "teacher", content: action.teacherContent, createdAt: new Date().toISOString(), pending: true },
          { id: action.placeholderId, role: "assistant", content: "Overzicht wordt aangepast…", createdAt: new Date().toISOString(), pending: true },
        ],
      }
    case "feedback_submit_failed":
      return {
        ...state,
        ui: { ...state.ui, sendingFeedback: false, lastError: action.error },
        feedbackMessages: state.feedbackMessages.filter((m) => m.id !== action.teacherId && m.id !== action.placeholderId),
      }
    case "feedback_submit_ack":
      return {
        ...state,
        status: action.lesplan.status,
        overview: normalizeOverview(action.lesplan.overview) ?? state.overview,
        lessons: action.lesplan.overview?.lessons ?? state.lessons,
        feedbackMessages: [
          ...mapFeedbackMessages(action.lesplan.feedback_messages),
          { id: action.placeholderId, role: "assistant", content: "Overzicht wordt aangepast…", createdAt: new Date().toISOString(), pending: true },
        ],
        ui: { ...state.ui, sendingFeedback: false, streamMode: "revision", lastError: undefined },
      }
    case "revision_done":
      return {
        ...state,
        status: action.done.status,
        overview: normalizeOverview(action.done.overview),
        feedbackMessages: state.feedbackMessages.map((m) =>
          m.id === action.placeholderId
            ? { ...m, content: action.done.assistant_message ?? "Het overzicht is bijgewerkt.", pending: false }
            : m
        ),
        ui: { ...state.ui, streamConnected: false, streamMode: null, lastError: undefined },
      }
    case "overview_done":
      return {
        ...state,
        status: action.done.status,
        overview: normalizeOverview(action.done.overview),
        ui: { ...state.ui, streamConnected: false, streamMode: null, lastError: undefined },
      }
    case "stream_error":
      return { ...state, ui: { ...state.ui, streamConnected: false, streamMode: null, sendingFeedback: false, approving: false, lastError: action.message } }
    case "approve_start":
      return { ...state, ui: { ...state.ui, approving: true, lastError: undefined } }
    case "approve_success":
      return {
        ...state,
        status: action.lesplan.status,
        overview: normalizeOverview(action.lesplan.overview) ?? state.overview,
        lessons: action.lesplan.overview?.lessons ?? state.lessons,
        feedbackMessages: mapFeedbackMessages(action.lesplan.feedback_messages),
        ui: { ...state.ui, approving: false, pollingLessons: true },
      }
    case "approve_failed":
      return { ...state, ui: { ...state.ui, approving: false, lastError: action.error } }
    case "set_polling":
      return { ...state, ui: { ...state.ui, pollingLessons: action.active } }
    case "clear_error":
      return { ...state, ui: { ...state.ui, lastError: undefined } }
    default:
      return state
  }
}

function buildSourceContext(
  lesplan: LesplanResponse,
  context: {
    bookTitle?: string
    bookCoverUrl?: string
    subjectName?: string
    methodTitle?: string
    level?: string
    schoolYear?: string
    classSize?: number
    difficulty?: string | null
    selectedParagraphs?: SourceContext["selectedParagraphs"]
  }
): SourceContext {
  return {
    bookTitle: context.bookTitle,
    bookCoverUrl: context.bookCoverUrl,
    subjectName: context.subjectName,
    methodTitle: context.methodTitle,
    level: context.level,
    schoolYear: context.schoolYear,
    classSize: context.classSize,
    difficulty: context.difficulty,
    selectedParagraphs: context.selectedParagraphs,
  }
}

export function meta() {
  return [{ title: "Lesplan werkruimte — Planwijs" }]
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = requireAuthContext(request)
  const lesplan = await getLesplan(token, params.requestId)

  if (!lesplan) {
    throw new Response("Lesplan not found", { status: 404 })
  }

  const [classroom, bookDetail] = await Promise.all([
    getClass(token, lesplan.class_id),
    getBookDetail(token, lesplan.book_id),
  ])

  const method = bookDetail?.method_id ? await getMethod(token, bookDetail.method_id) : null
  const paragraphsById = new Map(
    (bookDetail?.chapters ?? []).flatMap((chapter) =>
      chapter.paragraphs.map((paragraph) => [
        paragraph.id,
        { id: paragraph.id, title: paragraph.title, synopsis: paragraph.synopsis, index: paragraph.index },
      ])
    )
  )

  const sourceContext = buildSourceContext(lesplan, {
    bookTitle: bookDetail?.title,
    bookCoverUrl: bookDetail?.cover_url ?? undefined,
    subjectName: bookDetail?.subject_name ?? undefined,
    methodTitle: method?.title,
    level: classroom?.level,
    schoolYear: classroom?.school_year,
    classSize: classroom?.size,
    difficulty: classroom?.difficulty ?? undefined,
    selectedParagraphs: lesplan.selected_paragraph_ids.map((id) => paragraphsById.get(id) ?? { id, title: id }),
  })

  return {
    requestId: lesplan.id,
    updatedAt: lesplan.updated_at,
    lesplan,
    request: {
      userId: lesplan.user_id,
      classId: lesplan.class_id,
      bookId: lesplan.book_id,
      selectedParagraphIds: lesplan.selected_paragraph_ids,
      numLessons: lesplan.num_lessons,
      lessonDurationMinutes: lesplan.lesson_duration_minutes,
    },
    sourceContext,
  } satisfies LesplanWorkspaceLoaderData
}

export async function action({ request, params }: Route.ActionArgs) {
  const { token } = requireAuthContext(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "feedback") {
    const message = formData.get("message")
    if (typeof message !== "string" || message.trim().length === 0) {
      return data<ActionData>({ intent: "feedback", ok: false, error: "Voer eerst feedback in." }, { status: 400 })
    }
    try {
      const lesplan = await submitFeedback(token, params.requestId, { message: message.trim() })
      return data<ActionData>({ intent: "feedback", ok: true, lesplan })
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return data<ActionData>({ intent: "feedback", ok: false, error: error.message }, { status: error.status })
      }
      return data<ActionData>({ intent: "feedback", ok: false, error: "De feedback kon niet worden verstuurd." }, { status: 500 })
    }
  }

  if (intent === "approve") {
    try {
      const lesplan = await approveLesplan(token, params.requestId)
      return data<ActionData>({ intent: "approve", ok: true, lesplan })
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return data<ActionData>({ intent: "approve", ok: false, error: error.message }, { status: error.status })
      }
      return data<ActionData>({ intent: "approve", ok: false, error: "Het overzicht kon niet worden goedgekeurd." }, { status: 500 })
    }
  }

  return data<ActionData>({ intent: "feedback", ok: false, error: "Onbekende actie." }, { status: 400 })
}

const REVIEW_TABS = [
  { id: "overview", label: "Overzicht" },
  { id: "sequence", label: "Lessenreeks" },
  { id: "notes", label: "Docentnotities" },
  { id: "approval", label: "Goedkeuren" },
] as const

type ReviewTabId = (typeof REVIEW_TABS)[number]["id"]

const REVIEW_STATUS_MODEL = [
  { id: "concept", label: "Concept gegenereerd" },
  { id: "review", label: "Wacht op review" },
  { id: "ready", label: "Klaar voor goedkeuring" },
  { id: "approved", label: "Goedgekeurd" },
] as const

type ReviewModelStepId = (typeof REVIEW_STATUS_MODEL)[number]["id"]

type LessonOutlineViewItem = LessonOutlineItem

function getReviewModelStep(status: LesplanPageState["status"]): ReviewModelStepId {
  if (status === "overview_ready") return "ready"
  if (status === "revising_overview") return "review"
  if (status === "generating_lessons" || status === "completed") return "approved"
  return "concept"
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trim()}…`
}

function splitSentences(value: string): string[] {
  return (value.match(/[^.!?]+[.!?]?/g) ?? []).map((part) => part.trim()).filter(Boolean)
}

function splitIntoParagraphs(value: string, sentencesPerParagraph = 2): string[] {
  const sentences = splitSentences(value)
  if (sentences.length === 0) return []
  const chunks: string[] = []
  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    chunks.push(sentences.slice(index, index + sentencesPerParagraph).join(" "))
  }
  return chunks
}

function compactKnowledgeLabel(item: string): string {
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

function deriveLessonTags(item: LessonOutlineViewItem, keyKnowledge: string[]): string[] {
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

function summarizeBuildsOn(buildsOn: string): string {
  if (!buildsOn.trim()) return "Bouwt voort op eerdere context uit de reeks."
  const lessonMatch = buildsOn.match(/les\s*\d+/i)
  if (lessonMatch) return `Bouwt voort op ${lessonMatch[0].toLowerCase()}.`
  return `Bouwt voort op ${truncateText(buildsOn, 78)}`
}

function buildSeriesSummary(overview: LesplanOverviewState, numLessons: number) {
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

function getReviewStatusLabel(status: LesplanPageState["status"]): string {
  const step = getReviewModelStep(status)
  return REVIEW_STATUS_MODEL.find((item) => item.id === step)?.label ?? "Concept gegenereerd"
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">{children}</p>
  )
}

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "unordered_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }

type MarkdownListType = "unordered_list" | "ordered_list"

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const normalized = value.replace(/\r\n?/g, "\n").trim()
  if (!normalized) return []

  const blocks: MarkdownBlock[] = []
  const lines = normalized.split("\n")
  let paragraphLines: string[] = []
  let listItems: string[] = []
  let listType: MarkdownListType | null = null

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ").trim() })
    paragraphLines = []
  }

  const flushList = () => {
    if (listType === null || listItems.length === 0) {
      listType = null
      listItems = []
      return
    }
    blocks.push({ type: listType, items: [...listItems] })
    listType = null
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType !== "unordered_list") flushList()
      listType = "unordered_list"
      listItems.push(unorderedMatch[1].trim())
      continue
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType !== "ordered_list") flushList()
      listType = "ordered_list"
      listItems.push(orderedMatch[1].trim())
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

function renderInlineMarkdown(value: string): React.ReactNode[] {
  const pattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*[^*\n]+\*|_[^_\n]+_)/g
  const nodes: React.ReactNode[] = []
  let cursor = 0
  let index = 0

  for (const match of value.matchAll(pattern)) {
    const token = match[0]
    const matchIndex = match.index ?? 0
    if (matchIndex > cursor) {
      nodes.push(value.slice(cursor, matchIndex))
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkMatch) {
      nodes.push(
        <a
          key={`md-link-${index}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold text-[#2a14b4] hover:text-[#4338ca] underline decoration-[#2a14b4]/40"
        >
          {linkMatch[1]}
        </a>
      )
      cursor = matchIndex + token.length
      index += 1
      continue
    }

    if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={`md-strong-${index}`} className="font-semibold text-[#0b1c30]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`md-code-${index}`} className="rounded bg-[#eff4ff] px-1.5 py-0.5 text-[0.85em] text-[#2a14b4]">
          {token.slice(1, -1)}
        </code>
      )
    } else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      nodes.push(<em key={`md-em-${index}`}>{token.slice(1, -1)}</em>)
    } else {
      nodes.push(token)
    }

    cursor = matchIndex + token.length
    index += 1
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor))
  }

  return nodes
}

function SeriesSummaryMarkdown({ value }: { value: string }) {
  const blocks = parseMarkdownBlocks(value)
  if (blocks.length === 0) return null

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "paragraph") {
          return (
            <p key={`paragraph-${blockIndex}`} className="text-sm leading-7 text-[#464554] font-medium">
              {renderInlineMarkdown(block.text)}
            </p>
          )
        }

        const ListTag = block.type === "ordered_list" ? "ol" : "ul"
        return (
          <ListTag
            key={`list-${blockIndex}`}
            className={[
              "space-y-2 text-sm leading-6 text-[#464554] pl-5",
              block.type === "ordered_list" ? "list-decimal" : "list-disc",
            ].join(" ")}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
            ))}
          </ListTag>
        )
      })}
    </div>
  )
}

export default function LessonSeriesReviewPage() {
  const loaderData = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()
  const [state, dispatch] = useReducer(reducer, loaderData, buildStateFromLoaderData)
  const [feedbackText, setFeedbackText] = useState("")
  const [activeTab, setActiveTab] = useState<ReviewTabId>("overview")
  const feedbackInputRef = useRef<HTMLTextAreaElement | null>(null)
  const feedbackFetcher = useFetcher<ActionData>()
  const approveFetcher = useFetcher<ActionData>()
  const streamRef = useRef<StreamRef | null>(null)
  const pendingFeedbackRef = useRef<PendingFeedbackRequest | null>(null)
  const revisionPlaceholderRef = useRef<string | null>(null)
  const pollingStartedAtRef = useRef<number | null>(null)
  const hydratedAt = useMemo(() => loaderData.updatedAt, [loaderData.updatedAt])

  useEffect(() => {
    dispatch({ type: "hydrate", payload: loaderData })
  }, [hydratedAt, loaderData])

  useEffect(() => {
    if (feedbackFetcher.state !== "idle" || !feedbackFetcher.data) return
    if (feedbackFetcher.data.intent !== "feedback" || !pendingFeedbackRef.current) return
    const pending = pendingFeedbackRef.current
    pendingFeedbackRef.current = null
    if (!feedbackFetcher.data.ok || !feedbackFetcher.data.lesplan) {
      dispatch({
        type: "feedback_submit_failed",
        teacherId: pending.teacherId,
        placeholderId: pending.placeholderId,
        error: feedbackFetcher.data.error ?? "De feedback kon niet worden verstuurd.",
      })
      return
    }
    revisionPlaceholderRef.current = pending.placeholderId
    dispatch({ type: "feedback_submit_ack", lesplan: feedbackFetcher.data.lesplan, placeholderId: pending.placeholderId })
  }, [feedbackFetcher.state, feedbackFetcher.data])

  useEffect(() => {
    if (approveFetcher.state !== "idle" || !approveFetcher.data) return
    if (approveFetcher.data.intent !== "approve") return
    if (!approveFetcher.data.ok || !approveFetcher.data.lesplan) {
      dispatch({ type: "approve_failed", error: approveFetcher.data.error ?? "Het overzicht kon niet worden goedgekeurd." })
      return
    }
    dispatch({ type: "approve_success", lesplan: approveFetcher.data.lesplan })
  }, [approveFetcher.state, approveFetcher.data])

  const streamTargetMode: "overview" | "revision" | null =
    state.status === "pending" || state.status === "generating_overview"
      ? "overview"
      : state.status === "revising_overview"
      ? "revision"
      : null

  useEffect(() => {
    if (!streamTargetMode) {
      streamRef.current?.close()
      streamRef.current = null
      return
    }

    if (streamRef.current?.mode === streamTargetMode) return
    streamRef.current?.close()
    dispatch({ type: "stream_connecting", mode: streamTargetMode })

    let placeholderId = revisionPlaceholderRef.current
    if (streamTargetMode === "revision" && !placeholderId) {
      placeholderId = `assistant-${Date.now()}`
      revisionPlaceholderRef.current = placeholderId
      dispatch({ type: "ensure_revision_placeholder", placeholderId })
    }

    const close = openEventSource<StatusEvent, Record<string, unknown>, LesplanDoneEvent>({
      url:
        streamTargetMode === "overview"
          ? `/api/lesplan/${state.requestId}/stream-overview`
          : `/api/lesplan/${state.requestId}/stream-revision`,
      onStatus: (payload) => {
        dispatch({ type: "stream_connected", status: payload.status })
      },
      onPartial: (payload) => {
        dispatch({ type: "stream_partial", partial: mapPartialPayload(payload) })
      },
      onDone: (payload) => {
        streamRef.current?.close()
        streamRef.current = null
        if (streamTargetMode === "revision" && placeholderId) {
          dispatch({ type: "revision_done", done: payload, placeholderId })
          revisionPlaceholderRef.current = null
        } else {
          dispatch({ type: "overview_done", done: payload })
        }
        revalidator.revalidate()
      },
      onError: (message) => {
        streamRef.current?.close()
        streamRef.current = null
        dispatch({ type: "stream_error", message })
        revalidator.revalidate()
      },
    })

    streamRef.current = { mode: streamTargetMode, close }
    return () => {
      if (streamRef.current?.close === close) {
        streamRef.current.close()
        streamRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.requestId, streamTargetMode])

  const shouldPollLesplan =
    state.status === "pending" ||
    state.status === "generating_overview" ||
    state.status === "revising_overview" ||
    state.status === "generating_lessons" ||
    (state.status === "completed" && state.lessons.length < state.request.numLessons)

  useEffect(() => {
    if (!shouldPollLesplan) {
      pollingStartedAtRef.current = null
      dispatch({ type: "set_polling", active: false })
      return
    }
    dispatch({ type: "set_polling", active: true })
    if (pollingStartedAtRef.current === null) pollingStartedAtRef.current = Date.now()
    let cancelled = false
    let timerId: number | undefined
    const schedule = () => {
      if (cancelled || pollingStartedAtRef.current === null) return
      const elapsed = Date.now() - pollingStartedAtRef.current
      timerId = window.setTimeout(() => {
        if (cancelled) return
        revalidator.revalidate()
        schedule()
      }, elapsed < 20_000 ? 2_000 : 5_000)
    }
    schedule()
    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
    }
  }, [shouldPollLesplan, revalidator, state.lessons.length, state.request.numLessons])

  function handleFeedbackSubmit() {
    const message = feedbackText.trim()
    if (!message || state.status !== "overview_ready" || feedbackFetcher.state !== "idle") return
    const teacherId = `teacher-${Date.now()}`
    const placeholderId = `assistant-${Date.now()}`
    pendingFeedbackRef.current = { teacherId, placeholderId }
    revisionPlaceholderRef.current = placeholderId
    dispatch({ type: "feedback_submit_start", teacherId, teacherContent: message, placeholderId })
    setFeedbackText("")
    const formData = new FormData()
    formData.set("intent", "feedback")
    formData.set("message", message)
    feedbackFetcher.submit(formData, { method: "post" })
  }

  function handleApprove() {
    if (state.status !== "overview_ready" || approveFetcher.state !== "idle") return
    dispatch({ type: "approve_start" })
    const formData = new FormData()
    formData.set("intent", "approve")
    approveFetcher.submit(formData, { method: "post" })
  }

  function focusFeedbackField() {
    window.setTimeout(() => feedbackInputRef.current?.focus(), 0)
  }

  function openApprovalTabWithDraft(draft?: string) {
    setActiveTab("approval")
    if (draft && feedbackText.trim().length === 0) {
      setFeedbackText(draft)
    }
    focusFeedbackField()
  }

  const isStreaming =
    state.status === "pending" || state.status === "generating_overview" || state.status === "revising_overview"
  const canReview = state.status === "overview_ready"
  const isFailed = state.status === "failed"
  const isGeneratingLessons = state.status === "generating_lessons"
  const isCompleted = state.status === "completed"
  const statusCopy = STATUS_COPY[state.status]
  const reviewStatusLabel = getReviewStatusLabel(state.status)
  const teacherFeedbackCount = state.feedbackMessages.filter((message) => message.role === "teacher" && !message.pending).length
  const hasRevisions = state.feedbackMessages.some((message) => message.role === "assistant" && !message.pending)

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#e8eeff] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/plans"
            className="flex items-center gap-1.5 text-sm font-semibold text-[#5c5378] hover:text-[#0b1c30] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Plannen
          </Link>
          <span className="text-[#c7c4d7]">·</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCopy.color}`}>
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {statusCopy.label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={!canReview || approveFetcher.state !== "idle" || state.ui.approving}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {state.ui.approving || approveFetcher.state !== "idle" ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Reeks goedkeuren
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/lesplan/new">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Nieuw lesplan
            </Link>
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: SOFT_EASE }}
        className="px-8 py-8 max-w-5xl space-y-6"
      >
        {state.ui.lastError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: SOFT_EASE }}
            className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 font-medium flex-1">{state.ui.lastError}</p>
            <button
              onClick={() => dispatch({ type: "clear_error" })}
              className="text-red-400 hover:text-red-600 font-bold text-xs"
            >
              Sluiten
            </button>
          </motion.div>
        )}

        <LessonSeriesHeader
          title={state.overview?.title}
          bookCoverUrl={state.sourceContext.bookCoverUrl}
          bookTitle={state.sourceContext.bookTitle}
        />
      </motion.div>

      <LessonSeriesTabNav activeTab={activeTab} onChange={setActiveTab} />

      <div className="px-8 py-6 max-w-5xl">
        <TabPanel id="overview" activeTab={activeTab}>
          <OverviewTab
            overview={state.overview}
            request={state.request}
            sourceContext={state.sourceContext}
            isStreaming={isStreaming}
            reviewStatusLabel={reviewStatusLabel}
          />
        </TabPanel>

        <TabPanel id="sequence" activeTab={activeTab}>
          <LessonSequenceTab
            overview={state.overview}
            lessons={state.lessons}
            requestId={state.requestId}
            expectedLessonCount={state.request.numLessons}
            isStreaming={isStreaming}
            isGeneratingLessons={isGeneratingLessons}
          />
        </TabPanel>

        <TabPanel id="notes" activeTab={activeTab}>
          <TeacherNotesTab overview={state.overview} isStreaming={isStreaming} />
        </TabPanel>

        <TabPanel id="approval" activeTab={activeTab}>
          <ApprovalTab
            status={state.status}
            statusCopy={statusCopy}
            request={state.request}
            overview={state.overview}
            canReview={canReview}
            approving={state.ui.approving || approveFetcher.state !== "idle"}
            onApprove={handleApprove}
            onRegenerate={() =>
              openApprovalTabWithDraft("Genereer deze reeks opnieuw met een alternatieve opbouw en andere focus per les.")
            }
            onEditBeforeApprove={() => openApprovalTabWithDraft()}
            feedbackMessages={state.feedbackMessages}
            feedbackText={feedbackText}
            setFeedbackText={setFeedbackText}
            onFeedbackSubmit={handleFeedbackSubmit}
            feedbackDisabled={!canReview || state.ui.sendingFeedback || state.ui.approving}
            feedbackReadOnly={isGeneratingLessons || isCompleted || isFailed}
            feedbackSending={feedbackFetcher.state !== "idle" || state.ui.sendingFeedback}
            feedbackInputRef={feedbackInputRef}
            hasRevisions={hasRevisions}
            teacherFeedbackCount={teacherFeedbackCount}
            requestId={state.requestId}
            lessons={state.lessons}
            isGeneratingLessons={isGeneratingLessons}
            isCompleted={isCompleted}
          />
        </TabPanel>
      </div>
    </div>
  )
}

function LessonSeriesHeader({
  title,
  bookCoverUrl,
  bookTitle,
}: {
  title?: string
  bookCoverUrl?: string
  bookTitle?: string
}) {
  return (
    <section className="bg-white rounded-3xl p-6 shadow-[0px_18px_36px_rgba(11,28,48,0.08)] border border-[#e8eeff]">
      <div className="flex items-start gap-4">
        {bookCoverUrl ? (
          <img
            src={bookCoverUrl}
            alt={bookTitle ? `Boekcover van ${bookTitle}` : "Boekcover"}
            className="w-14 h-20 md:w-16 md:h-24 rounded-lg object-cover border border-[#e8eeff] shadow-sm shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-20 md:w-16 md:h-24 rounded-lg bg-[#eff4ff] border border-[#e8eeff] shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0">
          {title ? (
            <h1 className="text-4xl font-bold tracking-tight text-[#0b1c30] leading-tight">{title}</h1>
          ) : (
            <div className="h-10 w-2/3 rounded-xl bg-[#eff4ff] animate-pulse" />
          )}

          <p className="mt-4 text-sm text-[#464554] leading-6 max-w-3xl">
            Controleer deze lessenreeks. Na goedkeuring worden gedetailleerde lessen met tijdsblokken gegenereerd.
          </p>
        </div>
      </div>
    </section>
  )
}

function LessonSeriesTabNav({
  activeTab,
  onChange,
}: {
  activeTab: ReviewTabId
  onChange: (tab: ReviewTabId) => void
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = REVIEW_TABS.findIndex((tab) => tab.id === activeTab)
    if (currentIndex < 0) return

    let nextIndex = currentIndex
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % REVIEW_TABS.length
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + REVIEW_TABS.length) % REVIEW_TABS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = REVIEW_TABS.length - 1

    if (nextIndex === currentIndex) return
    event.preventDefault()
    const nextTab = REVIEW_TABS[nextIndex]
    onChange(nextTab.id)
    window.setTimeout(() => document.getElementById(`review-tab-${nextTab.id}`)?.focus(), 0)
  }

  return (
    <div className="sticky top-[57px] z-10 bg-[#f8f9ff]/90 backdrop-blur-sm border-b border-[#e8eeff]">
      <div
        role="tablist"
        aria-label="Lessenreeks review tabs"
        onKeyDown={handleKeyDown}
        className="px-8 py-2 max-w-5xl flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {REVIEW_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`review-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`review-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                isActive
                  ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_2px_8px_rgba(42,20,180,0.2)]"
                  : "text-[#5c5378] hover:text-[#0b1c30] hover:bg-[#eff4ff]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabPanel({
  id,
  activeTab,
  children,
}: {
  id: ReviewTabId
  activeTab: ReviewTabId
  children: React.ReactNode
}) {
  return (
    <section
      id={`review-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`review-tab-${id}`}
      hidden={activeTab !== id}
      className={activeTab === id ? "space-y-5" : "hidden"}
    >
      {children}
    </section>
  )
}

function OverviewTab({
  overview,
  request,
  sourceContext,
  isStreaming,
  reviewStatusLabel,
}: {
  overview: LesplanOverviewState
  request: LesplanPageState["request"]
  sourceContext: SourceContext
  isStreaming: boolean
  reviewStatusLabel: string
}) {
  const [showAllKnowledge, setShowAllKnowledge] = useState(false)
  const goals = (overview?.learning_goals ?? []).filter((goal) => goal.trim().length > 0)
  const keyKnowledge = (overview?.key_knowledge ?? []).filter((entry) => entry.trim().length > 0)
  const visibleKnowledge = showAllKnowledge ? keyKnowledge : keyKnowledge.slice(0, 5)
  const hiddenKnowledgeCount = Math.max(keyKnowledge.length - 5, 0)
  const summary = buildSeriesSummary(overview, request.numLessons)
  const showGoals = !isStreaming && goals.length > 0
  const showKeyKnowledge = !isStreaming && keyKnowledge.length > 0

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff] space-y-4">
        <SectionLabel>Seriesamenvatting</SectionLabel>
        {overview ? (
          <>
            <SeriesSummaryMarkdown value={summary.summary} />

          </>
        ) : (
          <SkeletonLines streaming={isStreaming} lines={4} />
        )}
      </section>

      <div className="space-y-5">
        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="mb-4">
            <SectionLabel>Leerdoelen</SectionLabel>
          </div>
          {showGoals ? (
            <ul className="space-y-2.5">
              {goals.map((goal, index) => (
                <li key={`${goal}-${index}`} className="flex items-start gap-2.5 text-sm text-[#464554] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          ) : (
            <SkeletonLines streaming={isStreaming} lines={4} />
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <SectionLabel>Kernkennis</SectionLabel>
            {hiddenKnowledgeCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllKnowledge((current) => !current)}
                className="text-xs font-semibold text-[#2a14b4] hover:text-[#4338ca]"
              >
                {showAllKnowledge ? "Toon minder" : `Toon ${hiddenKnowledgeCount} meer`}
              </button>
            )}
          </div>
          {showKeyKnowledge ? (
            <ul className="space-y-3">
              {visibleKnowledge.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="rounded-xl border border-[#dce7ff] bg-[#f8fbff] px-3.5 py-2.5 text-sm leading-6 text-[#394055]"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <SkeletonTags streaming={isStreaming} />
          )}
        </section>
      </div>

      <section className="rounded-2xl p-5 border border-[#d7e3ff] bg-[#eff4ff]">
        <SectionLabel>Volgende stap</SectionLabel>
        <p className="text-sm text-[#3c3c52] leading-6 mt-2">
          Na goedkeuring wordt voor elke les een uitgewerkte les gegenereerd met tijdsblokken, werkvormen en lesfasen.
        </p>
      </section>
    </div>
  )
}

function SeriesStatsRow({
  request,
  sourceContext,
  reviewStatusLabel,
}: {
  request: LesplanPageState["request"]
  sourceContext: SourceContext
  reviewStatusLabel: string
}) {
  const stats = [
    { label: "Lessen", value: String(request.numLessons) },
    { label: "Vak", value: sourceContext.subjectName ?? "Onbekend" },
    { label: "Leerjaar", value: sourceContext.schoolYear ?? "Onbekend" },
    { label: "Leerlingen", value: sourceContext.classSize ? String(sourceContext.classSize) : "Onbekend" },
    { label: "Status", value: reviewStatusLabel },
  ]

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="bg-white rounded-xl border border-[#e8eeff] px-4 py-3 shadow-[0px_6px_16px_rgba(11,28,48,0.05)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70">{stat.label}</p>
          <p className="text-sm font-semibold text-[#0b1c30] mt-1">{stat.value}</p>
        </article>
      ))}
    </section>
  )
}

function LessonSequenceTab({
  overview,
  lessons,
  requestId,
  expectedLessonCount,
  isStreaming,
  isGeneratingLessons,
}: {
  overview: LesplanOverviewState
  lessons: LesplanPageState["lessons"]
  requestId: string
  expectedLessonCount: number
  isStreaming: boolean
  isGeneratingLessons: boolean
}) {
  const [expandedLessons, setExpandedLessons] = useState<number[]>([])
  const items = overview?.lesson_outline ?? []
  const keyKnowledge = overview?.key_knowledge ?? []
  const showLessonOutline = !isStreaming && items.length >= expectedLessonCount

  function toggleExpanded(lessonNumber: number) {
    setExpandedLessons((current) =>
      current.includes(lessonNumber)
        ? current.filter((value) => value !== lessonNumber)
        : [...current, lessonNumber]
    )
  }

  return (
    <div className="space-y-4">
      

      {isGeneratingLessons ? (
        <section className="rounded-2xl bg-blue-50 p-5 flex items-center gap-3 border border-blue-100">
          <LoaderCircle className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          <p className="text-sm text-blue-700 font-medium">
            Deze reeks is goedgekeurd. De uitgewerkte lessen worden nu op de achtergrond gegenereerd.
          </p>
        </section>) : (<
          section className="rounded-2xl p-5 border border-[#d7e3ff] bg-[#eff4ff]">
        <p className="text-sm text-[#3c3c52] leading-6 font-medium">
          Beoordeel of de opbouw van de lessen logisch is voordat je de reeks goedkeurt.
        </p>
      </section>)
      }

      {showLessonOutline ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <LessonSequenceCard
              key={item.lesson_number}
              item={item}
              index={index}
              total={items.length}
              requestId={requestId}
              linkedLesson={lessons.find((lesson) => lesson.lesson_number === item.lesson_number)}
              tags={deriveLessonTags(item, keyKnowledge)}
              expanded={expandedLessons.includes(item.lesson_number)}
              onToggle={() => toggleExpanded(item.lesson_number)}
            />
          ))}
        </div>
      ) : (
        <SkeletonLessonCards streaming={isStreaming} />
      )}
    </div>
  )
}

function LessonSequenceCard({
  item,
  index,
  total,
  requestId,
  linkedLesson,
  tags,
  expanded,
  onToggle,
}: {
  item: LessonOutlineViewItem
  index: number
  total: number
  requestId: string
  linkedLesson?: { id: string; lesson_number: number }
  tags: string[]
  expanded: boolean
  onToggle: () => void
}) {
  const summary = truncateText(splitSentences(item.description).slice(0, 2).join(" "), 220)
  const teachingHint = truncateText(
    item.teaching_approach_hint ??
      "Korte activering, gerichte uitleg, begeleide verwerking en een afsluitende check op begrip.",
    180
  )

  return (
    <article className="relative">
      {index < total - 1 && (
        <div className="absolute left-[17px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-[#2a14b4]/20 to-[#2a14b4]/5" />
      )}
      <div className="relative flex gap-4">
        <div className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white flex items-center justify-center text-sm font-bold shadow-[0px_4px_12px_rgba(42,20,180,0.25)]">
          {item.lesson_number}
        </div>

        <div className="flex-1 min-w-0 bg-white rounded-2xl p-5 shadow-[0px_8px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70 mb-1">
                Les {item.lesson_number}
              </p>
              <h3 className="font-bold text-[#0b1c30] text-sm leading-snug">{item.subject_focus}</h3>
            </div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                linkedLesson ? "bg-emerald-50 text-emerald-700" : "bg-[#eff4ff] text-[#5c5378]"
              }`}
            >
              {linkedLesson ? "Uitgewerkt" : "Voorstel"}
            </span>
          </div>

          <p className="mt-2 text-sm text-[#464554] leading-6">{summary || "Nog geen samenvatting beschikbaar."}</p>
          <p className="mt-2 text-xs text-[#2a14b4]/85 leading-5">
            <span className="font-semibold">Aanpak:</span> {teachingHint}
          </p>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-[#f3f0ff] text-[#2a14b4] px-2.5 py-1 text-[11px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-[#5c5378]/80 font-medium">{summarizeBuildsOn(item.builds_on)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d7dff8] px-2.5 py-1.5 text-xs font-semibold text-[#2a14b4] hover:bg-[#eff4ff]"
            >
              {expanded ? "Minder context" : "Meer context"}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
            {linkedLesson && (
              <Link
                to={`/lesplan/${requestId}/les/${linkedLesson.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d7dff8] px-2.5 py-1.5 text-xs font-semibold text-[#5c5378] hover:bg-[#eff4ff]"
              >
                Bekijk les
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {expanded && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-[#f8f9ff] border border-[#e8eeff] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5c5378]/70">Lesintentie</p>
                <p className="mt-1.5 text-xs text-[#464554] leading-5">
                  {truncateText(item.lesson_intention ?? item.description, 180)}
                </p>
              </div>
              <div className="rounded-xl bg-[#f8f9ff] border border-[#e8eeff] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5c5378]/70">Eindbegrip</p>
                <p className="mt-1.5 text-xs text-[#464554] leading-5">
                  {truncateText(
                    item.end_understanding ?? `Leerlingen begrijpen de kern van ${item.subject_focus.toLowerCase()}.`,
                    160
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-[#f8f9ff] border border-[#e8eeff] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5c5378]/70">Plaats in reeks</p>
                <p className="mt-1.5 text-xs text-[#464554] leading-5">
                  {truncateText(item.sequence_rationale ?? item.builds_on, 170)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function TeacherNotesTab({
  overview,
  isStreaming,
}: {
  overview: LesplanOverviewState
  isStreaming: boolean
}) {
  return (
    <div className="space-y-4">
      <TeacherNotesSection
        title="Leerlijn"
        icon={BookOpen}
        content={overview?.learning_progression}
        isStreaming={isStreaming}
        defaultOpen
      />
      <TeacherNotesSection
        title="Aanbevolen aanpak"
        icon={Lightbulb}
        content={overview?.recommended_approach}
        isStreaming={isStreaming}
      />
      <TeacherNotesSection
        title="Didactische aanpak"
        icon={GraduationCap}
        content={overview?.didactic_approach}
        isStreaming={isStreaming}
      />
    </div>
  )
}

function TeacherNotesSection({
  title,
  icon: Icon,
  content,
  isStreaming,
  defaultOpen,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  content?: string
  isStreaming: boolean
  defaultOpen?: boolean
}) {
  const paragraphs = content ? splitIntoParagraphs(content, 2) : []

  return (
    <details
      open={defaultOpen}
      className="group bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]"
    >
      <summary className="list-none flex items-center justify-between gap-4 cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eff4ff] text-[#2a14b4]">
            <Icon className="w-3.5 h-3.5" />
          </span>
          <SectionLabel>{title}</SectionLabel>
        </div>
        <ChevronRight className="w-4 h-4 text-[#5c5378] transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-4 max-w-3xl space-y-3">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <p key={`${title}-${index}`} className="text-sm text-[#464554] leading-7">
              {paragraph}
            </p>
          ))
        ) : (
          <SkeletonLines streaming={isStreaming} lines={4} />
        )}
        {!isStreaming && paragraphs.length === 0 && (
          <p className="text-sm text-[#5c5378]/70">Nog geen notities beschikbaar voor dit onderdeel.</p>
        )}
      </div>
    </details>
  )
}

function ApprovalTab({
  status,
  statusCopy,
  request,
  overview,
  canReview,
  approving,
  onApprove,
  onRegenerate,
  onEditBeforeApprove,
  feedbackMessages,
  feedbackText,
  setFeedbackText,
  onFeedbackSubmit,
  feedbackDisabled,
  feedbackReadOnly,
  feedbackSending,
  feedbackInputRef,
  hasRevisions,
  teacherFeedbackCount,
  requestId,
  lessons,
  isGeneratingLessons,
  isCompleted,
}: {
  status: LesplanPageState["status"]
  statusCopy: { label: string; color: string }
  request: LesplanPageState["request"]
  overview: LesplanOverviewState
  canReview: boolean
  approving: boolean
  onApprove: () => void
  onRegenerate: () => void
  onEditBeforeApprove: () => void
  feedbackMessages: LesplanThreadMessage[]
  feedbackText: string
  setFeedbackText: (value: string) => void
  onFeedbackSubmit: () => void
  feedbackDisabled: boolean
  feedbackReadOnly: boolean
  feedbackSending: boolean
  feedbackInputRef: React.RefObject<HTMLTextAreaElement | null>
  hasRevisions: boolean
  teacherFeedbackCount: number
  requestId: string
  lessons: LesplanPageState["lessons"]
  isGeneratingLessons: boolean
  isCompleted: boolean
}) {
  const lessonCount = overview?.lesson_outline?.length ?? request.numLessons
  const reviewStep = getReviewModelStep(status)
  const readiness = overview?.approval_readiness
  const goalCoverage = overview?.goal_coverage ?? []
  const knowledgeCoverage = overview?.knowledge_coverage ?? []

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <SectionLabel>Huidige status</SectionLabel>
          <p className="mt-2 text-lg font-bold text-[#0b1c30]">{statusCopy.label}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatusMetric label="Lessen in reeks" value={String(lessonCount)} />
            <StatusMetric label="Feedback aanwezig" value={teacherFeedbackCount > 0 ? "Ja" : "Nee"} />
            <StatusMetric label="Wijzigingen verwerkt" value={hasRevisions ? "Ja" : "Nee"} />
            <StatusMetric label="Statusmodel" value={getReviewStatusLabel(status)} />
          </div>
        </article>

        <article className="bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <SectionLabel>Statusmodel</SectionLabel>
          <div className="mt-3 grid gap-2">
            {REVIEW_STATUS_MODEL.map((step) => {
              const active = step.id === reviewStep
              const completed =
                REVIEW_STATUS_MODEL.findIndex((candidate) => candidate.id === step.id) <
                REVIEW_STATUS_MODEL.findIndex((candidate) => candidate.id === reviewStep)
              return (
                <div
                  key={step.id}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    active
                      ? "bg-[#2a14b4] text-white"
                      : completed
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#eff4ff] text-[#5c5378]"
                  }`}
                >
                  {step.label}
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <SectionLabel>Wat gebeurt er na goedkeuring</SectionLabel>
        <ul className="mt-3 space-y-2 text-sm text-[#464554] leading-6">
          <li>Na goedkeuring wordt voor elke les een uitgewerkte les gemaakt.</li>
          <li>Deze uitgewerkte lessen bevatten tijdsblokken, lesfasen en concrete werkvormen.</li>
          <li>Daarna kun je elke les apart bekijken en bewerken.</li>
        </ul>
      </section>

      {(readiness || goalCoverage.length > 0 || knowledgeCoverage.length > 0) && (
        <section className="bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff] space-y-4">
          <SectionLabel>Beoordelingsdata</SectionLabel>
          {readiness && (
            <div className="rounded-xl border border-[#e8eeff] bg-[#f8f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1c30]">
                Agent-inschatting: {readiness.ready_for_approval ? "klaar voor goedkeuring" : "nog aandacht nodig"}
              </p>
              {readiness.rationale && <p className="mt-1 text-sm text-[#464554] leading-6">{readiness.rationale}</p>}
              {readiness.checklist.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-[#5c5378]">
                  {readiness.checklist.slice(0, 4).map((item, index) => (
                    <li key={`${item}-${index}`}>• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {goalCoverage.length > 0 && (
              <div className="rounded-xl border border-[#e8eeff] bg-[#f8f9ff] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c5378]/70">Dekking leerdoelen</p>
                <ul className="mt-2 space-y-1.5 text-sm text-[#464554]">
                  {goalCoverage.slice(0, 4).map((item, index) => (
                    <li key={`${item.goal}-${index}`}>
                      {truncateText(item.goal, 85)}{" "}
                      <span className="text-[#5c5378]/70">({item.lesson_numbers.join(", ") || "geen les"})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {knowledgeCoverage.length > 0 && (
              <div className="rounded-xl border border-[#e8eeff] bg-[#f8f9ff] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c5378]/70">Dekking kernkennis</p>
                <ul className="mt-2 space-y-1.5 text-sm text-[#464554]">
                  {knowledgeCoverage.slice(0, 4).map((item, index) => (
                    <li key={`${item.knowledge}-${index}`}>
                      {truncateText(item.knowledge, 85)}{" "}
                      <span className="text-[#5c5378]/70">({item.lesson_numbers.join(", ") || "geen les"})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <SectionLabel>Acties</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={onApprove}
            disabled={!canReview || approving}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {approving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Reeks goedkeuren
          </Button>
          <Button variant="outline" onClick={onRegenerate}>
            Opnieuw genereren
          </Button>
          <Button variant="outline" onClick={onEditBeforeApprove}>
            Eerst bewerken
          </Button>
          <Button asChild variant="outline">
            <Link to="/lesplan/new">Nieuwe lesplanversie maken</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-[#5c5378]/70">
          Opnieuw genereren zet een conceptfeedback klaar zodat je snel een alternatieve versie kunt aanvragen.
        </p>
      </section>

      <section className="rounded-2xl p-5 border border-[#d7e3ff] bg-[#eff4ff]">
        <SectionLabel>Volgende fase</SectionLabel>
        <ol className="mt-3 space-y-2 text-sm text-[#3c3c52]">
          <li>1. Reeks reviewen</li>
          <li>2. Reeks goedkeuren</li>
          <li>3. Gedetailleerde lessen genereren</li>
          <li>4. Losse lessen bekijken en aanpassen</li>
        </ol>
      </section>

      {(isGeneratingLessons || isCompleted) && lessons.length > 0 && (
        <section className="rounded-2xl p-5 border border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700 font-medium">
            De reeks is goedgekeurd. Ga direct verder met de uitgewerkte lessen.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to={`/lesplan/${requestId}/les/${lessons[0].id}`}>Open eerste uitgewerkte les</Link>
          </Button>
        </section>
      )}

      <FeedbackForm
        messages={feedbackMessages}
        value={feedbackText}
        onChange={setFeedbackText}
        onSubmit={onFeedbackSubmit}
        disabled={feedbackDisabled}
        readOnly={feedbackReadOnly}
        sending={feedbackSending}
        inputRef={feedbackInputRef}
      />
    </div>
  )
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8f9ff] border border-[#e8eeff] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5c5378]/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0b1c30]">{value}</p>
    </div>
  )
}

function FeedbackForm({
  messages,
  value,
  onChange,
  onSubmit,
  disabled,
  readOnly,
  sending,
  inputRef,
}: {
  messages: LesplanThreadMessage[]
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  readOnly: boolean
  sending: boolean
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      onSubmit()
    }
  }

  const recentMessages = messages.slice(-4)

  return (
    <section className="bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff] space-y-4">
      <SectionLabel>Feedback geven</SectionLabel>
      <p className="text-sm text-[#464554] leading-6">
        Geef aan wat er moet veranderen voordat je goedkeurt. Je feedback leidt tot een nieuwe reviewversie.
      </p>

      {recentMessages.length > 0 && (
        <div className="space-y-2">
          {recentMessages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.role === "teacher" ? "bg-[#f3f0ff] text-[#2a14b4]" : "bg-[#eff4ff] text-[#0b1c30]"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70 mb-1">
                {message.role === "teacher" ? "Docent" : "Assistent"}
              </p>
              {message.pending ? (
                <span className="inline-flex items-center gap-1.5 opacity-70">
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  Bezig met verwerken…
                </span>
              ) : (
                <p className="leading-6 whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly ? (
        <div className="space-y-3">
          <Textarea
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={
              disabled
                ? "Feedback beschikbaar zodra de reeks klaar is voor review."
                : "Beschrijf wat je aangepast wilt zien… (Ctrl/⌘ + Enter om te versturen)"
            }
            className="min-h-24 bg-transparent"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#5c5378]/70">
              {disabled ? "Wacht tot de reeks klaarstaat voor review." : "Feedback wordt verwerkt in een nieuwe versie."}
            </p>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={disabled || sending || value.trim().length === 0}
              className="gap-2"
            >
              {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Verstuur
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#5c5378]/70">
          Feedback is niet beschikbaar terwijl de lessen worden uitgewerkt of na afronding.
        </p>
      )}
    </section>
  )
}

function SkeletonLines({ streaming, lines = 3 }: { streaming: boolean; lines?: number }) {
  if (!streaming) return null
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-3.5 bg-[#eff4ff] rounded-full ${
            index === lines - 1 ? "w-3/5" : index % 2 === 0 ? "w-full" : "w-5/6"
          }`}
        />
      ))}
    </div>
  )
}

function SkeletonTags({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <div className="flex flex-wrap gap-2 animate-pulse">
      {[90, 110, 75, 130, 95, 115].map((width, index) => (
        <div key={index} className="h-8 bg-[#eff4ff] rounded-full" style={{ width: `${width}px` }} />
      ))}
    </div>
  )
}

function SkeletonLessonCards({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-5 flex gap-4 shadow-[0px_8px_24px_rgba(11,28,48,0.05)] border border-[#e8eeff]"
        >
          <div className="w-9 h-9 rounded-full bg-[#dce9ff] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#dce9ff] rounded-full w-2/5" />
            <div className="h-3 bg-[#eff4ff] rounded-full w-full" />
            <div className="h-3 bg-[#eff4ff] rounded-full w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
