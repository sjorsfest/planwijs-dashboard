export { default } from "./page"

import type { LoaderFunctionArgs } from "react-router"
import { requireAuthContext } from "~/lib/auth.server"

// ─── Loader ────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuthContext(request)
  return { events: [] as { id: string; name: string; description?: string | null; planned_date: string }[] }
}

// ─── Meta ──────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Rooster | Leslab" }]
}
