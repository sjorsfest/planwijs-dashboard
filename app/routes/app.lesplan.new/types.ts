import type { Subject } from "~/lib/backend/types"
import type {
  ClassDifficulty,
  Level,
  Method,
  SchoolYear,
} from "~/components/new-plan/types"
import type { Book } from "~/lib/backend/types"
import type { ExistingClassOption } from "~/components/new-plan/step1-class-setup"

export type SavedPlanState = {
  classSelectionMode: "choose" | "create"
  selectedExistingClassId: string | null
  selectedClassroomId: string | null
  className_: string
  selectedLevel: Level | null
  selectedYear: SchoolYear | null
  selectedCategory: string | null
  selectedSubject: Subject | null
  lessonCount: number | null
  lessonDuration: number | null
  classSize: number | null
  classDifficulty: ClassDifficulty | null
  classSetupConfirmed: boolean
  curriculumConfirmed: boolean
  selectedMethod: Method | null
  selectedBook: Book | null
  selectedParagraphIds: string[]
  showSummary: boolean
}

export type ActionData = {
  error?: string
}

export type ExistingClassData = ExistingClassOption & {
  latestLesplanBookId: string | null
  latestLesplanLessonDuration: number | null
  latestLesplanNumLessons: number | null
}

export type LoaderData = {
  existingClasses: ExistingClassData[]
  classrooms: import("~/lib/backend/types").Classroom[]
}

export type SubmittedPlanPayload = {
  selectedExistingClassId: string | null
  selectedClassroomId: string | null
  className_: string
  selectedLevel: Level
  selectedYear: SchoolYear
  selectedSubject: { id: string; slug: string; name: string; category: string; created_at?: string; updated_at?: string }
  lessonCount: number
  lessonDuration: number
  classSize: number
  classDifficulty: ClassDifficulty
  selectedBookId: string
  selectedParagraphIds: string[]
}
