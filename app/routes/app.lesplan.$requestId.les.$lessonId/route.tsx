export { default } from "./page"

import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import { getSession, getActiveTask, setActiveTask, commitSession } from "~/lib/session.server"
import type { SourceContext } from "~/components/lesplan/types"
import type { Route } from "./+types/route"

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Les | Leslab" }]
  return [{ title: `Les ${loaderData.lesson.lesson_number}: ${loaderData.lesson.title} | Leslab` }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const session = await getSession(request.headers.get("Cookie"))
  const lesplan = await api.getLesplan(params.requestId)

  if (!lesplan) {
    throw new Response("Lesplan not found", { status: 404 })
  }

  const lesson = lesplan.overview?.lessons?.find((l) => l.id === params.lessonId)
  if (!lesson) {
    throw new Response("Les not found", { status: 404 })
  }

  const [classroom, bookDetail] = await Promise.all([
    api.getClass(lesplan.class_id),
    api.getBookDetail(lesplan.book_id),
  ])

  const method = bookDetail?.method_id ? await api.getMethod(bookDetail.method_id) : null
  const paragraphsById = new Map(
    (bookDetail?.chapters ?? []).flatMap((chapter) =>
      chapter.paragraphs.map((paragraph) => [
        paragraph.id,
        { id: paragraph.id, title: paragraph.title, synopsis: paragraph.synopsis, index: paragraph.index },
      ])
    )
  )

  const sourceContext: SourceContext = {
    bookTitle: bookDetail?.title,
    subjectName: bookDetail?.subject_name ?? undefined,
    methodTitle: method?.title,
    level: classroom?.level,
    schoolYear: classroom?.school_year,
    classSize: classroom?.size,
    difficulty: classroom?.difficulty ?? undefined,
    selectedParagraphs: lesplan.selected_paragraph_ids.map((id) => paragraphsById.get(id) ?? { id, title: id }),
  }

  const activeTask = getActiveTask(session, params.lessonId)

  return data(
    {
      requestId: params.requestId,
      lesson,
      sourceContext,
      lesplanStatus: lesplan.status,
      activeTask,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10",
        "Set-Cookie": await commitSession(session),
      },
    }
  )
}

export async function action({ request, params }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "toggle-todo") {
    const todoId = formData.get("todoId") as string
    const status = formData.get("status") as "pending" | "done"
    try {
      const updated = await api.updatePreparationTodo(todoId, { status })
      return data({ ok: true, todo: updated })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Er ging iets mis"
      return data({ ok: false, error: message })
    }
  }

  if (intent === "set-planned-date") {
    const lessonId = formData.get("lessonId") as string
    const rawDate = formData.get("plannedDate") as string | null
    const plannedDate = rawDate || null
    try {
      await api.updateLessonPlannedDate(lessonId, plannedDate)
      return data({ ok: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Er ging iets mis"
      return data({ ok: false, error: message })
    }
  }

  if (intent === "lesson-feedback") {
    const session = await getSession(request.headers.get("Cookie"))
    const lessonId = formData.get("lessonId") as string
    const itemsRaw = formData.get("items") as string
    try {
      const items = JSON.parse(itemsRaw) as {
        field_name: string
        specific_part: string
        user_feedback: string
      }[]
      const task = await api.submitLessonFeedback(lessonId, { items })
      setActiveTask(session, lessonId, task.task_id, "apply_lesson_feedback")
      return data(
        { intent: "lesson-feedback", ok: true, task },
        { headers: { "Set-Cookie": await commitSession(session) } }
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : "Er ging iets mis"
      return data({ ok: false, error: message })
    }
  }

  return data({ ok: false, error: "Unknown intent" })
}
