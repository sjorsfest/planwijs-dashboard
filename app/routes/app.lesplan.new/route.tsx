export { default } from "./page"

import { data, redirect } from "react-router"
import { createApiClient, ApiRequestError } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import { getSession, commitSession, setActiveTask } from "~/lib/session.server"
import type { Method } from "~/components/new-plan/types"
import type { Route } from "./+types/route"
import type { ActionData, ExistingClassData, LoaderData } from "./types"
import { parseSubmittedPayload, hasClassId, getLatestLesplanByClassId } from "./utils"

export type { ActionData, ExistingClassData, LoaderData }

export function meta() {
  return [{ title: "Nieuw lesplan — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  const api = createApiClient(token)
  const [classes, lespannen, classrooms] = await Promise.all([
    api.getClasses(),
    api.listLespannen(),
    api.getClassrooms(),
  ])

  const latestByClassId = getLatestLesplanByClassId(lespannen)

  const existingClasses: ExistingClassData[] = classes
    .filter(hasClassId)
    .map((classroom) => {
      const latestLesplan = latestByClassId.get(classroom.id) ?? null

      return {
        id: classroom.id,
        name: classroom.name,
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

  return data<LoaderData>({ existingClasses, classrooms }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const session = await getSession(request.headers.get("Cookie"))
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
    const api = createApiClient(token)
    let classId = payload.selectedExistingClassId

    if (!classId) {
      const classroom = await api.createClass({
        name: payload.className_,
        subject: payload.selectedSubject.name as Method["subject"],
        level: payload.selectedLevel,
        school_year: payload.selectedYear,
        size: payload.classSize,
        difficulty: payload.classDifficulty,
      })

      if (!classroom.id) {
        return data<ActionData>({ error: "De klas kon niet worden opgeslagen." }, { status: 500 })
      }

      classId = classroom.id
    }

    const lesplan = await api.createLesplan({
      class_id: classId,
      book_id: payload.selectedBookId,
      selected_paragraph_ids: payload.selectedParagraphIds,
      num_lessons: payload.lessonCount,
      lesson_duration_minutes: payload.lessonDuration,
      classroom_id: payload.selectedClassroomId,
    })

    const task = await api.generateOverview(lesplan.id)
    setActiveTask(session, lesplan.id, task.task_id, task.task_type)
    return redirect(`/lesplan/${lesplan.id}`, {
      headers: { "Set-Cookie": await commitSession(session) },
    })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return data<ActionData>({ error: error.message }, { status: error.status })
    }

    return data<ActionData>({ error: "Het lesplan kon niet worden aangemaakt." }, { status: 500 })
  }
}
