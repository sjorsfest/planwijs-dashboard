export { default } from "./page"

import type { LoaderFunctionArgs } from "react-router"
import { getAuthContext } from "~/lib/auth.server"

// ─── Loader ────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  await getAuthContext(request)
  return { events: [] as { id: string; name: string; description?: string | null; planned_date: string }[] }
}

// ─── Meta ──────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Rooster — Planwijs" }]
}
