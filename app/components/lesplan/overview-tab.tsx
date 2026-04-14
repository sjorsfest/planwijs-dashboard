import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import type { LesplanOverviewState, LesplanPageState, SourceContext } from "./types"
import { buildSeriesSummary } from "./utils"
import { SectionLabel, SeriesSummaryMarkdown, SkeletonLines, SkeletonTags } from "./shared"
import { type SectionFeedbackItem, SectionFeedbackButton } from "./section-feedback"

export function OverviewTab({
  overview,
  request,
  sourceContext,
  isStreaming,
  completedSteps,
  reviewStatusLabel,
  onSectionFeedback,
  loadingFields,
  feedbackDisabled,
}: {
  overview: LesplanOverviewState
  request: LesplanPageState["request"]
  sourceContext: SourceContext
  isStreaming: boolean
  completedSteps: Set<string>
  reviewStatusLabel: string
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  loadingFields: Set<string>
  feedbackDisabled?: boolean
}) {
  const [showAllKnowledge, setShowAllKnowledge] = useState(false)
  const goals = (overview?.learning_goals ?? []).filter((goal) => goal.trim().length > 0)
  const keyKnowledge = (overview?.key_knowledge ?? []).filter((entry) => entry.trim().length > 0)
  const visibleKnowledge = showAllKnowledge ? keyKnowledge : keyKnowledge.slice(0, 5)
  const hiddenKnowledgeCount = Math.max(keyKnowledge.length - 5, 0)
  const summary = buildSeriesSummary(overview, request.numLessons)
  // Show sections only when their generating step has completed (or no task is active)
  const noActiveTask = completedSteps.size === 0 && !isStreaming
  const goalsReady = noActiveTask || completedSteps.has("Generating learning goals")
  const sequenceReady = noActiveTask || completedSteps.has("Generating sequence")
  const showGoals = !loadingFields.has("learning_goals") && goalsReady && goals.length > 0
  const showKeyKnowledge = !loadingFields.has("key_knowledge") && sequenceReady && keyKnowledge.length > 0
  const showSummary = !loadingFields.has("series_summary")

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Seriesamenvatting</SectionLabel>
          <SectionFeedbackButton sectionKey="seriesamenvatting" sectionLabel="Seriesamenvatting" onSubmit={onSectionFeedback} disabled={feedbackDisabled} />
        </div>
        {overview && showSummary ? (
          <SeriesSummaryMarkdown value={summary.summary} />
        ) : (
          <SkeletonLines streaming={isStreaming || loadingFields.has("series_summary")} lines={4} />
        )}
      </section>

      <div className="space-y-5">
        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <SectionLabel>Leerdoelen</SectionLabel>
            <SectionFeedbackButton sectionKey="leerdoelen" sectionLabel="Leerdoelen" onSubmit={onSectionFeedback} disabled={feedbackDisabled} />
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
            <SkeletonLines streaming={isStreaming || loadingFields.has("learning_goals")} lines={4} />
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <SectionLabel>Kernkennis</SectionLabel>
            <div className="flex items-center gap-2">
              {hiddenKnowledgeCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllKnowledge((current) => !current)}
                  className="text-xs font-semibold text-[#2a14b4] hover:text-[#4338ca]"
                >
                  {showAllKnowledge ? "Toon minder" : `Toon ${hiddenKnowledgeCount} meer`}
                </button>
              )}
              <SectionFeedbackButton sectionKey="kernkennis" sectionLabel="Kernkennis" onSubmit={onSectionFeedback} disabled={feedbackDisabled} />
            </div>
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
            <SkeletonTags streaming={isStreaming || loadingFields.has("key_knowledge")} />
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
