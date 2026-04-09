export { default } from "./page"

import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import type { LessonPreparationTodoResponse } from "~/lib/backend/types"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

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
  return [{ title: "To Do's — Planwijs" }]
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

function compareTodoItems(a: UserTodoListItem, b: UserTodoListItem): number {
  const statusComparison = getStatusRank(a.todo.status) - getStatusRank(b.todo.status)
  if (statusComparison !== 0) return statusComparison

  const dueDateComparison = compareNullableDate(a.todo.due_date, b.todo.due_date)
  if (dueDateComparison !== 0) return dueDateComparison

  const plannedDateComparison = compareNullableDate(a.lessonPlannedDate, b.lessonPlannedDate)
  if (plannedDateComparison !== 0) return plannedDateComparison

  const lessonNumberComparison = a.lessonNumber - b.lessonNumber
  if (lessonNumberComparison !== 0) return lessonNumberComparison

  return a.todo.created_at.localeCompare(b.todo.created_at)
}

function getStatusRank(status: string): number {
  if (status === "pending") return 0
  if (status === "done") return 1
  return 2
}

function compareNullableDate(a: string | null, b: string | null): number {
  if (a && b) return a.localeCompare(b)
  if (a) return -1
  if (b) return 1
  return 0
}
