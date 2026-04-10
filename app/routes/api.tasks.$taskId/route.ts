import { createApiClient, ApiRequestError } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export async function loader({ request, params }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)

  try {
    const task = await api.getTaskStatus(params.taskId)
    return Response.json(task)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    return Response.json({ error: "Taakstatus kon niet worden opgehaald." }, { status: 500 })
  }
}
