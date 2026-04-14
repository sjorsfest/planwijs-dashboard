import { useState } from "react"
import { Link } from "react-router"
import { ChevronRight, LoaderCircle } from "lucide-react"
import type { LessonOutlineItem, LesplanOverviewState, LesplanPageState } from "./types"
import { deriveLessonTags, splitSentences, summarizeBuildsOn, truncateText } from "./utils"
import { SkeletonLessonCards } from "./shared"
import { type SectionFeedbackItem, SectionFeedbackButton } from "./section-feedback"

export function LessonSequenceTab({
  overview,
  lessons,
  requestId,
  expectedLessonCount,
  isStreaming,
  completedSteps,
  isGeneratingLessons,
  onSectionFeedback,
  loadingFields,
  feedbackDisabled,
}: {
  overview: LesplanOverviewState
  lessons: LesplanPageState["lessons"]
  requestId: string
  expectedLessonCount: number
  isStreaming: boolean
  completedSteps: Set<string>
  isGeneratingLessons: boolean
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  loadingFields: Set<string>
  feedbackDisabled?: boolean
}) {
  const [expandedLessons, setExpandedLessons] = useState<number[]>([])
  const items = overview?.lesson_outline ?? []
  const keyKnowledge = overview?.key_knowledge ?? []
  const noActiveTask = completedSteps.size === 0 && !isStreaming
  const sequenceReady = noActiveTask || completedSteps.has("Generating sequence")
  const showLessonOutline = !loadingFields.has("lesson_outline") && sequenceReady && items.length >= expectedLessonCount

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
              onSectionFeedback={onSectionFeedback}
              feedbackDisabled={feedbackDisabled}
            />
          ))}
        </div>
      ) : (
        <SkeletonLessonCards streaming={isStreaming || loadingFields.has("lesson_outline")} />
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
  onSectionFeedback,
  feedbackDisabled,
}: {
  item: LessonOutlineItem
  index: number
  total: number
  requestId: string
  linkedLesson?: { id: string; lesson_number: number }
  tags: string[]
  expanded: boolean
  onToggle: () => void
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  feedbackDisabled?: boolean
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
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  linkedLesson ? "bg-emerald-50 text-emerald-700" : "bg-[#eff4ff] text-[#5c5378]"
                }`}
              >
                {linkedLesson ? "Uitgewerkt" : "Voorstel"}
              </span>
              <SectionFeedbackButton
                sectionKey={`les-${item.lesson_number}`}
                sectionLabel={`Les ${item.lesson_number}: ${item.subject_focus}`}
                onSubmit={onSectionFeedback}
                disabled={feedbackDisabled}
              />
            </div>
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
                prefetch="intent"
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
