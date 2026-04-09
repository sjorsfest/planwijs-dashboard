export { default } from "./page"

import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
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
  const api = createApiClient(token)
  const [classes, classrooms] = await Promise.all([api.getClasses(), api.getClassrooms()])
  return data({ classes, classrooms }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("_action")

  if (intent === "update") {
    const classId = formData.get("classId") as string
    const body = JSON.parse(formData.get("body") as string)
    await api.updateClass(classId, body)
    return { ok: true }
  }

  if (intent === "delete") {
    const classId = formData.get("classId") as string
    await api.deleteClass(classId)
    return { ok: true }
  }

  if (intent === "updateClassroom") {
    const classroomId = formData.get("classroomId") as string
    const body = JSON.parse(formData.get("body") as string)
    await api.updateClassroom(classroomId, body)
    return { ok: true }
  }

  if (intent === "deleteClassroom") {
    const classroomId = formData.get("classroomId") as string
    await api.deleteClassroom(classroomId)
    return { ok: true }
  }

  return { ok: false }
}
