import type { Book, Class, LesplanResponse } from "~/lib/backend/types"
import type { Method } from "~/components/new-plan/types"
import { SUBJECT_VALUES } from "~/lib/subject-metadata"
import type { SavedPlanState, SubmittedPlanPayload } from "./types"

export function normalizeSubjectCategory(category: string | null | undefined): string {
  const trimmed = category?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "Overig"
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export function parseSavedSubject(value: unknown): { id: string; slug: string; name: string; category: string; created_at?: string; updated_at?: string } | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.name !== "string" ||
    typeof value.category !== "string"
  ) {
    return null
  }

  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    category: value.category,
    created_at: typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
  }
}

export function parseSavedMethod(value: unknown): Method | null {
  if (!isRecord(value)) return null
  if (
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.subject !== "string" ||
    typeof value.url !== "string"
  ) {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    created_at: typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
    slug: value.slug,
    title: value.title,
    subject: value.subject as Method["subject"],
    url: value.url,
  }
}

export function parseSavedBook(value: unknown): Book | null {
  if (!isRecord(value)) return null
  if (
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.url !== "string"
  ) {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    created_at: typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
    book_id: typeof value.book_id === "number" ? value.book_id : null,
    slug: value.slug,
    title: value.title,
    subject_id: typeof value.subject_id === "string" ? value.subject_id : null,
    method_id: typeof value.method_id === "string" ? value.method_id : null,
    edition: typeof value.edition === "string" ? value.edition : null,
    school_years: Array.isArray(value.school_years) ? (value.school_years as Book["school_years"]) : [],
    levels: Array.isArray(value.levels) ? (value.levels as Book["levels"]) : [],
    cover_path: typeof value.cover_path === "string" ? value.cover_path : null,
    cover_url: typeof value.cover_url === "string" ? value.cover_url : null,
    url: value.url,
    subject_slug: typeof value.subject_slug === "string" ? value.subject_slug : null,
    subject_name: typeof value.subject_name === "string" ? value.subject_name : null,
    subject_category: typeof value.subject_category === "string" ? value.subject_category : null,
  }
}

export function loadPlanState(): SavedPlanState | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem("leslab_new_plan")
    if (!raw) return null

    const parsed = JSON.parse(raw) as Record<string, unknown>

    return {
      classSelectionMode: parsed.classSelectionMode === "create" ? "create" : "choose",
      selectedExistingClassId:
        typeof parsed.selectedExistingClassId === "string" && parsed.selectedExistingClassId.length > 0
          ? parsed.selectedExistingClassId
          : null,
      selectedClassroomId:
        typeof parsed.selectedClassroomId === "string" && parsed.selectedClassroomId.length > 0
          ? parsed.selectedClassroomId
          : null,
      className_: typeof parsed.className_ === "string" ? parsed.className_ : "",
      selectedLevel: typeof parsed.selectedLevel === "string" ? (parsed.selectedLevel as SavedPlanState["selectedLevel"]) : null,
      selectedYear: typeof parsed.selectedYear === "string" ? (parsed.selectedYear as SavedPlanState["selectedYear"]) : null,
      selectedCategory: typeof parsed.selectedCategory === "string" ? parsed.selectedCategory : null,
      selectedSubject: parseSavedSubject(parsed.selectedSubject),
      lessonCount: typeof parsed.lessonCount === "number" ? parsed.lessonCount : null,
      lessonDuration: typeof parsed.lessonDuration === "number" ? parsed.lessonDuration : null,
      classSize: typeof parsed.classSize === "number" ? parsed.classSize : null,
      classDifficulty: typeof parsed.classDifficulty === "string" ? (parsed.classDifficulty as SavedPlanState["classDifficulty"]) : null,
      classSetupConfirmed:
        parsed.classSetupConfirmed === true ||
        parsed.classDetailsConfirmed === true,
      curriculumConfirmed: parsed.curriculumConfirmed === true,
      selectedMethod: parseSavedMethod(parsed.selectedMethod),
      selectedBook: parseSavedBook(parsed.selectedBook),
      selectedParagraphIds: isStringArray(parsed.selectedParagraphIds) ? parsed.selectedParagraphIds : [],
      selectedFileIds: isStringArray(parsed.selectedFileIds) ? parsed.selectedFileIds : [],
      showSummary: parsed.showSummary === true,
    }
  } catch {
    return null
  }
}

export function parseSubmittedPayload(value: unknown): SubmittedPlanPayload | null {
  if (!isRecord(value)) return null

  const subject = parseSavedSubject(value.selectedSubject)
  if (!subject || !SUBJECT_VALUES.has(subject.name)) return null

  if (
    typeof value.selectedLevel !== "string" ||
    typeof value.selectedYear !== "string" ||
    typeof value.lessonCount !== "number" ||
    typeof value.lessonDuration !== "number" ||
    typeof value.classSize !== "number" ||
    typeof value.classDifficulty !== "string" ||
    typeof value.selectedBookId !== "string" ||
    !isStringArray(value.selectedParagraphIds) ||
    value.selectedParagraphIds.length === 0
  ) {
    return null
  }

  return {
    selectedExistingClassId:
      typeof value.selectedExistingClassId === "string" && value.selectedExistingClassId.length > 0
        ? value.selectedExistingClassId
        : null,
    selectedClassroomId:
      typeof value.selectedClassroomId === "string" && value.selectedClassroomId.length > 0
        ? value.selectedClassroomId
        : null,
    className_: typeof value.className_ === "string" ? value.className_ : "",
    selectedLevel: value.selectedLevel as SubmittedPlanPayload["selectedLevel"],
    selectedYear: value.selectedYear as SubmittedPlanPayload["selectedYear"],
    selectedSubject: subject,
    lessonCount: value.lessonCount,
    lessonDuration: value.lessonDuration,
    classSize: value.classSize,
    classDifficulty: value.classDifficulty as SubmittedPlanPayload["classDifficulty"],
    selectedBookId: value.selectedBookId,
    selectedParagraphIds: value.selectedParagraphIds,
    selectedFileIds: isStringArray(value.selectedFileIds) ? value.selectedFileIds : [],
  }
}

export function hasClassId(classroom: Class): classroom is Class & { id: string } {
  return typeof classroom.id === "string" && classroom.id.length > 0
}

export function getLatestLesplanByClassId(lespannen: LesplanResponse[]): Map<string, LesplanResponse> {
  const latest = new Map<string, LesplanResponse>()

  for (const lesplan of lespannen) {
    const current = latest.get(lesplan.class_id)
    if (!current) {
      latest.set(lesplan.class_id, lesplan)
      continue
    }

    const currentTs = new Date(current.updated_at).getTime()
    const nextTs = new Date(lesplan.updated_at).getTime()
    if (Number.isNaN(currentTs) || nextTs > currentTs) {
      latest.set(lesplan.class_id, lesplan)
    }
  }

  return latest
}
