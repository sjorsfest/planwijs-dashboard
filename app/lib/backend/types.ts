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
export type Classroom = components["schemas"]["Classroom"]
export type ClassroomCreate = components["schemas"]["ClassroomCreate"]
export type LesplanOverviewResponse = components["schemas"]["LesplanOverviewResponse"]
export type LesplanResponse = components["schemas"]["LesplanResponse"] & {
  feedback_messages: FeedbackMessageResponse[]
}
export type CreateLesplanRequest = components["schemas"]["CreateLesplanRequest"]
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

// ─── School config types ─────────────────────────────────────────────────

export type SchoolConfigResponse = components["schemas"]["SchoolConfigResponse"]
export type SchoolConfigUpdate = components["schemas"]["SchoolConfigUpdate"]
export type SchoolType = components["schemas"]["SchoolType"]

export const SCHOOL_TYPES: SchoolType[] = [
  "REGULIER",
  "MONTESSORI",
  "DALTON",
  "JENAPLAN",
  "VRIJE_SCHOOL",
  "TECHNASIUM",
  "TWEETALIG",
  "ANDERS",
]

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  REGULIER: "Regulier",
  MONTESSORI: "Montessori",
  DALTON: "Dalton",
  JENAPLAN: "Jenaplan",
  VRIJE_SCHOOL: "Vrije school",
  TECHNASIUM: "Technasium",
  TWEETALIG: "Tweetalig",
  ANDERS: "Anders",
}

// ─── User subject types ──────────────────────────────────────────────────

export type UserSubject = Subject

// ─── File types ───────────────────────────────────────────────────────────

export type FileUploadUrlRequest = {
  filename: string
  content_type: string
  size_bytes: number
  folder_id?: string
  lesplan_request_id?: string
  class_id?: string
}

export type FileUploadUrlResponse = {
  file_id: string
  upload_url: string
  upload_method: string
  upload_headers: Record<string, string>
  object_key: string
}

export type FileRecord = {
  id: string
  name: string
  content_type: string
  size_bytes: number
  bucket: string
  folder_id: string | null
  lesplan_request_id: string | null
  class_id: string | null
  status: "PENDING" | "UPLOADED" | "FAILED"
  created_at: string
  url: string
}

export type Folder = {
  id: string
  name: string
  parent_id: string | null
  created_at: string
  updated_at: string
  children: Folder[]
  files: FileRecord[]
}

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
