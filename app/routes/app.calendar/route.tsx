export { default } from "./page"

import { data } from "react-router"
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

// ─── Loader ────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  // Fetch a wide range: 3 months back to 3 months forward
  const now = new Date()
  const rangeStart = format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd")
  const rangeEnd = format(endOfMonth(addMonths(now, 3)), "yyyy-MM-dd")

  const api = createApiClient(token)
  const calendar = await api.getCalendarItems(rangeStart, rangeEnd)

  return data({ calendarItems: calendar.items }, { headers: { "Cache-Control": "private, max-age=10" } })
}

// ─── Meta ──────────────────────────────────────────────────────────────────

export function meta(_: Route.MetaArgs) {
  return [{ title: "Kalender | Leslab" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}
