export { default } from "./page"

import { data } from "react-router"
import { format, addDays } from "date-fns"
import { createApiClient } from "~/lib/backend/client"
import type { CalendarLessonItem, CalendarTodoItem } from "~/lib/backend/types"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export function meta() {
  return [{ title: "Dashboard — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  const now = new Date()
  const startDate = format(now, "yyyy-MM-dd")
  const endDate = format(addDays(now, 14), "yyyy-MM-dd")

  const api = createApiClient(token)
  const [lespannen, calendar, classes] = await Promise.all([
    api.listLespannen(),
    api.getCalendarItems(startDate, endDate),
    api.getClasses(),
  ])

  // Extract all todos from lesson plans
  const allTodos = lespannen.flatMap((lp) =>
    (lp.overview?.lessons ?? []).flatMap((lesson) =>
      lesson.preparation_todos.map((todo) => ({
        ...todo,
        lessonTitle: lesson.title,
        lessonNumber: lesson.lesson_number,
        lesplanId: lp.id,
        lessonId: lesson.id,
      }))
    )
  )
  const pendingTodos = allTodos.filter((t) => t.status === "pending")
  const doneTodos = allTodos.filter((t) => t.status === "done")

  // Upcoming lessons (next 14 days)
  const upcomingLessons = calendar.items
    .filter((i): i is CalendarLessonItem => i.type === "lesson")
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date))
    .slice(0, 5)

  // Upcoming todos from calendar
  const upcomingTodos = calendar.items
    .filter((i): i is CalendarTodoItem => i.type === "preparation_todo" && i.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3)

  // Plan stats
  const activePlans = lespannen.filter((lp) => lp.status !== "completed" && lp.status !== "failed")
  const completedPlans = lespannen.filter((lp) => lp.status === "completed")

  return data({
    totalPlans: lespannen.length,
    activePlans: activePlans.length,
    completedPlans: completedPlans.length,
    pendingTodoCount: pendingTodos.length,
    doneTodoCount: doneTodos.length,
    totalTodoCount: allTodos.length,
    classCount: classes.length,
    upcomingLessons,
    upcomingTodos,
    recentPlans: lespannen
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 3),
  }, { headers: { "Cache-Control": "private, max-age=10" } })
}
