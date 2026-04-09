export { default } from "./page"

import { data } from "react-router"
import { getClasses, updateClass, deleteClass } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export function meta() {
  return [{ title: "Klassenoverzicht — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const classes = await getClasses(token)
  return data({ classes }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const intent = formData.get("_action")

  if (intent === "update") {
    const classId = formData.get("classId") as string
    const body = JSON.parse(formData.get("body") as string)
    await updateClass(classId, body, token)
    return { ok: true }
  }

  if (intent === "delete") {
    const classId = formData.get("classId") as string
    await deleteClass(classId, token)
    return { ok: true }
  }

  return { ok: false }
}
