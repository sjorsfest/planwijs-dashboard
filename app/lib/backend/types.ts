import type { components } from "~/types/api.generated"

export type User = components["schemas"]["User"]
export type Method = components["schemas"]["Method"]
export type Class = components["schemas"]["Class"]
export type Chapter = components["schemas"]["ChapterResponse"]
export type Paragraph = components["schemas"]["ParagraphResponse"]
export type SchoolYear = components["schemas"]["SchoolYear"]
export type Level = components["schemas"]["Level"]
export type LesplanStatus = components["schemas"]["LesplanStatus"]
export type FeedbackMessageResponse = {
  id: string
  role: string
  content: string
  created_at: string
}
export type LessonPlanResponse = components["schemas"]["LessonPlanResponse"]
export type LessonPreparationTodoResponse = components["schemas"]["LessonPreparationTodoResponse"]
export type LessonPreparationStatus = components["schemas"]["LessonPreparationStatus"]
export type ClassSupportChallenge = components["schemas"]["ClassSupportChallenge"]
export type Classroom = components["schemas"]["Classroom"]
export type ClassroomCreate = components["schemas"]["ClassroomCreate"]
export type LesplanOverviewResponse = components["schemas"]["LesplanOverviewResponse"]
export type LesplanResponse = components["schemas"]["LesplanResponse"] & {
  feedback_messages: FeedbackMessageResponse[]
}
export type CreateLesplanRequest = components["schemas"]["CreateLesplanRequest"] & {
  classroom_id?: string | null
}
export type FeedbackItem = components["schemas"]["FeedbackItem"]
export type FeedbackRequest = components["schemas"]["FeedbackRequest"]
export type Subject = {
  id: string
  slug: string
  name: string
  category: string
  created_at?: string
  updated_at?: string
}

type BookOutput = components["schemas"]["Book-Output"]
type BookDetailOutput = components["schemas"]["BookDetailResponse"]

export type Book = Omit<BookOutput, "subject"> & {
  subject_id?: string | null
  subject_slug?: string | null
  subject_name?: string | null
  subject_category?: string | null
}

export type BookDetail = Omit<BookDetailOutput, "subject"> & {
  subject_id?: string | null
  subject_slug?: string | null
  subject_name?: string | null
  subject_category?: string | null
}

export type CalendarLessonItem = {
  type: "lesson"
  id: string
  title: string
  planned_date: string
  lesson_number: number
  learning_objectives: string[]
  lesplan_id: string
  lesplan_title: string
  created_at: string
}

export type CalendarTodoItem = {
  type: "preparation_todo"
  id: string
  title: string
  description: string | null
  due_date: string
  status: string
  lesson_id: string
  lesson_title: string
  lesplan_id: string
  lesplan_title: string
  created_at: string
}

export type CalendarItem = CalendarLessonItem | CalendarTodoItem

export type CalendarResponse = {
  start_date: string
  end_date: string
  items: CalendarItem[]
}

export type UpdateLessonPreparationTodoRequest = components["schemas"]["UpdateLessonPreparationTodoRequest"]

// ─── Task queue types ─────────────────────────────────────────────────────

export type TaskSubmittedResponse = {
  task_id: string
  resource_id: string
  task_type: "generate_overview" | "apply_feedback" | "generate_lessons"
  status: "queued"
}

export type TaskStep = {
  name: string
  status: "queued" | "completed" | "running"
  started_at: string | null
  completed_at: string | null
}

export type TaskStatusResponse = {
  task_id: string
  task_type: "generate_overview" | "apply_feedback" | "generate_lessons"
  resource_id: string
  status: "queued" | "running" | "completed" | "failed"
  current_step: string | null
  steps: TaskStep[]
  progress_pct: number
  error: string | null
  created_at: string
  updated_at: string
}
