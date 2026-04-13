import { useRef, useState, useEffect } from "react"
import { MessageSquarePlus, Send, X, MessageCircle, CheckCircle2, Sparkles, LoaderCircle, Minus, Check } from "lucide-react"
import type { TaskStep } from "~/lib/backend/types"
import { translateStep } from "./utils"
import { motion, AnimatePresence } from "framer-motion"

export type SectionFeedbackItem = {
  id: string
  sectionKey: string
  sectionLabel: string
  message: string
  createdAt: string
}

export function SectionFeedbackButton({
  sectionKey,
  sectionLabel,
  onSubmit,
  disabled,
}: {
  sectionKey: string
  sectionLabel: string
  onSubmit: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit({ sectionKey, sectionLabel, message: trimmed })
    setValue("")
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${disabled ? "text-[#5c5378]/20 cursor-not-allowed" : "text-[#5c5378]/50 hover:text-[#2a14b4] hover:bg-[#eff4ff]"}`}
        title={`Feedback geven op ${sectionLabel}`}
      >
        <MessageSquarePlus className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-30 w-72 bg-white rounded-xl shadow-[0px_12px_32px_rgba(11,28,48,0.12)] border border-[#e8eeff] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5378]/70">
                Feedback: {sectionLabel}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#5c5378]/40 hover:text-[#5c5378] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Wat kan er beter?"
              rows={3}
              className="w-full rounded-lg border border-[#e8eeff] bg-[#f8f9ff] px-3 py-2 text-sm text-[#464554] placeholder:text-[#5c5378]/40 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 focus:border-[#2a14b4]/30 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2a14b4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4338ca] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3 h-3" />
                Verstuur
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FEEDBACK_VISIBLE_STATUSES = new Set([
  "generating_overview",
  "overview_ready",
  "revising_overview",
  "generating_lessons",
])

export function FeedbackPanel({
  items,
  onRemove,
  onApprove,
  onProcessFeedback,
  canApprove,
  isApproving,
  isProcessing,
  status,
  activeTaskId,
  activeTaskType,
  taskProgress,
  taskCurrentStep,
  taskSteps,
}: {
  items: SectionFeedbackItem[]
  onRemove: (id: string) => void
  onApprove: () => void
  onProcessFeedback: () => void
  canApprove: boolean
  isApproving: boolean
  isProcessing: boolean
  status: string
  activeTaskId?: string | null
  activeTaskType?: string | null
  taskProgress?: number
  taskCurrentStep?: string | null
  taskSteps?: TaskStep[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const hasFeedback = items.length > 0
  const hasActiveTask = Boolean(activeTaskId)
  const isGenerating = hasActiveTask || status === "generating_overview" || status === "revising_overview" || status === "generating_lessons"

  if (!FEEDBACK_VISIBLE_STATUSES.has(status)) return null

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
              {isGenerating
                ? activeTaskType === "apply_feedback"
                  ? "Feedback verwerken…"
                  : activeTaskType === "generate_lessons"
                  ? "Lessen genereren…"
                  : "Overzicht genereren…"
                : "Jouw feedback"}
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
                {/* Progress bar */}
                {hasActiveTask && (taskProgress ?? 0) > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-[#5c5378]">
                        {translateStep(taskCurrentStep ?? null) ?? "Bezig..."}
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

                {/* Step list */}
                {taskSteps && taskSteps.length > 0 ? (
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
                  Zodra de verwerking klaar is, kun je feedback geven op de verschillende onderdelen.
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
                  <MessageSquarePlus className="w-5 h-5 text-[#2a14b4]/40" />
                </div>
                <p className="text-sm text-[#5c5378] font-medium mb-3">Nog geen feedback</p>
                <div className="w-full rounded-xl bg-[#f8f9ff] border border-[#e8eeff] px-4 py-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#eff4ff] text-[#2a14b4] text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                    <p className="text-xs text-[#5c5378]/70 leading-5">
                      Klik op het <MessageSquarePlus className="w-3 h-3 inline -mt-0.5 text-[#2a14b4]/50" /> icoon bij een sectie om feedback toe te voegen
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#eff4ff] text-[#2a14b4] text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                    <p className="text-xs text-[#5c5378]/70 leading-5">
                      AI verwerkt jouw opmerkingen tot een geüpdatete versie van het lesplan
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isGenerating && <div className="border-t border-[#e8eeff] px-3.5 py-3 flex gap-2">
              <button
                type="button"
                onClick={onProcessFeedback}
                disabled={!hasFeedback || isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#2a14b4] bg-[#eff4ff] hover:bg-[#e4ebff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isProcessing ? "Verwerken…" : "Feedback verwerken"}
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={!canApprove || isApproving || isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isApproving ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Lesplan goedkeuren
              </button>
            </div>}
          </>
        )}
      </div>
    </div>
  )
}
