import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { data, Link, useFetcher, useLoaderData, useRevalidator } from "react-router"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
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
import { Badge } from "~/components/ui/badge"
import { Textarea } from "~/components/ui/textarea"
import {
  mapFeedbackMessages,
  type LesplanDoneEvent,
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
  revising_overview: { label: "Wordt aangepast…", color: "bg-violet-100 text-violet-800" },
  generating_lessons: { label: "Lessen worden uitgewerkt…", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Lesplan compleet", color: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Genereren mislukt", color: "bg-red-100 text-red-800" },
}

function normalizeOverview(
  overview: LesplanResponse["overview"] | LesplanDoneEvent["overview"] | null | undefined
): LesplanOverviewState {
  if (!overview) return null

  return {
    title: overview.title ?? undefined,
    learning_goals: overview.learning_goals ?? undefined,
    key_knowledge: overview.key_knowledge ?? undefined,
    recommended_approach: overview.recommended_approach ?? undefined,
    learning_progression: overview.learning_progression ?? undefined,
    lesson_outline: overview.lesson_outline ?? undefined,
    didactic_approach: overview.didactic_approach ?? undefined,
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
  if (typeof partial.learning_goals === "string") result.learning_goals = partial.learning_goals
  if (Array.isArray(partial.key_knowledge)) result.key_knowledge = partial.key_knowledge as string[]
  if (typeof partial.recommended_approach === "string") result.recommended_approach = partial.recommended_approach
  if (typeof partial.learning_progression === "string") result.learning_progression = partial.learning_progression
  if (Array.isArray(partial.lesson_outline)) result.lesson_outline = partial.lesson_outline as LesplanOverviewPartial["lesson_outline"]
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
          pollingLessons: next.status === "generating_lessons" ? state.ui.pollingLessons : false,
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

export default function LesplanWorkspacePage() {
  const loaderData = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()
  const [state, dispatch] = useReducer(reducer, loaderData, buildStateFromLoaderData)
  const [feedbackText, setFeedbackText] = useState("")
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
      dispatch({ type: "feedback_submit_failed", teacherId: pending.teacherId, placeholderId: pending.placeholderId, error: feedbackFetcher.data.error ?? "De feedback kon niet worden verstuurd." })
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

  // Compute streamTargetMode outside the effect so that transitions within the same
  // mode (e.g. "pending" → "generating_overview") don't change the dep value and
  // therefore don't tear down and reopen the SSE connection unnecessarily.
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
      onStatus: (payload) => { dispatch({ type: "stream_connected", status: payload.status }) },
      onPartial: (payload) => { dispatch({ type: "stream_partial", partial: mapPartialPayload(payload) }) },
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

  useEffect(() => {
    if (state.status !== "generating_lessons") {
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
  }, [state.status, revalidator])

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

  const isStreaming = state.status === "pending" || state.status === "generating_overview" || state.status === "revising_overview"
  const canReview = state.status === "overview_ready"
  const isFailed = state.status === "failed"
  const isGeneratingLessons = state.status === "generating_lessons"
  const isCompleted = state.status === "completed"
  const statusCopy = STATUS_COPY[state.status]

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-black/8 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/plans"
            className="flex items-center gap-1.5 text-sm font-semibold text-black/50 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Plannen
          </Link>
          <span className="text-black/20">·</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCopy.color}`}>
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {statusCopy.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canReview && (
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={approveFetcher.state !== "idle" || state.ui.approving}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {state.ui.approving || approveFetcher.state !== "idle"
                ? <LoaderCircle className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              Overzicht goedkeuren
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to="/lesplan/new">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Nieuw lesplan
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        {/* Error banner */}
        {state.ui.lastError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 font-medium flex-1">{state.ui.lastError}</p>
            <button
              onClick={() => dispatch({ type: "clear_error" })}
              className="text-red-400 hover:text-red-600 font-bold text-xs"
            >
              Sluiten
            </button>
          </div>
        )}

        {/* Overview document */}
        <OverviewDocument
          overview={state.overview}
          isStreaming={isStreaming}
          streamConnected={state.ui.streamConnected}
          lessons={state.lessons}
          isGeneratingLessons={isGeneratingLessons}
          isFailed={isFailed}
        />

        {/* Feedback thread */}
        {(state.feedbackMessages.length > 0 || canReview || isGeneratingLessons || isCompleted) && (
          <FeedbackSection
            messages={state.feedbackMessages}
            value={feedbackText}
            onChange={setFeedbackText}
            onSubmit={handleFeedbackSubmit}
            disabled={!canReview || state.ui.sendingFeedback || state.ui.approving}
            readOnly={isGeneratingLessons || isCompleted || isFailed}
            sending={feedbackFetcher.state !== "idle" || state.ui.sendingFeedback}
          />
        )}

        {/* Completed lessons */}
        {isCompleted && state.lessons.length > 0 && (
          <CompletedLessonPlans lessons={state.lessons} context={state.sourceContext} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview document
// ---------------------------------------------------------------------------

function OverviewDocument({
  overview,
  isStreaming,
  streamConnected,
  lessons,
  isGeneratingLessons,
  isFailed,
}: {
  overview: LesplanOverviewState
  isStreaming: boolean
  streamConnected: boolean
  lessons: LesplanPageState["lessons"]
  isGeneratingLessons: boolean
  isFailed: boolean
}) {
  const isEmpty = !overview

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        {overview?.title ? (
          <h1 className="text-4xl font-black tracking-tight text-black leading-tight">{overview.title}</h1>
        ) : (
          <div className={`h-10 w-2/3 rounded-lg ${isStreaming ? "bg-black/8 animate-pulse" : "bg-black/5"}`} />
        )}
      </div>

      {/* Generating / failed states */}
      {isStreaming && !streamConnected && isEmpty && (
        <div className="flex items-center gap-3 text-sm text-black/50 font-medium">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Verbinden met stream…
        </div>
      )}

      {isFailed && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">Genereren mislukt</p>
            <p className="text-sm text-red-600 mt-1">De backend heeft de aanvraag afgebroken. Start een nieuw lesplan om opnieuw te beginnen.</p>
            <Button asChild size="sm" className="mt-4 gap-2">
              <Link to="/lesplan/new">
                <Sparkles className="w-4 h-4" />
                Start nieuw lesplan
              </Link>
            </Button>
          </div>
        </div>
      )}

      {isGeneratingLessons && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 flex items-center gap-4">
          <LoaderCircle className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          <div>
            <p className="font-bold text-blue-900">Lessen worden uitgewerkt</p>
            <p className="text-sm text-blue-600 mt-0.5">De losse lessen worden op de achtergrond opgebouwd. Deze pagina ververst automatisch.</p>
          </div>
        </div>
      )}

      {/* Learning goals */}
      <ProseSection
        label="Wat leren de leerlingen?"
        value={overview?.learning_goals}
        streaming={isStreaming}
      />

      {/* Key knowledge */}
      <section className="space-y-3">
        <SectionLabel>Kernkennis</SectionLabel>
        {overview?.key_knowledge && overview.key_knowledge.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {overview.key_knowledge.map((item, i) => (
              <span
                key={i}
                className="inline-block bg-white border border-black/12 rounded-full px-3.5 py-1.5 text-sm font-medium text-black/80 shadow-sm"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <SkeletonTags streaming={isStreaming} />
        )}
      </section>

      {/* Recommended approach */}
      <section className="space-y-3">
        <SectionLabel>Aanbevolen didactische aanpak</SectionLabel>
        {overview?.recommended_approach ? (
          <div className="flex gap-4 border-l-4 border-amber-400 pl-5 py-1">
            <div className="shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm leading-7 text-black/75 font-medium">{overview.recommended_approach}</p>
          </div>
        ) : (
          <SkeletonLines streaming={isStreaming} lines={4} indent />
        )}
      </section>

      {/* Learning progression */}
      <section className="space-y-3">
        <SectionLabel>Leerlijn</SectionLabel>
        {overview?.learning_progression ? (
          <div className="relative pl-5">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-violet-400 to-violet-200" />
            <p className="text-sm leading-7 text-black/75 font-medium">{overview.learning_progression}</p>
          </div>
        ) : (
          <SkeletonLines streaming={isStreaming} lines={3} />
        )}
      </section>

      {/* Lesson outline */}
      <section className="space-y-4">
        <SectionLabel>Lessenreeks</SectionLabel>
        {overview?.lesson_outline && overview.lesson_outline.length > 0 ? (
          <div className="space-y-3">
            {overview.lesson_outline.map((item, i) => (
              <LessonOutlineCard
                key={i}
                item={item}
                linkedLesson={lessons.find((l) => l.lesson_number === item.lesson_number)}
              />
            ))}
          </div>
        ) : (
          <SkeletonCards streaming={isStreaming} />
        )}
      </section>

      {/* Didactic approach */}
      <ProseSection
        label="Didactische aanpak"
        value={overview?.didactic_approach}
        streaming={isStreaming}
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">{children}</p>
  )
}

function ProseSection({ label, value, streaming }: { label: string; value?: string; streaming: boolean }) {
  return (
    <section className="space-y-3">
      <SectionLabel>{label}</SectionLabel>
      {value ? (
        <p className="text-sm leading-7 text-black/75 font-medium">{value}</p>
      ) : (
        <SkeletonLines streaming={streaming} lines={3} />
      )}
    </section>
  )
}

function LessonOutlineCard({
  item,
  linkedLesson,
}: {
  item: { lesson_number: number; subject_focus: string; description: string; builds_on: string }
  linkedLesson?: { id: string; lesson_number: number }
}) {
  return (
    <div className="group flex gap-4 bg-white rounded-2xl border border-black/8 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="shrink-0 w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-black">
        {item.lesson_number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-black text-sm">{item.subject_focus}</p>
          {linkedLesson && (
            <a
              href={`#lesson-${linkedLesson.lesson_number}`}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold text-black/40 hover:text-black transition-colors"
            >
              Bekijk les
              <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
        <p className="mt-1.5 text-sm text-black/60 leading-6">{item.description}</p>
        {item.builds_on && (
          <p className="mt-2.5 text-xs text-black/40 font-medium">
            <span className="font-bold">Bouwt voort op:</span> {item.builds_on}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton states
// ---------------------------------------------------------------------------

function SkeletonLines({ streaming, lines = 3, indent }: { streaming: boolean; lines?: number; indent?: boolean }) {
  if (!streaming) return null
  return (
    <div className={`space-y-2 animate-pulse ${indent ? "pl-5" : ""}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3.5 bg-black/8 rounded ${i === lines - 1 ? "w-3/5" : i % 2 === 0 ? "w-full" : "w-5/6"}`} />
      ))}
    </div>
  )
}

function SkeletonTags({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <div className="flex flex-wrap gap-2 animate-pulse">
      {[90, 110, 75, 130, 95, 115].map((w, i) => (
        <div key={i} className="h-8 bg-black/8 rounded-full" style={{ width: `${w}px` }} />
      ))}
    </div>
  )
}

function SkeletonCards({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-black/8 p-5 flex gap-4">
          <div className="w-9 h-9 rounded-full bg-black/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-black/10 rounded w-2/5" />
            <div className="h-3 bg-black/8 rounded w-full" />
            <div className="h-3 bg-black/8 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feedback section
// ---------------------------------------------------------------------------

function FeedbackSection({
  messages,
  value,
  onChange,
  onSubmit,
  disabled,
  readOnly,
  sending,
}: {
  messages: LesplanThreadMessage[]
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  readOnly: boolean
  sending: boolean
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="space-y-4">
      <SectionLabel>Gesprek & feedback</SectionLabel>

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={[
                "max-w-[85%] rounded-2xl px-4 py-3",
                message.role === "teacher"
                  ? "ml-auto bg-black text-white"
                  : "mr-auto bg-white border border-black/10 text-black",
              ].join(" ")}
            >
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${message.role === "teacher" ? "text-white/50" : "text-black/35"}`}>
                {message.role === "teacher" ? "Docent" : "Assistent"}
              </p>
              {message.pending ? (
                <div className="flex items-center gap-2 text-sm font-medium opacity-60">
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  Bezig…
                </div>
              ) : (
                <p className="text-sm leading-6 font-medium whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            placeholder={
              disabled
                ? "Feedback beschikbaar zodra het overzicht klaar is…"
                : "Beschrijf wat je aangepast wilt zien… (⌘↵ om te versturen)"
            }
            className="min-h-24 border-0 focus-visible:ring-0 resize-none rounded-none bg-transparent text-sm"
          />
          <div className="flex items-center justify-between px-4 py-3 border-t border-black/8">
            <p className="text-xs text-black/40 font-medium">
              {disabled ? "Wacht tot het overzicht gereed is." : "Je feedback triggert een revisie van het overzicht."}
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
      )}

      {readOnly && messages.length === 0 && (
        <p className="text-sm text-black/40 font-medium">Geen feedback gesprek.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Completed lesson plans
// ---------------------------------------------------------------------------

function CompletedLessonPlans({ lessons, context }: { lessons: LesplanPageState["lessons"]; context: SourceContext }) {
  const paragraphsById = new Map((context.selectedParagraphs ?? []).map((p) => [p.id, p.title]))

  return (
    <div className="space-y-6">
      <SectionLabel>Uitgewerkte lessen</SectionLabel>

      {/* Jump links */}
      <div className="flex flex-wrap gap-2">
        {lessons.map((lesson) => (
          <a
            key={lesson.id}
            href={`#lesson-${lesson.lesson_number}`}
            className="inline-flex items-center gap-1.5 bg-white border border-black/12 rounded-full px-3.5 py-1.5 text-sm font-semibold hover:bg-black hover:text-white transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Les {lesson.lesson_number}
          </a>
        ))}
      </div>

      {lessons.map((lesson) => (
        <div key={lesson.id} id={`lesson-${lesson.lesson_number}`} className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm scroll-mt-20">
          <div className="px-6 py-5 border-b border-black/8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-black shrink-0">
              {lesson.lesson_number}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/35 mb-0.5">Les {lesson.lesson_number}</p>
              <h2 className="text-lg font-black text-black">{lesson.title}</h2>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Learning objectives */}
            <div>
              <SectionLabel>Leerdoelen</SectionLabel>
              <ul className="mt-3 space-y-2">
                {lesson.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-black/75 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>

            {/* Time sections */}
            <div>
              <SectionLabel>Tijdschema</SectionLabel>
              <div className="mt-3 overflow-x-auto rounded-xl border border-black/10">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-black/4 border-b border-black/10">
                    <tr>
                      {["Tijd", "Activiteit", "Beschrijving", "Type"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.18em] text-black/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.time_sections.map((section, i) => (
                      <tr key={i} className="border-b border-black/6 last:border-b-0">
                        <td className="px-4 py-3 font-bold text-black/60 whitespace-nowrap">{section.start_min}–{section.end_min} min</td>
                        <td className="px-4 py-3 font-semibold text-black">{section.activity}</td>
                        <td className="px-4 py-3 text-black/65">{section.description}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-[0.12em]">
                            {section.activity_type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Materials */}
              <div>
                <SectionLabel>Benodigdheden</SectionLabel>
                <ul className="mt-3 space-y-1.5">
                  {lesson.required_materials.map((mat, i) => (
                    <li key={i} className="text-sm text-black/65 font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-black/25 shrink-0" />
                      {mat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Covered paragraphs */}
              <div>
                <SectionLabel>Behandelde paragrafen</SectionLabel>
                <ul className="mt-3 space-y-1.5">
                  {lesson.covered_paragraph_ids.map((id) => (
                    <li key={id} className="text-sm text-black/65 font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      {paragraphsById.get(id) ?? id}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Teacher notes */}
            <div>
              <SectionLabel>Aantekeningen voor de docent</SectionLabel>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm leading-6 text-amber-900 font-medium whitespace-pre-wrap">{lesson.teacher_notes}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
