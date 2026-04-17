export { default } from "./page"

import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export function meta() {
  return [{ title: "Klassenoverzicht | Leslab" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const [classes, classrooms, schoolConfig] = await Promise.all([api.getClasses(), api.getClassrooms(), api.getSchoolConfig()])
  const schoolLevels = schoolConfig?.levels ?? []
  return data({ classes, classrooms, schoolLevels }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("_action")

  if (intent === "create") {
    const body = JSON.parse(formData.get("body") as string)
    const fileIds: string[] = JSON.parse((formData.get("fileIds") as string) || "[]")
    const created = await api.createClass(body)
    if (fileIds.length > 0 && created.id) {
      await Promise.all(fileIds.map((fid) => api.updateFile(fid, { class_id: created.id! })))
    }
    return { ok: true }
  }

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

  if (intent === "createClassroom") {
    const body = JSON.parse(formData.get("body") as string)
    await api.createClassroom(body)
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
