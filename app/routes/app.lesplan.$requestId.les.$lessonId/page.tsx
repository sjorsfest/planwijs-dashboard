import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useFetcher, useLoaderData, useRevalidator } from "react-router"
import {
  ArrowLeft,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  LoaderCircle,
  MessageCircle,
  Minus,
  Pencil,
  Sparkles,
  X,
} from "lucide-react"
import { motion } from "framer-motion"
import type { LessonPlanResponse, TaskStatusResponse, TaskStep } from "~/lib/backend/types"
import { TodoCard } from "~/components/todos/todo-card"
import { SectionFeedbackButton, type SectionFeedbackItem } from "~/components/lesplan/section-feedback"
import { translateStep } from "~/components/lesplan/utils"
import type { SourceContext } from "~/components/lesplan/types"
import type { loader } from "./route"
import { LESSON_TABS, activityTypeStyles, type LessonTabId } from "./constants"
import { lessonSectionKeyToFieldName } from "./constants"
import { formatPlannedDate } from "./utils"

type ActionData = {
  intent?: string
  ok: boolean
  task?: { task_id: string; resource_id: string; task_type: string }
  error?: string
}

export default function LessonDetailPage() {
  const { requestId, lesson, sourceContext, lesplanStatus, activeTask } = useLoaderData<typeof loader>()
  const [activeTab, setActiveTab] = useState<LessonTabId>("overzicht")

  // ─── Feedback state ──────────────────────────────────────────────────
  const [sectionFeedback, setSectionFeedback] = useState<SectionFeedbackItem[]>([])
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set())
  const [activeTaskId, setActiveTaskId] = useState<string | null>(activeTask?.taskId ?? null)
  const [taskProgress, setTaskProgress] = useState(0)
  const [taskCurrentStep, setTaskCurrentStep] = useState<string | null>(null)
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([])
  const [lastError, setLastError] = useState<string | undefined>()

  const feedbackFetcher = useFetcher<ActionData>()
  const revalidator = useRevalidator()
  const taskLastCompletedRef = useRef(0)
  const consecutiveErrorsRef = useRef(0)

  const isRevising = lesplanStatus === "revising_lesson" || activeTaskId !== null

  // ─── Restore task from loader on mount ───────────────────────────────
  const initialTaskRestoredRef = useRef(false)
  useEffect(() => {
    if (initialTaskRestoredRef.current) return
    initialTaskRestoredRef.current = true
    if (activeTask?.taskId) {
      setActiveTaskId(activeTask.taskId)

    }
  }, [activeTask])

  // ─── Task polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTaskId) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks/${activeTaskId}`)
        if (cancelled) return
        if (res.status === 404) {
          setActiveTaskId(null)

          setLoadingFields(new Set())
          revalidator.revalidate()
          return
        }
        if (!res.ok) {
          consecutiveErrorsRef.current++
          if (consecutiveErrorsRef.current >= 5) {
            setActiveTaskId(null)
  
            setLoadingFields(new Set())
            setLastError("Verbinding met de server verloren")
          }
          return
        }
        consecutiveErrorsRef.current = 0
        const taskStatus: TaskStatusResponse = await res.json()
        setTaskProgress(taskStatus.progress_pct)
        setTaskCurrentStep(taskStatus.current_step)
        setTaskSteps(taskStatus.steps)

        const completedCount = taskStatus.steps.filter((s) => s.status === "completed").length
        if (completedCount > taskLastCompletedRef.current) {
          taskLastCompletedRef.current = completedCount
          revalidator.revalidate()
        }

        if (taskStatus.status === "completed") {
          setActiveTaskId(null)

          setTaskProgress(0)
          setTaskCurrentStep(null)
          setTaskSteps([])
          setLoadingFields(new Set())
          taskLastCompletedRef.current = 0
          revalidator.revalidate()
          return
        }
        if (taskStatus.status === "failed") {
          setActiveTaskId(null)

          setTaskProgress(0)
          setTaskCurrentStep(null)
          setTaskSteps([])
          setLoadingFields(new Set())
          taskLastCompletedRef.current = 0
          setLastError(taskStatus.error ?? "Er ging iets mis bij het verwerken van de feedback")
          revalidator.revalidate()
          return
        }
      } catch {
        consecutiveErrorsRef.current++
        if (consecutiveErrorsRef.current >= 5) {
          setActiveTaskId(null)

          setLoadingFields(new Set())
          setLastError("Verbinding met de server verloren")
        }
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeTaskId, revalidator])

  // ─── Fallback polling when revising but no task id ───────────────────
  useEffect(() => {
    if (activeTaskId) return
    if (lesplanStatus !== "revising_lesson") return
    const interval = setInterval(() => revalidator.revalidate(), 5000)
    return () => clearInterval(interval)
  }, [activeTaskId, lesplanStatus, revalidator])

  // ─── Handle fetcher response ─────────────────────────────────────────
  useEffect(() => {
    if (feedbackFetcher.state !== "idle" || !feedbackFetcher.data) return
    const result = feedbackFetcher.data
    if (result.ok && result.task) {
      setActiveTaskId(result.task.task_id)
      setSectionFeedback([])
      taskLastCompletedRef.current = 0
      consecutiveErrorsRef.current = 0
    } else if (!result.ok) {
      setLoadingFields(new Set())
      setLastError(result.error ?? "Er ging iets mis")
    }
  }, [feedbackFetcher.state, feedbackFetcher.data])

  // ─── Callbacks ───────────────────────────────────────────────────────
  const handleSectionFeedback = useCallback(
    (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => {
      setSectionFeedback((prev) => [
        ...prev,
        {
          ...item,
          id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        },
      ])
    },
    []
  )

  const handleRemoveFeedback = useCallback((id: string) => {
    setSectionFeedback((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleProcessFeedback = useCallback(() => {
    if (sectionFeedback.length === 0) return
    const items = sectionFeedback.map((item) => ({
      field_name: lessonSectionKeyToFieldName(item.sectionKey),
      specific_part: item.sectionLabel,
      user_feedback: item.message,
    }))

    const affectedFields = new Set(items.map((item) => item.field_name))
    setLoadingFields(affectedFields)

    const formData = new FormData()
    formData.set("intent", "lesson-feedback")
    formData.set("lessonId", lesson.id)
    formData.set("items", JSON.stringify(items))
    feedbackFetcher.submit(formData, { method: "post" })
  }, [sectionFeedback, lesson.id, feedbackFetcher])

  const showFeedbackPanel = sectionFeedback.length > 0 || activeTaskId !== null || lesplanStatus === "revising_lesson"

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#e8eeff] px-6 py-3 flex items-center gap-4">
        <Link
          to={`/lesplan/${requestId}`}
          prefetch="intent"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#5c5378] hover:text-[#0b1c30] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar overzicht
        </Link>
        <span className="text-[#c7c4d7]">·</span>
        <span className="text-sm font-semibold text-[#464554]">
          Les {lesson.lesson_number}: {lesson.title}
        </span>
      </div>

      {/* Error banner */}
      {lastError && (
        <div className="px-8 pt-4 max-w-5xl">
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-800">{lastError}</p>
            <button
              type="button"
              onClick={() => setLastError(undefined)}
              className="text-red-400 hover:text-red-600 transition-colors text-xs font-semibold uppercase"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="px-8 py-8 max-w-5xl">
        <LessonHeader
          lesson={lesson}
          onSectionFeedback={handleSectionFeedback}
          isRevising={isRevising}
        />
      </div>

      {/* Tab nav */}
      <LessonTabNav activeTab={activeTab} onChange={setActiveTab} lesson={lesson} />

      {/* Tab content */}
      <div className="px-8 py-6 max-w-5xl">
        <TabPanel id="overzicht" activeTab={activeTab}>
          <OverviewTab
            lesson={lesson}
            sourceContext={sourceContext}
            onSectionFeedback={handleSectionFeedback}
            isRevising={isRevising}
            loadingFields={loadingFields}
          />
        </TabPanel>

        <TabPanel id="tijdschema" activeTab={activeTab}>
          <TimeschemaTab
            lesson={lesson}
            onSectionFeedback={handleSectionFeedback}
            isRevising={isRevising}
            loadingFields={loadingFields}
          />
        </TabPanel>

        <TabPanel id="notities" activeTab={activeTab}>
          <NotesTab
            lesson={lesson}
            onSectionFeedback={handleSectionFeedback}
            isRevising={isRevising}
            loadingFields={loadingFields}
          />
        </TabPanel>

        <TabPanel id="taken" activeTab={activeTab}>
          <TakenTab lesson={lesson} />
        </TabPanel>
      </div>

      {/* Feedback panel */}
      {showFeedbackPanel && (
        <LessonFeedbackPanel
          items={sectionFeedback}
          onRemove={handleRemoveFeedback}
          onProcessFeedback={handleProcessFeedback}
          isProcessing={feedbackFetcher.state !== "idle"}
          activeTaskId={activeTaskId}
          taskProgress={taskProgress}
          taskCurrentStep={taskCurrentStep}
          taskSteps={taskSteps}
        />
      )}
    </div>
  )
}

// ─── Shared components ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">{children}</p>
  )
}

function SectionHeader({
  label,
  sectionKey,
  sectionLabel,
  onSectionFeedback,
  isRevising,
}: {
  label: string
  sectionKey: string
  sectionLabel: string
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  isRevising: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <SectionLabel>{label}</SectionLabel>
      <SectionFeedbackButton
        sectionKey={sectionKey}
        sectionLabel={sectionLabel}
        onSubmit={onSectionFeedback}
        disabled={isRevising}
      />
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-[#e8eeff] rounded w-3/4" />
      <div className="h-4 bg-[#e8eeff] rounded w-1/2" />
      <div className="h-4 bg-[#e8eeff] rounded w-5/8" />
    </div>
  )
}

// ─── Tab components ─────────────────────────────────────────────────────────

type FeedbackProps = {
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  isRevising: boolean
  loadingFields: Set<string>
}

function LessonHeader({
  lesson,
  onSectionFeedback,
  isRevising,
}: {
  lesson: LessonPlanResponse
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  isRevising: boolean
}) {
  const fetcher = useFetcher()
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingTodos = lesson.preparation_todos.filter((t) => t.status === "pending").length
  const doneTodos = lesson.preparation_todos.filter((t) => t.status === "done").length

  const isSubmitting = fetcher.state !== "idle"
  const displayDate = lesson.planned_date
  const today = new Date().toISOString().slice(0, 10)

  function handleSave(date: string) {
    if (!date || date < today) return
    fetcher.submit(
      { intent: "set-planned-date", lessonId: lesson.id, plannedDate: date },
      { method: "post" }
    )
    setEditing(false)
  }

  function handleClear() {
    fetcher.submit(
      { intent: "set-planned-date", lessonId: lesson.id, plannedDate: "" },
      { method: "post" }
    )
    setEditing(false)
  }

  const stats = [
    { label: "Tijdsduur", value: `${lesson.time_sections.at(-1)?.end_min ?? "?"} min` },
    { label: "Activiteiten", value: String(lesson.time_sections.length) },
    { label: "Benodigdheden", value: String(lesson.required_materials.length) },
    { label: "Taken", value: `${doneTodos}/${lesson.preparation_todos.length}` },
  ]

  return (
    <section className="bg-white rounded-3xl p-6 shadow-[0px_18px_36px_rgba(11,28,48,0.08)] border border-[#e8eeff]">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-[0px_4px_16px_rgba(42,20,180,0.25)]">
          {lesson.lesson_number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-0.5">
              Les {lesson.lesson_number}
            </p>
            <SectionFeedbackButton
              sectionKey="title"
              sectionLabel="Titel"
              onSubmit={onSectionFeedback}
              disabled={isRevising}
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30] leading-tight">{lesson.title}</h1>
          <div className="flex items-center gap-1.5 mt-2">
            <Calendar className="w-3.5 h-3.5 text-[#5c5378]/50" />
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    inputRef.current = el
                    if (el) {
                      try { el.showPicker() } catch { /* unsupported browsers */ }
                    }
                  }}
                  type="date"
                  defaultValue={displayDate ?? ""}
                  min={today}
                  autoFocus
                  className="text-sm font-semibold text-[#464554] bg-[#f8f9ff] border border-[#e8eeff] rounded-lg px-2 py-1 outline-none focus:border-[#4338ca] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(e.currentTarget.value)
                    if (e.key === "Escape") setEditing(false)
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputRef.current?.value) handleSave(inputRef.current.value)
                    else setEditing(false)
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-white bg-[#4338ca] hover:bg-[#2a14b4] rounded-md px-2.5 py-1 transition-colors"
                >
                  Opslaan
                </button>
                {displayDate && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[10px] font-semibold uppercase tracking-wider text-[#5c5378] hover:text-red-600 transition-colors"
                  >
                    Wissen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[#5c5378]/50 hover:text-[#0b1c30] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-[#4338ca] animate-spin" />
                <span className="text-sm font-medium text-[#5c5378]/50">Opslaan…</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="group flex items-center gap-1.5 hover:text-[#4338ca] transition-colors"
              >
                {displayDate ? (
                  <span className="text-sm font-semibold text-[#464554] group-hover:text-[#4338ca]">{formatPlannedDate(displayDate)}</span>
                ) : (
                  <span className="text-sm font-medium text-[#5c5378]/50 italic group-hover:text-[#4338ca]">Nog niet gepland</span>
                )}
                <Pencil className="w-3 h-3 text-[#5c5378]/40 group-hover:text-[#4338ca] transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#f8f9ff] rounded-xl border border-[#e8eeff] px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70">{stat.label}</p>
            <p className="text-sm font-semibold text-[#0b1c30] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {pendingTodos > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <Circle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {pendingTodos} voorbereidingstaak{pendingTodos !== 1 ? "en" : ""} nog te doen
          </p>
        </div>
      )}
    </section>
  )
}

function LessonTabNav({
  activeTab,
  onChange,
  lesson,
}: {
  activeTab: LessonTabId
  onChange: (tab: LessonTabId) => void
  lesson: LessonPlanResponse
}) {
  const pendingTodos = lesson.preparation_todos.filter((t) => t.status === "pending").length

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = LESSON_TABS.findIndex((tab) => tab.id === activeTab)
    if (currentIndex < 0) return

    let nextIndex = currentIndex
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % LESSON_TABS.length
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + LESSON_TABS.length) % LESSON_TABS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = LESSON_TABS.length - 1

    if (nextIndex === currentIndex) return
    event.preventDefault()
    const nextTab = LESSON_TABS[nextIndex]
    onChange(nextTab.id)
    window.setTimeout(() => document.getElementById(`lesson-tab-${nextTab.id}`)?.focus(), 0)
  }

  return (
    <div className="sticky top-[57px] z-10 bg-[#f8f9ff]/90 backdrop-blur-sm border-b border-[#e8eeff]">
      <div
        role="tablist"
        aria-label="Les tabs"
        onKeyDown={handleKeyDown}
        className="px-8 py-2 max-w-5xl flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {LESSON_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const showBadge = tab.id === "taken" && pendingTodos > 0
          return (
            <button
              key={tab.id}
              id={`lesson-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`lesson-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap flex items-center gap-1.5",
                isActive
                  ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_2px_8px_rgba(42,20,180,0.2)]"
                  : "text-[#5c5378] hover:text-[#0b1c30] hover:bg-[#eff4ff]",
              ].join(" ")}
            >
              {tab.label}
              {showBadge && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>
                  {pendingTodos}
                </span>
              )}
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
  id: LessonTabId
  activeTab: LessonTabId
  children: React.ReactNode
}) {
  return (
    <section
      id={`lesson-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`lesson-tab-${id}`}
      hidden={activeTab !== id}
      className={activeTab === id ? "space-y-5" : "hidden"}
    >
      {children}
    </section>
  )
}

function OverviewTab({
  lesson,
  sourceContext,
  onSectionFeedback,
  isRevising,
  loadingFields,
}: { lesson: LessonPlanResponse; sourceContext: SourceContext } & FeedbackProps) {
  const paragraphsById = new Map((sourceContext.selectedParagraphs ?? []).map((p) => [p.id, p.title]))

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <SectionHeader
          label="Leerdoelen"
          sectionKey="leerdoelen"
          sectionLabel="Leerdoelen"
          onSectionFeedback={onSectionFeedback}
          isRevising={isRevising}
        />
        {loadingFields.has("learning_objectives") ? (
          <SectionSkeleton />
        ) : (
          <ul className="space-y-2.5">
            {lesson.learning_objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#464554] font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lesson.covered_paragraph_ids.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="mb-4">
            <SectionLabel>Behandelde paragrafen</SectionLabel>
          </div>
          <ul className="space-y-2">
            {lesson.covered_paragraph_ids.map((id) => (
              <li key={id} className="rounded-xl border border-[#dce7ff] bg-[#f8fbff] px-3.5 py-2.5 text-sm text-[#394055]">
                {paragraphsById.get(id) ?? id}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ActivityTypeBadge({ type }: { type: string }) {
  const style = activityTypeStyles[type.toLowerCase()] ?? "bg-[#eff4ff] text-[#464554]"
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] ${style}`}>
      {type}
    </span>
  )
}

function TimeschemaTab({
  lesson,
  onSectionFeedback,
  isRevising,
  loadingFields,
}: { lesson: LessonPlanResponse } & FeedbackProps) {
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff] overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <SectionHeader
            label="Tijdschema"
            sectionKey="tijdschema"
            sectionLabel="Tijdschema"
            onSectionFeedback={onSectionFeedback}
            isRevising={isRevising}
          />
        </div>
        {loadingFields.has("time_sections") ? (
          <div className="px-6 pb-6">
            <SectionSkeleton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-[#eff4ff]">
                  {["Tijd", "Activiteit", "Beschrijving", "Type"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {lesson.time_sections.map((section, i) => (
                  <tr
                    key={i}
                    className="border-t border-[#eff4ff] hover:bg-[#f8f9ff] transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-bold text-[#0b1c30] tabular-nums">{section.start_min}-{section.end_min}</span>
                      <span className="text-[#5c5378]/60 font-medium text-xs ml-1">min</span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#0b1c30]">{section.activity}</td>
                    <td className="px-5 py-4 text-[#464554] leading-6">{section.description}</td>
                    <td className="px-5 py-4">
                      <ActivityTypeBadge type={section.activity_type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function NotesTab({
  lesson,
  onSectionFeedback,
  isRevising,
  loadingFields,
}: { lesson: LessonPlanResponse } & FeedbackProps) {
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <SectionHeader
          label="Aantekeningen voor de docent"
          sectionKey="docentnotities"
          sectionLabel="Docentnotities"
          onSectionFeedback={onSectionFeedback}
          isRevising={isRevising}
        />
        {loadingFields.has("teacher_notes") ? (
          <SectionSkeleton />
        ) : (
          <div className="bg-[#ffdf9f]/40 rounded-xl p-4 border-l-4 border-[#f9bd22]">
            <p className="text-sm leading-6 text-[#4c3700] font-medium whitespace-pre-wrap">{lesson.teacher_notes}</p>
          </div>
        )}
      </section>

      {lesson.required_materials.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <SectionHeader
            label="Benodigdheden"
            sectionKey="benodigdheden"
            sectionLabel="Benodigdheden"
            onSectionFeedback={onSectionFeedback}
            isRevising={isRevising}
          />
          {loadingFields.has("required_materials") ? (
            <SectionSkeleton />
          ) : (
            <ul className="space-y-2">
              {lesson.required_materials.map((mat, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-[#464554] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5c5378]/40 shrink-0" />
                  {mat}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function TakenTab({ lesson }: { lesson: LessonPlanResponse }) {
  if (lesson.preparation_todos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
        <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-[#5c5378]/40" />
        </div>
        <p className="text-sm font-semibold text-[#5c5378]">Geen voorbereidingstaken</p>
        <p className="text-xs text-[#5c5378]/60 mt-0.5">Er zijn nog geen taken toegevoegd voor deze les.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {lesson.preparation_todos.map((todo) => (
        <TodoCard key={todo.id} todo={todo} />
      ))}
    </div>
  )
}

// ─── Lesson Feedback Panel ──────────────────────────────────────────────────

function LessonFeedbackPanel({
  items,
  onRemove,
  onProcessFeedback,
  isProcessing,
  activeTaskId,
  taskProgress,
  taskCurrentStep,
  taskSteps,
}: {
  items: SectionFeedbackItem[]
  onRemove: (id: string) => void
  onProcessFeedback: () => void
  isProcessing: boolean
  activeTaskId: string | null
  taskProgress: number
  taskCurrentStep: string | null
  taskSteps: TaskStep[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const hasFeedback = items.length > 0
  const hasActiveTask = Boolean(activeTaskId)
  const isGenerating = hasActiveTask

  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          type="button"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setMinimized(false)}
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_8px_24px_rgba(42,20,180,0.3)] hover:shadow-[0px_12px_32px_rgba(42,20,180,0.4)] transition-shadow"
        >
          {isGenerating ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <MessageCircle className="w-5 h-5" />
          )}
          {!isGenerating && hasFeedback && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#2a14b4] text-[10px] font-bold shadow-sm">
              {items.length}
            </span>
          )}
        </motion.button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <div className="bg-white rounded-2xl shadow-[0px_16px_48px_rgba(11,28,48,0.14)] border border-[#e8eeff] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-[#2a14b4] to-[#4338ca] text-white">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2.5 flex-1"
          >
            {isGenerating ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4.5 h-4.5" />
            )}
            <span className="text-sm font-semibold">
              {isGenerating ? "Feedback verwerken…" : "AI aanpassingen"}
            </span>
            {!isGenerating && hasFeedback && (
              <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white/20 text-[11px] font-bold">
                {items.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/15 transition-colors"
            title="Minimaliseren"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {!collapsed && (
          <>
            {isGenerating ? (
              <div className="px-5 py-5">
                {hasActiveTask && taskProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-[#5c5378]">
                        {translateStep(taskCurrentStep) ?? "Bezig..."}
                      </p>
                      <span className="text-[10px] font-semibold text-[#2a14b4] tabular-nums">{taskProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#e8eeff] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca]"
                        initial={{ width: 0 }}
                        animate={{ width: `${taskProgress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}

                {taskSteps.length > 0 ? (
                  <div className="space-y-1">
                    {taskSteps.map((step) => {
                      const label = translateStep(step.name) ?? step.name
                      const isCompleted = step.status === "completed"
                      const isRunning = step.status === "running"
                      return (
                        <div
                          key={step.name}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                            isRunning ? "bg-[#eff4ff]" : ""
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : isRunning ? (
                            <LoaderCircle className="w-3.5 h-3.5 text-[#2a14b4] animate-spin shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-[#d4d0e8] shrink-0" />
                          )}
                          <span
                            className={`${
                              isCompleted
                                ? "text-[#5c5378]/60 line-through"
                                : isRunning
                                ? "text-[#2a14b4] font-semibold"
                                : "text-[#5c5378]/50"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2">
                    <LoaderCircle className="w-5 h-5 text-[#2a14b4]/40 animate-spin mb-2" />
                    <p className="text-xs text-[#5c5378]/70">Taak wordt gestart…</p>
                  </div>
                )}

                <p className="text-[11px] text-[#5c5378]/60 leading-5 text-center mt-4">
                  De les wordt aangepast op basis van jouw feedback.
                </p>
              </div>
            ) : hasFeedback ? (
              <div className="max-h-72 overflow-y-auto p-3.5 space-y-2.5">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative rounded-xl border border-[#e8eeff] bg-[#f8f9ff] px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#eff4ff] text-[#2a14b4] px-2 py-0.5 text-[10px] font-semibold shrink-0">
                        {item.sectionLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#5c5378]/40 hover:text-red-500 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-[#464554] leading-5">{item.message}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-6 flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#eff4ff] mb-3">
                  <Bot className="w-5 h-5 text-[#2a14b4]/40" />
                </div>
                <p className="text-sm text-[#5c5378] font-medium mb-3">Geen aanpassingen</p>
                <div className="w-full rounded-xl bg-[#f8f9ff] border border-[#e8eeff] px-4 py-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#eff4ff] text-[#2a14b4] text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                    <p className="text-xs text-[#5c5378]/70 leading-5">
                      Klik op het <Bot className="w-3 h-3 inline -mt-0.5 text-[#2a14b4]/50" /> icoon bij een sectie om aan te geven wat de AI moet aanpassen
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#eff4ff] text-[#2a14b4] text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                    <p className="text-xs text-[#5c5378]/70 leading-5">
                      De AI past de les aan op basis van jouw instructies
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isGenerating && (
              <div className="border-t border-[#e8eeff] px-3.5 py-3">
                <button
                  type="button"
                  onClick={onProcessFeedback}
                  disabled={!hasFeedback || isProcessing}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#2a14b4] bg-[#eff4ff] hover:bg-[#e4ebff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isProcessing ? "Verwerken…" : "Feedback verwerken"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
