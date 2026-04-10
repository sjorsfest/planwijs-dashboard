import { format, getDay, startOfMonth } from "date-fns"
import type { CalendarItem } from "~/lib/backend/types"

export function getPaddingDays(date: Date): number {
  const day = getDay(startOfMonth(date))
  return day === 0 ? 6 : day - 1
}

export function toDateString(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

export function getItemDate(item: CalendarItem): string {
  return item.type === "lesson" ? item.planned_date : item.due_date
}
