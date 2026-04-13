import type React from "react"
import { BookOpen, ChevronRight, GraduationCap, Lightbulb } from "lucide-react"
import type { LesplanOverviewState } from "./types"
import { splitIntoParagraphs } from "./utils"
import { SectionLabel, SkeletonLines } from "./shared"
import { type SectionFeedbackItem, SectionFeedbackButton } from "./section-feedback"

export function TeacherNotesTab({
  overview,
  isStreaming,
  onSectionFeedback,
  loadingFields,
  feedbackDisabled,
}: {
  overview: LesplanOverviewState
  isStreaming: boolean
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  loadingFields: Set<string>
  feedbackDisabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <TeacherNotesSection
        title="Leerlijn"
        sectionKey="leerlijn"
        icon={BookOpen}
        content={loadingFields.has("learning_progression") ? undefined : overview?.learning_progression}
        isStreaming={isStreaming || loadingFields.has("learning_progression")}
        onSectionFeedback={onSectionFeedback}
        feedbackDisabled={feedbackDisabled}
        defaultOpen
      />
      <TeacherNotesSection
        title="Aanbevolen aanpak"
        sectionKey="aanbevolen-aanpak"
        icon={Lightbulb}
        content={loadingFields.has("recommended_approach") ? undefined : overview?.recommended_approach}
        isStreaming={isStreaming || loadingFields.has("recommended_approach")}
        onSectionFeedback={onSectionFeedback}
        feedbackDisabled={feedbackDisabled}
      />
      <TeacherNotesSection
        title="Didactische aanpak"
        sectionKey="didactische-aanpak"
        icon={GraduationCap}
        content={loadingFields.has("didactic_approach") ? undefined : overview?.didactic_approach}
        isStreaming={isStreaming || loadingFields.has("didactic_approach")}
        onSectionFeedback={onSectionFeedback}
        feedbackDisabled={feedbackDisabled}
      />
    </div>
  )
}

function TeacherNotesSection({
  title,
  sectionKey,
  icon: Icon,
  content,
  isStreaming,
  defaultOpen,
  onSectionFeedback,
  feedbackDisabled,
}: {
  title: string
  sectionKey: string
  icon: React.ComponentType<{ className?: string }>
  content?: string
  isStreaming: boolean
  defaultOpen?: boolean
  onSectionFeedback: (item: Omit<SectionFeedbackItem, "id" | "createdAt">) => void
  feedbackDisabled?: boolean
}) {
  const paragraphs = content ? splitIntoParagraphs(content, 2) : []

  return (
    <details
      open={defaultOpen}
      className="group bg-white rounded-2xl p-5 shadow-[0px_10px_24px_rgba(11,28,48,0.07)] border border-[#e8eeff]"
    >
      <summary
        className="list-none flex items-center justify-between gap-4 cursor-pointer"
        onKeyDown={(e) => {
          if (e.key === " ") e.preventDefault()
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eff4ff] text-[#2a14b4]">
            <Icon className="w-3.5 h-3.5" />
          </span>
          <SectionLabel>{title}</SectionLabel>
        </div>
        <div className="flex items-center gap-1.5">
          <span onClick={(e) => e.stopPropagation()}>
            <SectionFeedbackButton sectionKey={sectionKey} sectionLabel={title} onSubmit={onSectionFeedback} disabled={feedbackDisabled} />
          </span>
          <ChevronRight className="w-4 h-4 text-[#5c5378] transition-transform group-open:rotate-90" />
        </div>
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
