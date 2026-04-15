import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function action({ request, params }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const fileId = params.fileId

  const body = await request.json()
  const intent = body.intent

  if (intent === "confirm-upload") {
    const result = await api.confirmUpload(fileId)
    return data(result)
  }

  if (intent === "upload-failed") {
    await api.uploadFailed(fileId)
    return data(null, { status: 204 })
  }

  if (intent === "update-class-link") {
    const result = await api.updateFile(fileId, { class_id: body.class_id ?? null })
    return data(result)
  }

  return data({ error: "Unknown intent" }, { status: 400 })
}
