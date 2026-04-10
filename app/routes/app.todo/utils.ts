import type { UserTodoListItem } from "./route"

export function compareTodoItems(a: UserTodoListItem, b: UserTodoListItem): number {
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

export function getStatusRank(status: string): number {
  if (status === "pending") return 0
  if (status === "done") return 1
  return 2
}

export function compareNullableDate(a: string | null, b: string | null): number {
  if (a && b) return a.localeCompare(b)
  if (a) return -1
  if (b) return 1
  return 0
}
