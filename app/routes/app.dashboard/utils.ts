import { addDays, format } from "date-fns"
import { nl } from "date-fns/locale"

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = addDays(today, 1)

  if (d.getTime() === today.getTime()) return "Vandaag"
  if (d.getTime() === tomorrow.getTime()) return "Morgen"
  return format(d, "EEEE d MMM", { locale: nl })
}
