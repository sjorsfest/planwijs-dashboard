import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { data, Link, useFetcher, useLoaderData, useRevalidator } from "react-router"
import { motion } from "framer-motion"
import { AlertTriangle, ArrowLeft, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react"
import {
  approveLesplan,
  ApiRequestError,
  getBookDetail,
  getClass,
  getLesplan,
  getMethod,
  submitFeedback,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { openEventSource } from "~/lib/sse"
import { Button } from "~/components/ui/button"
import type { LesplanDoneEvent, LesplanWorkspaceLoaderData } from "~/components/lesplan/types"
import {
  type ActionData,
  type StatusEvent,
  type StreamRef,
  type PendingFeedbackRequest,
  STATUS_COPY,
  reducer,
  buildStateFromLoaderData,
  buildSourceContext,
} from "~/components/lesplan/reducer"
import { mapPartialPayload, getReviewStatusLabel, sectionKeyToFieldName } from "~/components/lesplan/utils"
import { LessonSeriesHeader } from "~/components/lesplan/lesson-series-header"
import { type ReviewTabId, LessonSeriesTabNav, TabPanel } from "~/components/lesplan/tab-nav"
import { OverviewTab } from "~/components/lesplan/overview-tab"
import { LessonSequenceTab } from "~/components/lesplan/lesson-sequence-tab"
import { TeacherNotesTab } from "~/components/lesplan/teacher-notes-tab"
import { type SectionFeedbackItem, FeedbackPanel } from "~/components/lesplan/section-feedback"
import type { Route } from "./+types/app.lesplan.$requestId"

const SOFT_EASE = [0.22, 1, 0.36, 1] as const

export function meta() {
  return [{ title: "Lesplan werkruimte — Planwijs" }]
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
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

  return data({
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
  } satisfies LesplanWorkspaceLoaderData, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request, params }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "feedback") {
    const itemsRaw = formData.get("items")
    if (typeof itemsRaw !== "string") {
      return data<ActionData>({ intent: "feedback", ok: false, error: "Voer eerst feedback in." }, { status: 400 })
    }
    try {
      const items = JSON.parse(itemsRaw) as { field_name: string; specific_part: string; user_feedback: string }[]
      if (!Array.isArray(items) || items.length === 0) {
        return data<ActionData>({ intent: "feedback", ok: false, error: "Voer eerst feedback in." }, { status: 400 })
      }
      const lesplan = await submitFeedback(token, params.requestId, { items })
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

export default function LessonSeriesReviewPage() {
  const loaderData = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()
  const [state, dispatch] = useReducer(reducer, loaderData, buildStateFromLoaderData)
  const [feedbackText, setFeedbackText] = useState("")
  const [activeTab, setActiveTab] = useState<ReviewTabId>("overview")
  const [sectionFeedback, setSectionFeedback] = useState<SectionFeedbackItem[]>([])

  const handleSectionFeedback = useCallback((item: Omit<SectionFeedbackItem, "id" | "createdAt">) => {
    setSectionFeedback((prev) => [
      ...prev,
      { ...item, id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() },
    ])
  }, [])

  const handleRemoveSectionFeedback = useCallback((id: string) => {
    setSectionFeedback((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const feedbackFetcher = useFetcher<ActionData>()
  const approveFetcher = useFetcher<ActionData>()
  const processFeedbackFetcher = useFetcher<ActionData>()
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

  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (processFeedbackFetcher.state === "idle" && processFeedbackFetcher.data) {
      setLoadingFields(new Set())
      if (processFeedbackFetcher.data.ok) {
        setSectionFeedback([])
      }
    }
  }, [processFeedbackFetcher.state, processFeedbackFetcher.data])

  function handleProcessFeedback() {
    if (sectionFeedback.length === 0 || processFeedbackFetcher.state !== "idle") return
    const items = sectionFeedback.map((item) => ({
      field_name: sectionKeyToFieldName(item.sectionKey),
      specific_part: item.sectionLabel,
      user_feedback: item.message,
    }))
    const affectedFields = new Set(items.map((item) => item.field_name))
    setLoadingFields(affectedFields)
    const formData = new FormData()
    formData.set("intent", "feedback")
    formData.set("items", JSON.stringify(items))
    processFeedbackFetcher.submit(formData, { method: "post" })
  }

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
    formData.set("items", JSON.stringify([{ field_name: "general", specific_part: "", user_feedback: message }]))
    feedbackFetcher.submit(formData, { method: "post" })
  }

  function handleApprove() {
    if (state.status !== "overview_ready" || approveFetcher.state !== "idle") return
    dispatch({ type: "approve_start" })
    const formData = new FormData()
    formData.set("intent", "approve")
    approveFetcher.submit(formData, { method: "post" })
  }

  const isStreaming =
    state.status === "pending" || state.status === "generating_overview" || state.status === "revising_overview"
  const canReview = state.status === "overview_ready"
  const isGeneratingLessons = state.status === "generating_lessons"
  const statusCopy = STATUS_COPY[state.status]
  const reviewStatusLabel = getReviewStatusLabel(state.status)

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#e8eeff] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/plans"
            prefetch="intent"
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
            onSectionFeedback={handleSectionFeedback}
            loadingFields={loadingFields}
            feedbackDisabled={state.status !== "overview_ready"}
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
            onSectionFeedback={handleSectionFeedback}
            loadingFields={loadingFields}
            feedbackDisabled={state.status !== "overview_ready"}
          />
        </TabPanel>

        <TabPanel id="notes" activeTab={activeTab}>
          <TeacherNotesTab
            overview={state.overview}
            isStreaming={isStreaming}
            onSectionFeedback={handleSectionFeedback}
            loadingFields={loadingFields}
            feedbackDisabled={state.status !== "overview_ready"}
          />
        </TabPanel>
      </div>

      <FeedbackPanel
        items={sectionFeedback}
        onRemove={handleRemoveSectionFeedback}
        onApprove={handleApprove}
        isProcessing={processFeedbackFetcher.state !== "idle"}
        onProcessFeedback={handleProcessFeedback}
        canApprove={canReview}
        isApproving={state.ui.approving || approveFetcher.state !== "idle"}
        status={state.status}
      />
    </div>
  )
}
