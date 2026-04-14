export { default } from "./page"

import { data } from "react-router"
import { createApiClient, ApiRequestError } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import { getSession, commitSession, getActiveTask, setActiveTask, clearActiveTask } from "~/lib/session.server"
import type { LesplanWorkspaceLoaderData } from "~/components/lesplan/types"
import {
  type ActionData,
  buildSourceContext,
} from "~/components/lesplan/reducer"
import type { Route } from "./+types/route"

export type { ActionData }

export function meta() {
  return [{ title: "Lesplan werkruimte | Leslab" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

const TERMINAL_STATUSES = new Set(["overview_ready", "completed", "failed"])

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const session = await getSession(request.headers.get("Cookie"))
  const api = createApiClient(token)
  const lesplan = await api.getLesplan(params.requestId)

  if (!lesplan) {
    throw new Response("Lesplan not found", { status: 404 })
  }

  // Read active task from session; auto-clear if lesplan reached a terminal state
  let activeTask = getActiveTask(session, params.requestId)
  let sessionDirty = false

  if (activeTask && TERMINAL_STATUSES.has(lesplan.status)) {
    clearActiveTask(session, params.requestId)
    activeTask = null
    sessionDirty = true
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

  const sourceContext = buildSourceContext(lesplan, {
    bookTitle: bookDetail?.title,
    bookCoverUrl: bookDetail?.cover_url ?? undefined,
    subjectName: bookDetail?.subject_name ?? undefined,
    methodTitle: method?.title,
    level: classroom?.level,
    schoolYear: classroom?.school_year,
    classSize: classroom?.size,
    difficulty: classroom?.difficulty ?? undefined,
    selectedParagraphs: lesplan.selected_paragraph_ids.map((id) => paragraphsById.get(id) ?? { id, title: id }),
  })

  const cacheControl = TERMINAL_STATUSES.has(lesplan.status)
    ? "private, max-age=10"
    : "private, no-cache"
  const headers: Record<string, string> = { "Cache-Control": cacheControl }
  if (sessionDirty) {
    headers["Set-Cookie"] = await commitSession(session)
  }

  return data({
    requestId: lesplan.id,
    updatedAt: lesplan.updated_at,
    lesplan,
    request: {
      userId: lesplan.user_id,
      classId: lesplan.class_id,
      bookId: lesplan.book_id,
      selectedParagraphIds: lesplan.selected_paragraph_ids,
      numLessons: lesplan.num_lessons,
      lessonDurationMinutes: lesplan.lesson_duration_minutes,
    },
    sourceContext,
    activeTask,
  } satisfies LesplanWorkspaceLoaderData, { headers })
}

export async function action({ request, params }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const session = await getSession(request.headers.get("Cookie"))
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "feedback") {
    const itemsRaw = formData.get("items")
    if (typeof itemsRaw !== "string") {
      return data<ActionData>({ intent: "feedback", ok: false, error: "Voer eerst feedback in." }, { status: 400 })
    }
    try {
      const items = JSON.parse(itemsRaw) as { field_name: string; specific_part: string; user_feedback: string }[]
      if (!Array.isArray(items) || items.length === 0) {
        return data<ActionData>({ intent: "feedback", ok: false, error: "Voer eerst feedback in." }, { status: 400 })
      }
      const task = await api.submitFeedback(params.requestId, { items })
      setActiveTask(session, params.requestId, task.task_id, task.task_type)
      return data<ActionData>({ intent: "feedback", ok: true, task }, {
        headers: { "Set-Cookie": await commitSession(session) },
      })
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return data<ActionData>({ intent: "feedback", ok: false, error: error.message }, { status: error.status })
      }
      return data<ActionData>({ intent: "feedback", ok: false, error: "De feedback kon niet worden verstuurd." }, { status: 500 })
    }
  }

  if (intent === "approve") {
    try {
      const task = await api.approveLesplan(params.requestId)
      setActiveTask(session, params.requestId, task.task_id, task.task_type)
      return data<ActionData>({ intent: "approve", ok: true, task }, {
        headers: { "Set-Cookie": await commitSession(session) },
      })
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return data<ActionData>({ intent: "approve", ok: false, error: error.message }, { status: error.status })
      }
      return data<ActionData>({ intent: "approve", ok: false, error: "Het overzicht kon niet worden goedgekeurd." }, { status: 500 })
    }
  }

  return data<ActionData>({ intent: "feedback", ok: false, error: "Onbekende actie." }, { status: 400 })
}
