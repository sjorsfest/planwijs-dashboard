export { default } from "./page"

import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import type { LessonPreparationTodoResponse } from "~/lib/backend/types"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"
import { compareTodoItems } from "./utils"

export type UserTodoListItem = {
  todo: LessonPreparationTodoResponse
  requestId: string
  lessonId: string
  lessonNumber: number
  lessonTitle: string
  lessonPlannedDate: string | null
  planTitle: string
}

export function meta() {
  return [{ title: "To Do's | Leslab" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const lespannen = await api.listLespannen()

  const todoItems = lespannen
    .flatMap((lesplan) => {
      const lessons = lesplan.overview?.lessons ?? []
      const planTitle = lesplan.overview?.title ?? "Lesplan in opbouw"

      return lessons.flatMap((lesson) =>
        lesson.preparation_todos.map((todo) => ({
          todo,
          requestId: lesplan.id,
          lessonId: lesson.id,
          lessonNumber: lesson.lesson_number,
          lessonTitle: lesson.title,
          lessonPlannedDate: lesson.planned_date,
          planTitle,
        }))
      )
    })
    .sort(compareTodoItems)

  return data({ todoItems }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "toggle-todo") {
    const todoId = formData.get("todoId") as string
    const status = formData.get("status") as "pending" | "done"

    try {
      const api = createApiClient(token)
      const updated = await api.updatePreparationTodo(todoId, { status })
      return data({ ok: true, todo: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Er ging iets mis"
      return data({ ok: false, error: message })
    }
  }

  return data({ ok: false, error: "Unknown intent" })
}
