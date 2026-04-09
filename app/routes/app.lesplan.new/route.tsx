export { default } from "./page"

import { data, redirect } from "react-router"
import {
  createClass,
  createLesplan,
  getClasses,
  listLespannen,
  ApiRequestError,
  type Class,
  type LesplanResponse,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { SUBJECT_VALUES } from "~/lib/subject-metadata"
import { type ExistingClassOption } from "~/components/new-plan/step1-class-setup"
import {
  type ClassDifficulty,
  type Level,
  type Method,
  type SchoolYear,
} from "~/components/new-plan/types"
import type { Route } from "./+types/route"

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
}

type SubmittedPlanPayload = {
  selectedExistingClassId: string | null
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function parseSavedSubject(value: unknown): SubmittedPlanPayload["selectedSubject"] | null {
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

function parseSubmittedPayload(value: unknown): SubmittedPlanPayload | null {
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
    selectedLevel: value.selectedLevel as Level,
    selectedYear: value.selectedYear as SchoolYear,
    selectedSubject: subject,
    lessonCount: value.lessonCount,
    lessonDuration: value.lessonDuration,
    classSize: value.classSize,
    classDifficulty: value.classDifficulty as ClassDifficulty,
    selectedBookId: value.selectedBookId,
    selectedParagraphIds: value.selectedParagraphIds,
  }
}

export function meta() {
  return [{ title: "Nieuw lesplan — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

function hasClassId(classroom: Class): classroom is Class & { id: string } {
  return typeof classroom.id === "string" && classroom.id.length > 0
}

function getLatestLesplanByClassId(lespannen: LesplanResponse[]): Map<string, LesplanResponse> {
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

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  const [classes, lespannen] = await Promise.all([
    getClasses(token),
    listLespannen(token),
  ])

  const latestByClassId = getLatestLesplanByClassId(lespannen)

  const existingClasses: ExistingClassData[] = classes
    .filter(hasClassId)
    .map((classroom) => {
      const latestLesplan = latestByClassId.get(classroom.id) ?? null

      return {
        id: classroom.id,
        subject: classroom.subject,
        level: classroom.level,
        schoolYear: classroom.school_year,
        size: classroom.size,
        difficulty: classroom.difficulty ?? null,
        latestLesplanUpdatedAt: latestLesplan?.updated_at ?? null,
        latestLesplanBookId: latestLesplan?.book_id ?? null,
        latestLesplanLessonDuration: latestLesplan?.lesson_duration_minutes ?? null,
        latestLesplanNumLessons: latestLesplan?.num_lessons ?? null,
      }
    })
    .sort((a, b) => {
      const left = a.latestLesplanUpdatedAt ? new Date(a.latestLesplanUpdatedAt).getTime() : 0
      const right = b.latestLesplanUpdatedAt ? new Date(b.latestLesplanUpdatedAt).getTime() : 0
      if (right !== left) return right - left
      return a.subject.localeCompare(b.subject, "nl")
    })

  return data<LoaderData>({ existingClasses }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const rawPayload = formData.get("payload")

  if (typeof rawPayload !== "string") {
    return data<ActionData>({ error: "De lesplan-aanvraag is onvolledig." }, { status: 400 })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawPayload)
  } catch {
    return data<ActionData>({ error: "De lesplan-aanvraag kon niet worden gelezen." }, { status: 400 })
  }

  const payload = parseSubmittedPayload(parsedJson)
  if (!payload) {
    return data<ActionData>({ error: "Niet alle verplichte velden zijn ingevuld." }, { status: 400 })
  }

  try {
    let classId = payload.selectedExistingClassId

    if (!classId) {
      const classroom = await createClass(
        {
          subject: payload.selectedSubject.name as Method["subject"],
          level: payload.selectedLevel,
          school_year: payload.selectedYear,
          size: payload.classSize,
          difficulty: payload.classDifficulty,
        },
        token
      )

      if (!classroom.id) {
        return data<ActionData>({ error: "De klas kon niet worden opgeslagen." }, { status: 500 })
      }

      classId = classroom.id
    }

    const lesplan = await createLesplan(
      {
        class_id: classId,
        book_id: payload.selectedBookId,
        selected_paragraph_ids: payload.selectedParagraphIds,
        num_lessons: payload.lessonCount,
        lesson_duration_minutes: payload.lessonDuration,
      },
      token
    )

    return redirect(`/lesplan/${lesplan.id}`)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return data<ActionData>({ error: error.message }, { status: error.status })
    }

    return data<ActionData>({ error: "Het lesplan kon niet worden aangemaakt." }, { status: 500 })
  }
}
