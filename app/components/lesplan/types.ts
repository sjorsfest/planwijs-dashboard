import type { FeedbackMessageResponse, LesplanResponse, LesplanStatus, LessonPlanResponse } from "~/lib/api"

export type SourceContextParagraph = {
  id: string
  title: string
  synopsis?: string | null
  index?: number
}

export type SourceContext = {
  bookTitle?: string
  bookCoverUrl?: string
  methodTitle?: string
  subjectName?: string
  level?: string
  schoolYear?: string
  classSize?: number
  difficulty?: string | null
  selectedParagraphs?: SourceContextParagraph[]
}

export type LessonOutlineItem = {
  lesson_number: number
  subject_focus: string
  description: string
  teaching_approach_hint?: string
  builds_on: string
  concept_tags?: string[]
  lesson_intention?: string
  end_understanding?: string
  sequence_rationale?: string
  builds_on_lessons?: number[]
  paragraph_indices?: number[]
}

export type GoalCoverageItem = {
  goal: string
  lesson_numbers: number[]
  rationale?: string
}

export type KnowledgeCoverageItem = {
  knowledge: string
  lesson_numbers: number[]
  rationale?: string
}

export type LesplanOverviewState = {
  title?: string
  series_summary?: string
  series_themes?: string[]
  learning_goals?: string[]
  key_knowledge?: string[]
  recommended_approach?: string
  learning_progression?: string
  lesson_outline?: LessonOutlineItem[]
  goal_coverage?: GoalCoverageItem[]
  knowledge_coverage?: KnowledgeCoverageItem[]
  didactic_approach?: string
} | null

export type LesplanOverviewPartial = Partial<NonNullable<LesplanOverviewState>>

export type LesplanThreadMessage = {
  id: string
  role: "teacher" | "assistant"
  content: string
  createdAt: string
  pending?: boolean
}

export type LesplanDoneEvent = {
  status: LesplanStatus
  overview: {
    title?: string
    series_summary?: string
    series_themes?: string[]
    learning_goals?: string[]
    key_knowledge?: string[]
    recommended_approach?: string
    learning_progression?: string
    lesson_outline?: LessonOutlineItem[]
    goal_coverage?: GoalCoverageItem[]
    knowledge_coverage?: KnowledgeCoverageItem[]
    didactic_approach?: string
  }
  assistant_message?: string
}

export type LesplanWorkspaceLoaderData = {
  requestId: string
  updatedAt: string
  lesplan: LesplanResponse
  request: {
    userId: string
    classId: string
    bookId: string
    selectedParagraphIds: string[]
    numLessons: number
    lessonDurationMinutes: number
  }
  sourceContext: SourceContext
}

export type LesplanPageState = {
  requestId: string
  status: LesplanStatus
  request: LesplanWorkspaceLoaderData["request"]
  sourceContext: SourceContext
  overview: LesplanOverviewState
  feedbackMessages: LesplanThreadMessage[]
  lessons: LessonPlanResponse[]
  ui: {
    streamConnected: boolean
    streamMode: "overview" | "revision" | null
    sendingFeedback: boolean
    approving: boolean
    pollingLessons: boolean
    lastError?: string
  }
}

export function mapFeedbackMessages(messages: FeedbackMessageResponse[]): LesplanThreadMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role === "teacher" ? "teacher" : "assistant",
    content: message.content,
    createdAt: message.created_at,
  }))
}
