import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const files = await api.listFiles({ classId: params.classId })
  return data(files, { headers: { "Cache-Control": "private, max-age=5" } })
}
