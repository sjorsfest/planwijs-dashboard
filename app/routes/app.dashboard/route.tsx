export { default } from "./page"

import { data, redirect } from "react-router"
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

  // Build class name lookup
  const classMap = new Map(classes.map((c) => [c.id, c.name]))

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
    .map((lesson) => {
      const lp = lespannen.find((p) => p.id === lesson.lesplan_id)
      return { ...lesson, className: lp ? classMap.get(lp.class_id) ?? null : null }
    })

  // Upcoming todos from calendar
  const upcomingTodos = calendar.items
    .filter((i): i is CalendarTodoItem => i.type === "preparation_todo" && i.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3)

  // Unplanned lessons (no date assigned yet)
  const unplannedLessons = lespannen
    .filter((lp) => lp.status === "completed")
    .flatMap((lp) =>
      (lp.overview?.lessons ?? [])
        .filter((lesson) => !lesson.planned_date)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          lesson_number: lesson.lesson_number,
          lesplan_id: lp.id,
          lesplan_title: lp.overview?.title ?? "Lesplan",
          className: classMap.get(lp.class_id) ?? null,
        }))
    )
    .sort((a, b) => a.lesson_number - b.lesson_number)

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
    unplannedLessons,
  }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const lessonId = formData.get("lessonId") as string
  const plannedDate = formData.get("plannedDate") as string

  if (!lessonId || !plannedDate) {
    return data({ error: "Ongeldige invoer" }, { status: 400 })
  }

  const api = createApiClient(token)
  await api.updateLessonPlannedDate(lessonId, plannedDate)

  return redirect("/dashboard")
}
