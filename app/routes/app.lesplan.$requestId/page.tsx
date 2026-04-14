import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { Link, useFetcher, useLoaderData, useRevalidator } from "react-router"
import { motion } from "framer-motion"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import type { TaskStatusResponse } from "~/lib/backend/types"
import {
  type PendingFeedbackRequest,
  STATUS_COPY,
  reducer,
  buildStateFromLoaderData,
} from "~/components/lesplan/reducer"
import { getReviewStatusLabel, sectionKeyToFieldName, translateStep } from "~/components/lesplan/utils"
import { LessonSeriesHeader } from "~/components/lesplan/lesson-series-header"
import { type ReviewTabId, LessonSeriesTabNav, TabPanel } from "~/components/lesplan/tab-nav"
import { OverviewTab } from "~/components/lesplan/overview-tab"
import { LessonSequenceTab } from "~/components/lesplan/lesson-sequence-tab"
import { TeacherNotesTab } from "~/components/lesplan/teacher-notes-tab"
import { type SectionFeedbackItem, FeedbackPanel } from "~/components/lesplan/section-feedback"
import { useOnboarding } from "~/components/onboarding/onboarding-context"
import { VoltooidOverlay } from "~/components/onboarding/voltooid-overlay"
import type { ActionData } from "./route"
import type { loader } from "./route"
import { SOFT_EASE } from "./constants"

export default function LessonSeriesReviewPage() {
  const loaderData = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()
  const [state, dispatch] = useReducer(reducer, loaderData, buildStateFromLoaderData)
  const [feedbackText, setFeedbackText] = useState("")
  const [activeTab, setActiveTab] = useState<ReviewTabId>("overview")
  const [sectionFeedback, setSectionFeedback] = useState<SectionFeedbackItem[]>([])
  const onboarding = useOnboarding()

  // Advance onboarding to "voltooid" when user lands here for the first time
  useEffect(() => {
    if (onboarding.hydrated && onboarding.phase !== "dismissed" && onboarding.phase !== "voltooid") {
      onboarding.advance()
    }
  }, [onboarding.hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const pendingFeedbackRef = useRef<PendingFeedbackRequest | null>(null)
  const pollingStartedAtRef = useRef<number | null>(null)
  const taskLastCompletedRef = useRef<number>(0)
  // ─── Restore active task from server session (survives page reloads) ─────
  const initialTaskRestored = useRef(false)

  useEffect(() => {
    if (initialTaskRestored.current) return
    initialTaskRestored.current = true
    const task = loaderData.activeTask
    if (task) {
      dispatch({ type: "task_started", taskId: task.taskId, taskType: task.taskType })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Hydrate state from loader data ──────────────────────────────────────
  // Re-hydrate when revalidator finishes so intermediate overview updates
  // become visible even when LesplanRequest.updated_at hasn't changed.
  useEffect(() => {
    if (revalidator.state === "idle") {
      dispatch({ type: "hydrate", payload: loaderData })
    }
  }, [revalidator.state, loaderData])

  // ─── Handle feedback fetcher response ────────────────────────────────────
  useEffect(() => {
    if (feedbackFetcher.state !== "idle" || !feedbackFetcher.data) return
    if (feedbackFetcher.data.intent !== "feedback" || !pendingFeedbackRef.current) return
    const pending = pendingFeedbackRef.current
    pendingFeedbackRef.current = null
    if (!feedbackFetcher.data.ok || !feedbackFetcher.data.task) {
      dispatch({
        type: "feedback_submit_failed",
        teacherId: pending.teacherId,
        placeholderId: pending.placeholderId,
        error: feedbackFetcher.data.error ?? "De feedback kon niet worden verstuurd.",
      })
      return
    }
    dispatch({ type: "feedback_submit_ack", task: feedbackFetcher.data.task, placeholderId: pending.placeholderId })
  }, [feedbackFetcher.state, feedbackFetcher.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handle approve fetcher response ─────────────────────────────────────
  useEffect(() => {
    if (approveFetcher.state !== "idle" || !approveFetcher.data) return
    if (approveFetcher.data.intent !== "approve") return
    if (!approveFetcher.data.ok || !approveFetcher.data.task) {
      dispatch({ type: "approve_failed", error: approveFetcher.data.error ?? "Het overzicht kon niet worden goedgekeurd." })
      return
    }
    dispatch({ type: "approve_success", task: approveFetcher.data.task })
  }, [approveFetcher.state, approveFetcher.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Task polling ────────────────────────────────────────────────────────
  const activeTaskId = state.ui.activeTaskId

  useEffect(() => {
    if (!activeTaskId) {
      taskLastCompletedRef.current = 0
      return
    }

    let cancelled = false
    let timerId: number | undefined
    let consecutiveErrors = 0

    const poll = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/tasks/${activeTaskId}`)
        if (cancelled) return

        if (!res.ok) {
          consecutiveErrors++
          if (res.status === 404 || consecutiveErrors >= 5) {
            dispatch({ type: "task_failed", error: "De taak kon niet worden gevonden of is verlopen." })
            return
          }
          timerId = window.setTimeout(poll, 3_000)
          return
        }

        consecutiveErrors = 0
        const taskStatus: TaskStatusResponse = await res.json()

        dispatch({ type: "task_progress", status: taskStatus })

        // Revalidate lesplan data when a new step completes
        const completedCount = taskStatus.steps.filter((s) => s.status === "completed").length
        if (completedCount > taskLastCompletedRef.current) {
          taskLastCompletedRef.current = completedCount
          revalidator.revalidate()
        }

        if (taskStatus.status === "completed") {
          dispatch({ type: "task_completed", taskType: state.ui.activeTaskType })
          revalidator.revalidate()
          return
        }

        if (taskStatus.status === "failed") {
          dispatch({ type: "task_failed", error: taskStatus.error ?? "De taak is mislukt." })
          revalidator.revalidate()
          return
        }

        // Continue polling
        timerId = window.setTimeout(poll, 5_000)
      } catch {
        if (cancelled) return
        consecutiveErrors++
        if (consecutiveErrors >= 5) {
          dispatch({ type: "task_failed", error: "Verbinding met de server verloren." })
          return
        }
        timerId = window.setTimeout(poll, 3_000)
      }
    }

    // Start first poll immediately
    poll()

    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
    }
  }, [activeTaskId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fallback polling (page refresh during generation, no task_id) ───────
  const isGeneratingWithoutTask =
    !activeTaskId &&
    (state.status === "pending" ||
      state.status === "generating_overview" ||
      state.status === "revising_overview" ||
      state.status === "generating_lessons" ||
      (state.status === "completed" && state.lessons.length < state.request.numLessons))

  useEffect(() => {
    if (!isGeneratingWithoutTask) {
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
      timerId = window.setTimeout(() => {
        if (cancelled) return
        revalidator.revalidate()
        schedule()
      }, 5_000)
    }
    schedule()
    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
    }
  }, [isGeneratingWithoutTask, revalidator, state.lessons.length, state.request.numLessons])

  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (processFeedbackFetcher.state !== "idle" || !processFeedbackFetcher.data) return
    setLoadingFields(new Set())
    if (processFeedbackFetcher.data.ok && processFeedbackFetcher.data.task) {
      setSectionFeedback([])
      dispatch({ type: "task_started", taskId: processFeedbackFetcher.data.task.task_id, taskType: "apply_feedback" })
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

  const isProcessing =
    state.status === "pending" ||
    state.status === "generating_overview" ||
    state.status === "revising_overview" ||
    state.ui.activeTaskId !== null
  // Only expose completed steps when the revalidator is idle, so sections
  // wait for fresh data before switching from skeleton to content.
  const completedSteps = useMemo(
    () => revalidator.state === "idle"
      ? new Set(state.ui.taskSteps.filter((s) => s.status === "completed").map((s) => s.name))
      : new Set<string>(),
    [state.ui.taskSteps, revalidator.state],
  )
  const canReview = state.status === "overview_ready"
  const isGeneratingLessons = state.status === "generating_lessons"
  const statusCopy = activeTaskId && state.ui.taskCurrentStep
    ? { label: translateStep(state.ui.taskCurrentStep) ?? STATUS_COPY[state.status].label, color: STATUS_COPY[state.status].color }
    : STATUS_COPY[state.status]
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
            {isProcessing && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {statusCopy.label}
          </span>
          {activeTaskId && state.ui.taskProgress > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <div className="w-24 h-1.5 rounded-full bg-[#e8eeff] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2a14b4] transition-all duration-500 ease-out"
                  style={{ width: `${state.ui.taskProgress}%` }}
                />
              </div>
              <span className="text-xs text-[#5c5378] tabular-nums">{state.ui.taskProgress}%</span>
            </div>
          )}
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
            isStreaming={isProcessing}
            completedSteps={completedSteps}
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
            isStreaming={isProcessing}
            completedSteps={completedSteps}
            isGeneratingLessons={isGeneratingLessons}
            onSectionFeedback={handleSectionFeedback}
            loadingFields={loadingFields}
            feedbackDisabled={state.status !== "overview_ready"}
          />
        </TabPanel>

        <TabPanel id="notes" activeTab={activeTab}>
          <TeacherNotesTab
            overview={state.overview}
            isStreaming={isProcessing}
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
        activeTaskId={state.ui.activeTaskId}
        activeTaskType={state.ui.activeTaskType}
        taskProgress={state.ui.taskProgress}
        taskCurrentStep={state.ui.taskCurrentStep}
        taskSteps={state.ui.taskSteps}
      />
      <VoltooidOverlay />
    </div>
  )
}
