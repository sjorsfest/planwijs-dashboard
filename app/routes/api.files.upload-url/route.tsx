import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)

  const body = await request.json()
  const result = await api.requestUploadUrl({
    filename: body.filename,
    content_type: body.content_type,
    size_bytes: body.size_bytes,
    folder_id: body.folder_id,
    lesplan_request_id: body.lesplan_request_id,
  })

  return data(result, { status: 201 })
}
