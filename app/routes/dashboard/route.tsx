export { default } from "./page"

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { getEvents, createEvent, deleteEvent } from "~/lib/api"
import { getAuthContext } from "~/lib/auth.server"

// ─── Loader ────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getAuthContext(request)
  const events = await getEvents(auth?.token ?? null)
  return { events }
}

// ─── Action ────────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  const auth = await getAuthContext(request)
  const token = auth?.token ?? null
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "create") {
    const event = await createEvent(
      {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        planned_date: formData.get("planned_date") as string,
      },
      token
    )
    return { ok: !!event }
  }

  if (intent === "delete") {
    await deleteEvent(formData.get("id") as string, token)
    return { ok: true }
  }

  return { ok: false }
}

// ─── Meta ──────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Rooster — Planwijs" }]
}
